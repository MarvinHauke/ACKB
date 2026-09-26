# Roadmap

ACKB has one job: providing knowledge. A separate CLI (local model + PDF_OCR + KiCanvas) will
use ACKB's exports (`kb.jsonl`, `taxonomy.json`) when it needs knowledge.

## Next

- **Instrument list** from [Synthesizers 1896–2024](https://github.com/iftah-og/Synthesizers-1896-2024)
  (MIT): spec sheets on product pages and a coverage to-do list (famous analog instruments without
  entries yet).
- **Crawler** that suggests resources into a small review queue; nothing is added without review.

## Later

- Term pages with short explanations (what a subcircuit is, how to recognize it).
- Smarter filters once the tag lists get long.
- Maybe: external contributions.

## Stable for other tools

- Entry and tag ids never change or get reused.
- Subcircuit ids stay equal to PDF_OCR's pattern kinds (`pdfOcrKind` in `subcircuits.json`).
