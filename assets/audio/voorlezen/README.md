# Voorleesstem

Eén opname per hoofdstuk, gekoppeld via `data-narration` op de `<section class="chapter">` in `index.html`.
Bestandsnaam: `<verhaal>-<nummer>.mp3`, bijvoorbeeld `cultuur-1.mp3` = De Kanarie.

## Hoe ze gemaakt zijn

- ElevenLabs, model `eleven_v4`, stem **Ben Steenstra Nederlands** (`0lWo2y2fie88Lsb3AwUo`)
- Tekst = jaartal + titel + verhaaltekst van het hoofdstuk, met vooraan de aanwijzing
  `[elderly voice] [warmly]` en na de titel `[pause]`
- Voor de uitspraak: `±` → `Rond`, `1935 - 1936` → `1935 tot 1936`
- Nabewerking (gelijk volume, mono, klein bestand):

```
ffmpeg -i opname.mp3 -af "silenceremove=start_periods=1:start_threshold=-50dB,loudnorm=I=-16:TP=-1.5:LRA=11" -ac 1 -b:a 64k <verhaal>-<nummer>.mp3
```

## Tekst aangepast?

Laat dan alleen dat hoofdstuk opnieuw inspreken met dezelfde stem, model en aanwijzingen,
en vervang het bestand met dezelfde naam. De tweede versie van elke opname staat nog in
ElevenLabs (flow "AQsEyW7XPpM05efykloB").
