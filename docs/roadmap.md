# Roadmap

ACKB has one job: providing knowledge. A separate CLI (local model + PDF_OCR + KiCanvas) will
use ACKB's exports (`kb.jsonl`, `taxonomy.json`, the per-tag lookup files) when it needs knowledge.
No server or REST API: the static lookup files cover that.

## Next

- **Instrument list** from [Synthesizers 1896–2024](https://github.com/iftah-og/Synthesizers-1896-2024)
  (MIT): spec sheets on product pages and a coverage to-do list (famous analog instruments without
  entries yet).
- **Crawler** that suggests resources into a small review queue; nothing is added without review.
- **More static sources**: go through the [Synth DIY Wiki resource list](https://sdiy.info/wiki/Online_resources).
  Prefer static sites and blogs; forums only as single hand-picked threads (synth-diy.org blocks bots).
- **Review content kinds**: Moritz Klein videos and Electric Druid projects are tagged `explanation`
  only; add `build-guide` where you can build along.
- **Custom domain**: serve ACKB at irregular-instruments.com/ACKB once the Irregular site moves to
  the `marvinhauke.github.io` repo (ACKB itself needs no change).

## Later

- Term pages with short explanations (what a subcircuit is, how to recognize it).
- Smarter filters once the tag lists get long.
- Maybe: external contributions.

## Stable for other tools

- Entry and tag ids never change or get reused.
- Subcircuit ids stay equal to PDF_OCR's pattern kinds (`pdfOcrKind` in `subcircuits.json`).
- Lookup file paths (`data/<type>/<id>.json`) and their `schemaVersion` stay stable.
