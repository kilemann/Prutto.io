// Tester for kjernelogikken i Prutt-O-Teket.
// Kjør: node --test tests/*.test.mjs
// Kjernen ligger i <script id="prutt-core"> i HTML-filen, så appen forblir én fil.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const match = html.match(/<script id="prutt-core">([\s\S]*?)<\/script>/);
if (!match) throw new Error('Fant ikke <script id="prutt-core"> i index.html');
const sandbox = vm.createContext({});
vm.runInContext(match[1], sandbox);
const C = sandbox.PruttCore;
const plain = (x) => JSON.parse(JSON.stringify(x));
const near = (a, b, tol) => Math.abs(a - b) <= tol;

test('versjon er semver og øverst i changelog', () => {
  assert.match(C.VERSION, /^\d+\.\d+\.\d+$/);
  assert.equal(C.CHANGELOG[0].version, C.VERSION);
  assert.ok(C.CHANGELOG[0].changes.length > 0);
});

test('normalizeParams fyller inn standardverdier og klemmer verdier', () => {
  const p = C.normalizeParams({ pitch: 9999, duration: -1, wetness: 2 });
  assert.equal(p.pitch, 500);
  assert.equal(p.duration, 0.1);
  assert.equal(p.wetness, 1);
  for (const k of ['pitchEnd', 'flutter', 'rasp', 'air', 'squeak', 'volume']) {
    assert.equal(typeof p[k], 'number', k);
  }
  assert.equal(C.normalizeParams({ pitch: 'abc' }).pitch, C.DEFAULTS.pitch);
  assert.equal(C.normalizeParams(null).pitch, C.DEFAULTS.pitch);
});

test('forhåndsvalg: minst 8, unike id-er, gyldige parametre uten klemming', () => {
  assert.ok(C.PRESETS.length >= 8);
  assert.equal(new Set(C.PRESETS.map((p) => p.id)).size, C.PRESETS.length);
  for (const pr of C.PRESETS) {
    assert.ok(pr.title && pr.icon && pr.desc && pr.name, pr.id);
    assert.equal(pr.colors.length, 2, pr.id);
    const n = C.normalizeParams(pr.params);
    for (const [k, v] of Object.entries(pr.params)) assert.equal(n[k], v, `${pr.id}.${k} utenfor gyldig område`);
  }
});

test('tonehøydekurve går fra start til slutt og holder seg over 20 Hz', () => {
  const p = C.normalizeParams({ pitch: 200, pitchEnd: 60, duration: 1 });
  const c = Array.from(C.buildPitchCurve(p, 100, C.mulberry32(1)));
  assert.equal(c.length, 100);
  assert.ok(near(c[0], 200, 0.5));
  assert.ok(near(c.at(-1), 60, 0.5));
  assert.ok(c.every((v) => Number.isFinite(v) && v >= 20));
});

test('amplitudekonvolutt er gyldig, starter og slutter stille', () => {
  const p = C.normalizeParams({ duration: 1, flutter: 15 });
  const e = Array.from(C.buildAmpEnvelope(p, 200, C.mulberry32(7)));
  assert.equal(e.length, 200);
  assert.ok(e.every((v) => v >= 0 && v <= 1));
  assert.ok(e[0] < 0.2);
  assert.ok(e.at(-1) < 0.05);
  assert.ok(Math.max(...e) > 0.5);
});

test('mer flutter gir flere gasspulser', () => {
  const pulses = (flutter) => {
    const e = Array.from(C.buildAmpEnvelope({ duration: 1, flutter, wetness: 0, air: 0 }, 400, C.mulberry32(3)));
    const th = Math.max(...e) * 0.5;
    let n = 0;
    for (let i = 1; i < e.length; i++) if (e[i - 1] < th && e[i] >= th) n++;
    return n;
  };
  assert.ok(pulses(30) > pulses(5) * 2, `${pulses(30)} vs ${pulses(5)}`);
});

test('mulberry32 er deterministisk og i [0,1)', () => {
  const a = C.mulberry32(42), b = C.mulberry32(42);
  for (let i = 0; i < 50; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
});

test('statistikk følger lyden: høyere volum og dypere tone gir flere dB', () => {
  const base = C.computeStats({ volume: 0.5, pitch: 200 });
  assert.ok(C.computeStats({ volume: 1, pitch: 200 }).db > base.db);
  assert.ok(C.computeStats({ volume: 0.5, pitch: 60 }).db > base.db);
  assert.ok(C.computeStats({ wetness: 1 }).stench > C.computeStats({ wetness: 0 }).stench);
  for (const pr of C.PRESETS) {
    const s = C.computeStats(pr.params);
    assert.ok(s.db >= 0 && s.db <= 140);
    assert.ok(s.stench >= 0 && s.stench <= 99);
    assert.ok(s.complaint >= 0 && s.complaint <= 99);
    assert.ok(s.threatIndex >= 0 && s.threatIndex <= 3);
    assert.equal(s.threat, C.THREATS[s.threatIndex]);
  }
});

test('Snikeren er stille men dødelig, Orkanen er brutal', () => {
  const snik = C.computeStats(C.PRESETS.find((p) => p.id === 'snikeren').params);
  const orkan = C.computeStats(C.PRESETS.find((p) => p.id === 'orkan').params);
  assert.ok(snik.db < orkan.db - 30);
  assert.ok(snik.stench >= 70);
  assert.ok(orkan.threatIndex >= 2);
});

test('formatTime runder opp gjenstående tid', () => {
  assert.equal(C.formatTime(0), '00:00');
  assert.equal(C.formatTime(-3), '00:00');
  assert.equal(C.formatTime(65), '01:05');
  assert.equal(C.formatTime(9.1), '00:10');
  assert.equal(C.formatTime(60), '01:00');
});

test('stepDuration gir åttendedeler og klemmer BPM', () => {
  assert.equal(C.stepDuration(120), 0.25);
  assert.equal(C.stepDuration(60), 0.5);
  assert.equal(C.stepDuration(10000), C.stepDuration(240));
});

test('DJ: rader, standardmønster, toggle og tilfeldig mønster', () => {
  assert.equal(C.DJ_ROWS.length, 4);
  for (const r of C.DJ_ROWS) assert.ok(C.normalizeParams(r.params).duration <= 0.5, r.id);
  assert.ok(C.isValidPattern(C.DEFAULT_PATTERN));
  assert.ok(!C.isValidPattern([[true]]));
  assert.ok(!C.isValidPattern('tull'));
  const t = C.toggleStep(C.DEFAULT_PATTERN, 0, 1);
  assert.notEqual(t[0][1], C.DEFAULT_PATTERN[0][1]);
  assert.equal(C.DEFAULT_PATTERN[0][1], plain(C.DEFAULT_PATTERN)[0][1]);
  const r1 = C.randomPattern(C.mulberry32(5), 0.4);
  const r2 = C.randomPattern(C.mulberry32(5), 0.4);
  assert.deepEqual(plain(r1), plain(r2));
  assert.ok(C.isValidPattern(r1));
  assert.equal(r1[0][0], true);
});

test('isShake oppdager kraftig risting', () => {
  assert.equal(C.isShake(null, { x: 0, y: 0, z: 9.8 }, 14), false);
  assert.equal(C.isShake({ x: 0, y: 0, z: 9.8 }, { x: 1, y: 1, z: 9.8 }, 14), false);
  assert.equal(C.isShake({ x: 0, y: 0, z: 9.8 }, { x: 10, y: -8, z: 2 }, 14), true);
});

test('oppskrift kan deles og leses tilbake', () => {
  const p = C.normalizeParams(C.PRESETS[2].params);
  const back = C.decodeRecipe(C.encodeRecipe(p));
  for (const k of Object.keys(p)) assert.ok(near(back[k], p[k], 0.01), k);
  assert.equal(C.decodeRecipe('tull'), null);
  assert.equal(C.decodeRecipe('v1.1.2'), null);
  assert.equal(C.decodeRecipe('v1.a.b.c.d.e.f.g.h.i'), null);
  assert.equal(C.decodeRecipe(undefined), null);
  const clamped = C.decodeRecipe('v1.99999.20.100.50.15.30.10.0.90');
  assert.equal(clamped.pitch, 500);
});

test('lab-verdier og parametre kan konverteres begge veier', () => {
  for (const pr of C.PRESETS) {
    const p = C.normalizeParams(pr.params);
    const lab = C.paramsToLab(p);
    for (const f of C.LAB_FIELDS) {
      assert.ok(f.key in lab, f.key);
      assert.ok(lab[f.key] >= f.min && lab[f.key] <= f.max, `${pr.id}: ${f.key}=${lab[f.key]}`);
    }
    const back = C.labToParams(lab);
    assert.ok(near(back.pitch, p.pitch, 1), pr.id + ' pitch');
    assert.ok(near(back.pitchEnd, p.pitchEnd, 3), pr.id + ' pitchEnd');
    assert.ok(near(back.duration, p.duration, 0.03), pr.id + ' duration');
    for (const k of ['wetness', 'rasp', 'air', 'squeak', 'volume']) assert.ok(near(back[k], p[k], 0.01), pr.id + ' ' + k);
    assert.ok(near(back.flutter, p.flutter, 0.5), pr.id + ' flutter');
  }
});

test('randomLab holder seg innenfor sliderne', () => {
  const rng = C.mulberry32(9);
  for (let i = 0; i < 20; i++) {
    const lab = C.randomLab(rng);
    for (const f of C.LAB_FIELDS) assert.ok(lab[f.key] >= f.min && lab[f.key] <= f.max, f.key);
  }
});

test('vibrasjonsmønster matcher lydens lengde', () => {
  for (const pr of C.PRESETS) {
    const p = C.normalizeParams(pr.params);
    const v = Array.from(C.vibrationPattern(p));
    assert.ok(v.length >= 1 && v.length <= 40, pr.id);
    assert.ok(v.every((x) => Number.isInteger(x) && x > 0), pr.id);
    assert.ok(v.reduce((a, b) => a + b, 0) <= Math.max(20, Math.min(p.duration * 1000, 3000)) + 1, pr.id);
  }
});

test('akustikkrom er gyldige', () => {
  assert.ok(C.ROOMS.length >= 3);
  assert.equal(new Set(C.ROOMS.map((r) => r.id)).size, C.ROOMS.length);
  for (const r of C.ROOMS) assert.ok(r.mix >= 0 && r.mix <= 1 && r.decay >= 0, r.id);
  assert.ok(C.SCAPEGOATS.length >= 5);
});
