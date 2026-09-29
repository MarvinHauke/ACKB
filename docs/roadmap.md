# Roadmap

ACKB has one job: providing knowledge. A separate CLI (local model + PDF_OCR + KiCanvas) will
use ACKB's exports (`kb.jsonl`, `taxonomy.json`, the per-tag lookup files) when it needs knowledge.
No server or REST API: the static lookup files cover that.

## 1. Foundation: before adding more sources

1. **Editorial rule**: index a resource individually when its main value is designing, modifying,
   repairing or documenting electronic musical instruments. General electronics resources get in
   only when they explain an existing ACKB tag (e.g. a good voltage-follower article). Never
   import an external site's structure. Done 2026-09-29: `docs/source-rules.md` ("What belongs
   in ACKB") and the PR checklist.
2. **Reviewer agent**: `taxonomy-architect` checks taxonomy and architecture before commits
   (see `CLAUDE.md`). Done 2026-09-29.
3. **Data debt**: rewrite the inherited group summaries (`summaryFromGroup`, listed by
   `npm run validate -- --verbose`); review content kinds (Moritz Klein videos and Electric Druid
   projects are `explanation` only; add `build-guide` where you can build along). Done 2026-09-29: all
   79 rewritten from the pages, tags and kinds narrowed per article.
4. **`reference` kind defined**: datasheets, application notes, service manuals, calculators,
   textbooks, tool documentation. Done 2026-09-29: "Content kinds" in `docs/taxonomy.md`.

## 2. Go live

5. **Custom domain**: irregular-instruments.com/ackb, once the Irregular site moves to the
   `marvinhauke.github.io` repo (ACKB itself needs no change).

## 3. Grow the content

6. **More static sources** from the [Synth DIY Wiki resource list](https://sdiy.info/wiki/Online_resources),
   always through the source rules. Prefer static sites and blogs; forums only as single
   hand-picked threads (synth-diy.org blocks bots).
7. **Reference Shelf**: a small, separate list of general electronics sites (All About Circuits,
   Elektronik-Kompendium, Falstad, LTspice) on `/references`, outside the graph, filters and
   search: a way out of ACKB, not part of it.
8. **Instrument list** from [Synthesizers 1896–2024](https://github.com/iftah-og/Synthesizers-1896-2024)
   (MIT): spec sheets on product pages and a coverage to-do list.

## 4. Depth on the pages

9. **Tag pages narrow their articles** by kind (incl. `reference`) and author, first 20 rows plus
   "Show all", so big tags like `/module/filter` stay readable. Done 2026-09-29.
10. **Short explanations on tag pages** (what a subcircuit is, how to recognize it).
11. **"Latest additions"** list (idea from el-component.com).

## Later

- Crawler that suggests resources into a small review queue; nothing is added without review.
- Repair vocabulary (calibration, fault isolation, …), only once repair resources arrive; use
  existing tags first.
- Max/MSP and DSP resources (broader subtitle, tags).
- External contributions.

Not planned: extra classification fields such as `scope` or `resource_type`. `type` (what the
source is), `kinds` (what it's useful for) and the tags (what it's about) are enough.

## Stable for other tools

- Article and tag ids never change or get reused.
- PDF_OCR's pattern kinds stay mapped through `pdfOcrKind` in `subcircuits.json` and
  `pdfOcrKinds` in `data/index.json` (ids are kebab-case since 2026-09-28).
- Lookup file paths (`data/<type>/<path>.json`) and their `schemaVersion` stay stable; breaking
  changes bump it. Version 3 (2026-09-29): kebab-case ids, nested subtype paths, `components`
  instead of `ics`, `data/component/…` instead of `data/ic/…`.
