# Prutto-io
Fise maskin deluxe – **Prutt-O-Teket Super 3000**, Norges mest avanserte biologiske lydlaboratorium.

All lyd syntetiseres live i nettleseren med Web Audio, så appen virker uten nett. Alt ligger i `index.html`.

## Funksjoner
- Soundboard med 8 klassikere og «Overrask meg»
- Prompe-lab med 9 parametre og deling av oppskrift via lenke
- Prompe-O-Meter, akustikkvalg (ute, stue, baderom, katedral)
- Tidsbombe, riste-modus og Prompe-DJ

## Tester
Kjernelogikken ligger i `<script id="prutt-core">` og testes med Node:

```
node --test tests/*.test.mjs
```

Se [CHANGELOG.md](CHANGELOG.md) for versjonshistorikk.
