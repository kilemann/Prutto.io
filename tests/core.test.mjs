// Tester for kjernelogikken i Prutt-O-Teket.
// Kjør: npm test
// Kjernen ligger i <script id="prutt-core"> i index.html, så appen forblir én HTML-fil pluss lydfiler.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const match = html.match(/<script id="prutt-core">([\s\S]*?)<\/script>/);
if (!match) throw new Error('Fant ikke <script id="prutt-core"> i index.html');
const sandbox = vm.createContext({});
vm.runInContext(match[1], sandbox);
const C = sandbox.PruttCore;
const plain = (x) => JSON.parse(JSON.stringify(x));
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const S = (id) => C.SAMPLES.find((s) => s.id === id);
const preset = (id) => C.PRESETS.find((p) => p.id === id);
const mainLayer = (p) => p.layers.find((l) => l.main) || p.layers[0];

/* ---------- versjon ---------- */
test('versjon er semver, øverst i changelog og lik package.json', () => {
  assert.match(C.VERSION, /^\d+\.\d+\.\d+$/);
  assert.equal(C.CHANGELOG[0].version, C.VERSION);
  assert.ok(C.CHANGELOG[0].changes.length > 0);
  const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
  assert.equal(pkg.version, C.VERSION);
});

test('ingen syntetisk lydmotor igjen – bare ekte opptak', () => {
  assert.ok(!('buildPitchCurve' in C));
  assert.ok(!/createOscillator/.test(html), 'oscillatorer skal ikke brukes til fiselyder');
});

/* ---------- opptak og kreditering ---------- */
test('alle 44 opptak finnes som filer og har målte egenskaper', () => {
  assert.equal(C.SAMPLES.length, 44);
  assert.equal(new Set(C.SAMPLES.map((s) => s.id)).size, 44);
  for (const s of C.SAMPLES) {
    assert.match(s.id, /^[a-z0-9-]+$/, s.id);
    assert.ok(existsSync(new URL(C.sampleUrl(s.id), root)), 'mangler fil ' + C.sampleUrl(s.id));
    for (const k of ['dur', 'act', 'cen', 'flat', 'bursts']) assert.ok(Number.isFinite(s[k]) && s[k] >= 0, `${s.id}.${k}`);
    assert.ok(s.act <= s.dur + 0.05, s.id);
    assert.ok(C.SOURCES[s.src], `${s.id}: ukjent kilde ${s.src}`);
  }
  const files = readdirSync(new URL('lyder/', root)).filter((f) => f.endsWith('.mp3'));
  assert.equal(files.length, 44, 'ingen ukrediterte lydfiler i lyder/');
});

test('hver kilde har forfatter, lenke og fri lisens, og alle kilder brukes', () => {
  const used = new Set(C.SAMPLES.map((s) => s.src));
  for (const [id, src] of Object.entries(C.SOURCES)) {
    assert.ok(src.author && src.title, id);
    assert.match(src.url, /^https:\/\/commons\.wikimedia\.org\//, id);
    assert.match(src.license, /^CC BY(-SA)? \d\.\d$/, id);
    assert.match(src.licenseUrl, /^https:\/\/creativecommons\.org\/licenses\//, id);
    assert.ok(used.has(id), 'ubrukt kilde ' + id);
  }
  const credits = readFileSync(new URL('lyder/KREDITERING.md', root), 'utf8');
  for (const src of Object.values(C.SOURCES)) assert.ok(credits.includes(src.author), 'KREDITERING.md mangler ' + src.author);
});

/* ---------- grupper ---------- */
test('grupper: hver har minst 3 opptak, og alle oppfyller regelen', () => {
  const rules = {
    dyp: (s) => s.cen < 1300, lys: (s) => s.cen >= 2200, sprut: (s) => s.bursts >= 9,
    luft: (s) => s.flat >= 0.37, lang: (s) => s.act >= 1, kort: (s) => s.dur <= 0.52
  };
  for (const [name, rule] of Object.entries(rules)) {
    const b = C.bank(name);
    assert.ok(b.length >= 3, `${name}: ${b.length}`);
    for (const id of b) assert.ok(rule(S(id)), `${name}: ${id}`);
    assert.equal(b.length, C.SAMPLES.filter(rule).length, name + ' skal ta med alle som passer');
  }
  assert.equal(C.bank('alle').length, 44);
  assert.deepEqual(plain(C.bank('finnes-ikke')), []);
});

test('pickSample er deterministisk, holder seg i gruppen og gjentar ikke forrige', () => {
  const b = C.bank('dyp');
  const a = C.mulberry32(4), c = C.mulberry32(4);
  let last = null;
  for (let i = 0; i < 40; i++) {
    const x = C.pickSample(b, a, last);
    assert.equal(x, C.pickSample(b, c, last));
    assert.ok(b.includes(x));
    assert.notEqual(x, last);
    last = x;
  }
  assert.equal(C.pickSample(['frt755'], C.mulberry32(1), 'frt755'), 'frt755');
});

/* ---------- forhåndsvalg ---------- */
test('forhåndsvalg: 8 unike, gyldige lag og grupper', () => {
  assert.equal(C.PRESETS.length, 8);
  assert.equal(new Set(C.PRESETS.map((p) => p.id)).size, 8);
  for (const p of C.PRESETS) {
    assert.ok(p.title && p.icon && p.desc && p.name && p.colors.length === 2, p.id);
    assert.ok(p.layers.length >= 1, p.id);
    assert.ok(p.layers.filter((l) => l.main).length <= 1, p.id);
    for (const l of p.layers) {
      assert.ok(C.bank(l.bank).length >= 3, `${p.id}: ${l.bank}`);
      const v = C.normalizeVoice({ sample: C.bank(l.bank)[0], ...l });
      for (const k of ['rate', 'volume', 'rasp']) assert.equal(v[k], l[k] ?? C.VOICE_DEFAULTS[k], `${p.id}.${k} utenfor område`);
    }
  }
  assert.ok(preset('maskingevaer').burst.count >= 3);
});

/* ---------- stemme ---------- */
test('normalizeVoice klemmer verdier og faller tilbake på gyldig opptak', () => {
  const v = C.normalizeVoice({ sample: 'tull', rate: 9, volume: -1, rasp: 2, stutter: 7.6, reverse: 'ja' });
  assert.ok(S(v.sample));
  assert.equal(v.rate, 2); assert.equal(v.volume, 0); assert.equal(v.rasp, 1); assert.equal(v.stutter, 4);
  assert.equal(v.reverse, true);
  assert.equal(C.normalizeVoice(null).rate, 1);
  assert.equal(C.normalizeVoice({ sample: 'yle-12' }).sample, 'yle-12');
  assert.equal(C.normalizeVoice({ stutter: 'x' }).stutter, 0);
});

test('voiceDuration: dobbel fart gir halv tid, hakking forlenger', () => {
  const base = C.voiceDuration({ sample: 'frt755' });
  assert.ok(near(base, S('frt755').dur, 0.001));
  assert.ok(near(C.voiceDuration({ sample: 'frt755', rate: 2 }), base / 2, 0.001));
  assert.ok(C.voiceDuration({ sample: 'frt755', stutter: 3 }) > base);
  assert.ok(near(C.voiceDuration({ sample: 'frt755' }, 0.3), 0.3, 0.001), 'maks lengde');
});

test('stutterPlan: n hakk + én hel avspilling, i stigende tid', () => {
  for (const n of [0, 1, 4]) {
    const plan = plain(C.stutterPlan(n, 2, 1));
    assert.equal(plan.length, n + 1);
    for (const seg of plan) assert.equal(seg.offset, 0);
    for (let i = 1; i < plan.length; i++) assert.ok(plan[i].at > plan[i - 1].at);
    assert.equal(plan.at(-1).length, 2);
    for (const seg of plan.slice(0, -1)) assert.ok(seg.length < 0.2);
  }
  const fast = plain(C.stutterPlan(2, 2, 2));
  assert.ok(fast[1].at < plain(C.stutterPlan(2, 2, 1))[1].at, 'høyere fart gir raskere hakking');
});

/* ---------- statistikk ---------- */
test('statistikk følger lyden: volum, dypere tone og rasp gir flere dB', () => {
  const base = C.computeStats({ sample: 'yle-30', volume: 0.5, rate: 1 });
  assert.ok(C.computeStats({ sample: 'yle-30', volume: 1, rate: 1 }).db > base.db);
  assert.ok(C.computeStats({ sample: 'yle-30', volume: 0.5, rate: 0.6 }).db > base.db);
  assert.ok(C.computeStats({ sample: 'yle-30', volume: 0.5, rate: 1, rasp: 1 }).db > base.db);
  assert.ok(C.computeStats({ sample: 'yle-34' }).stench > C.computeStats({ sample: 'yle-20' }).stench, 'sprutete lukter mer');
  for (const s of C.SAMPLES) for (const rate of [0.5, 1, 2]) for (const volume of [0, 1]) {
    const st = C.computeStats({ sample: s.id, rate, volume, rasp: 1 });
    assert.ok(st.db >= 0 && st.db <= 140 && st.stench >= 0 && st.stench <= 99 && st.complaint >= 0 && st.complaint <= 99, s.id);
    assert.equal(st.threat, C.THREATS[st.threatIndex]);
  }
});

test('Snikeren er stille men dødelig og Orkanen brutal – uansett hvilket opptak som trekkes', () => {
  const sn = mainLayer(preset('snikeren')), ork = mainLayer(preset('orkan'));
  const snStats = C.bank(sn.bank).map((id) => C.computeStats({ ...sn, sample: id }));
  const orkStats = C.bank(ork.bank).map((id) => C.computeStats({ ...ork, sample: id }));
  const maxSnDb = Math.max(...snStats.map((s) => s.db)), minOrkDb = Math.min(...orkStats.map((s) => s.db));
  assert.ok(maxSnDb < minOrkDb - 30, `${maxSnDb} vs ${minOrkDb}`);
  for (const s of snStats) assert.ok(s.stench >= 70, 'snikeren stench ' + s.stench);
  for (const s of orkStats) assert.ok(s.threatIndex >= 2, 'orkan trussel ' + s.threatIndex);
});

/* ---------- timer, DJ, risting ---------- */
test('formatTime runder opp gjenstående tid', () => {
  assert.equal(C.formatTime(0), '00:00');
  assert.equal(C.formatTime(-3), '00:00');
  assert.equal(C.formatTime(65), '01:05');
  assert.equal(C.formatTime(9.1), '00:10');
});

test('DJ: rader med korte, ekte lyder, mønster og tempo', () => {
  assert.equal(C.stepDuration(120), 0.25);
  assert.equal(C.stepDuration(10000), C.stepDuration(240));
  assert.equal(C.DJ_ROWS.length, 4);
  for (const r of C.DJ_ROWS) {
    assert.ok(C.bank(r.bank).length >= 3, r.id);
    assert.ok(r.maxLen > 0 && r.maxLen <= 0.5, r.id);
  }
  assert.ok(C.isValidPattern(C.DEFAULT_PATTERN));
  assert.ok(!C.isValidPattern([[true]]));
  const t = C.toggleStep(C.DEFAULT_PATTERN, 0, 1);
  assert.notEqual(t[0][1], C.DEFAULT_PATTERN[0][1]);
  const r1 = C.randomPattern(C.mulberry32(5), 0.4);
  assert.deepEqual(plain(r1), plain(C.randomPattern(C.mulberry32(5), 0.4)));
  assert.equal(r1[0][0], true);
});

test('isShake oppdager kraftig risting', () => {
  assert.equal(C.isShake(null, { x: 0, y: 0, z: 9.8 }, 14), false);
  assert.equal(C.isShake({ x: 0, y: 0, z: 9.8 }, { x: 1, y: 1, z: 9.8 }, 14), false);
  assert.equal(C.isShake({ x: 0, y: 0, z: 9.8 }, { x: 10, y: -8, z: 2 }, 14), true);
});

/* ---------- oppskrift og lab ---------- */
test('oppskrift v2 kan deles og leses tilbake', () => {
  const v = C.normalizeVoice({ sample: 'yle-38', rate: 0.73, volume: 0.8, rasp: 0.4, stutter: 2, reverse: true });
  const code = C.encodeRecipe(v);
  assert.match(code, /^v2\./);
  const back = C.decodeRecipe(code);
  assert.equal(back.sample, 'yle-38'); assert.equal(back.stutter, 2); assert.equal(back.reverse, true);
  for (const k of ['rate', 'volume', 'rasp']) assert.ok(near(back[k], v[k], 0.01), k);
  for (const bad of ['tull', undefined, 'v2.yle-38.1', 'v2.ukjent.100.80.40.2.1', 'v1.120.54.80.50.15.30.10.0.90', 'v2.yle-38.a.80.40.2.1'])
    assert.equal(C.decodeRecipe(bad), null, String(bad));
  assert.equal(C.decodeRecipe('v2.yle-38.999.80.40.2.0').rate, 2);
});

test('lab-verdier og stemme kan konverteres begge veier, og ligger innenfor sliderne', () => {
  for (const p of C.PRESETS) for (const l of p.layers) {
    const v = C.normalizeVoice({ ...l, sample: C.bank(l.bank)[0] });
    const lab = C.voiceToLab(v);
    for (const f of C.LAB_FIELDS) assert.ok(lab[f.key] >= f.min && lab[f.key] <= f.max, `${p.id}: ${f.key}`);
    const back = C.labToVoice(lab);
    assert.equal(back.sample, v.sample);
    for (const k of ['rate', 'volume', 'rasp']) assert.ok(near(back[k], v[k], 0.01), `${p.id} ${k}`);
    assert.equal(back.stutter, v.stutter); assert.equal(back.reverse, v.reverse);
  }
  const rng = C.mulberry32(9);
  for (let i = 0; i < 30; i++) {
    const lab = C.randomLab(rng);
    assert.ok(S(lab.sample));
    for (const f of C.LAB_FIELDS) assert.ok(lab[f.key] >= f.min && lab[f.key] <= f.max, f.key);
  }
});

test('opptaksnavn er lesbare og unike', () => {
  const labels = C.SAMPLES.map((s) => C.sampleLabel(s.id));
  assert.equal(new Set(labels).size, 44);
  assert.match(C.sampleLabel('frt755'), /dyp/i);
});

/* ---------- effekter ---------- */
test('vibrasjonsmønster følger lengden og antall utbrudd', () => {
  for (const s of C.SAMPLES) {
    const v = Array.from(C.vibrationPattern(s.dur, s.bursts));
    assert.ok(v.length >= 1 && v.length <= 40 && v.length % 2 === 1, s.id);
    assert.ok(v.every((x) => Number.isInteger(x) && x > 0), s.id);
    assert.ok(v.reduce((a, b) => a + b, 0) <= Math.max(60, Math.min(s.dur, 3) * 1000) + 1, s.id);
  }
  assert.ok(C.vibrationPattern(2, 10).length > C.vibrationPattern(2, 1).length);
});

test('akustikkrom og syndebukker er gyldige', () => {
  assert.ok(C.ROOMS.length >= 3);
  for (const r of C.ROOMS) assert.ok(r.mix >= 0 && r.mix <= 1 && r.decay >= 0, r.id);
  assert.ok(C.SCAPEGOATS.length >= 5);
});
