# Prutto-io
Fise maskin deluxe – **Prutt-O-Teket Super 3000**, Norges mest avanserte biologiske lydlaboratorium.

Lydene er 44 ekte opptak med fri lisens, i mappen `lyder/` (se [kreditering](lyder/KREDITERING.md)). Appen ligger i `index.html` og må åpnes via nettadressen, for eksempel https://kilemann.github.io/Prutto.io/, for at lydene skal lastes.

## Funksjoner
- Soundboard med 8 klassikere og «Overrask meg»
- Prompe-lab: velg opptak, tonehøyde, rasp, hakking og baklengs, og del oppskriften via lenke
- Prompe-O-Meter, akustikkvalg (ute, stue, baderom, katedral)
- Tidsbombe, riste-modus og Prompe-DJ

## Tester
Kjernelogikken ligger i `<script id="prutt-core">` og testes med Node:

```
npm test
```

Se [CHANGELOG.md](CHANGELOG.md) for versjonshistorikk.
