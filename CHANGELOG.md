# Changelog – Prutt-O-Teket Super 3000

## v2.0.0 – 2026-10-27
- Ny lydmotor: alle lyder syntetiseres live i nettleseren (Web Audio). Ingen eksterne MP3-er, virker offline.
- Hver soundboard-knapp har egen karakter: tone, tonefall, flutter, væske, rasp, snikfaktor og pipe-hale.
- Prompe-laben styrer faktisk lyden: 9 parametre, «Tilfeldig» og «Del oppskrift» (lenke med `#r=`).
- Prompe-O-Meteret regner dB, giftgassindeks, trusselnivå og naboklage ut fra selve lyden. Ny syndebukk og teller.
- Akustikk: ute, stue, baderom og katedral (romklang).
- Prompe-DJ: 4 × 8 rutenett, presis timing på lydklokka, remix, tøm, lagret mønster og tempo.
- Tidsbombe: tilfeldig tid, avbryt-knapp, nedtelling som tåler at fanen havner i bakgrunnen, holder skjermen våken.
- Riste-modus: tydelig status, iOS-tillatelse og beskjed om https-krav.
- Vibrasjon i takt med lyden, gassky fra knappen du trykker på, oscilloskop, tastatursnarveier 1–8 og 0.
- Eget design uten Tailwind-, Font Awesome- og konfetti-CDN. Respekterer «redusert bevegelse».
- Husker lyd av/på, akustikk, valgt fane, teller og DJ-mønster.
- Feilrettinger: Lab-sliderne for væske og flutter gjorde ingenting, alle knapper spilte samme tilfeldige MP3, Maskingeværet kuttet seg selv, timeren kunne startes flere ganger og drev i bakgrunnen, ugyldig `border-3`-klasse.
- Tester: `npm test` (19 tester for kjernelogikken og versjonen).
- `package.json` med versjon, så samlesiden kan vise den.

## v1.0.0 – 2026-10-27
- Første versjon: soundboard, prompe-lab, tidsbombe, riste-modus og DJ.
