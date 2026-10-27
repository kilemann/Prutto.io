# Changelog – Prutt-O-Teket Super 3000

## v3.0.1 – 2026-10-27
- Rettet adressen i feilmeldingen og README: kilemann.github.io/Prutto.io/ med stor P.

## v3.0.0 – 2026-10-27
- Ekte fiselyder: 44 opptak fra Yle-arkivet og Wikimedia Commons erstatter den syntetiske lydmotoren.
- Opptakene er målt (lengde, dybde, sprut, sus) og sortert i grupper. Hver knapp trekker et nytt opptak hver gang, uten å gjenta forrige.
- «Liten mus, stor promp» og «Megaorkanen» legger flere opptak i lag.
- Prompe-laben jobber på ekte opptak: velg opptak, tonehøyde/tempo, volum, rasp, hakking og baklengs.
- Prompe-DJ spiller ekte opptak i takt, og laster lydene før første slag.
- Prompe-O-Meteret regner ut fra opptakets målte egenskaper.
- Lydkreditering i appen og i `lyder/KREDITERING.md`.
- Oppskriftslenker har nytt format (v2). Lenker fra 2.0 virker ikke lenger.
- Tester: 20 tester, blant annet at alle lydfiler finnes, er kreditert, og at ingen syntetisk lydmotor er igjen.

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
