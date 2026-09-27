# ACKB: Analog Circuit Knowledge Base

A searchable index of good resources on synthesizer circuits (analog, digital or mixed): papers, schematics, service
manuals, datasheets and build logs. It is not a wiki and doesn't copy anything. Resources stay on
their original sites; ACKB stores the links, a short summary and tags.

Live site: https://marvinhauke.github.io/ACKB/

## What an entry is

One entry is one topic, for example "Korg MS-20 filter analysis". It collects several sources on
that topic and tags them by manufacturer, instrument, circuit type, subcircuit (OTA stage, voltage
follower, …), function (soft clipping, resonance, …) and IC (LM13700, TL072, …).

## Finding things

Type in the search box (MS-20, LM13700, "buffer", …) or combine filters on the left. Every tag has
its own page, e.g. all entries using an LM13700. Each entry lists related entries and explains why
they are related (shared ICs, subcircuits, …).

## How trustworthy is it

Every entry has a confidence level: `official` (manufacturer), `academic` (papers),
`community-verified`, `community`, `experimental`. Links are checked weekly; if a source goes
offline, the entry points to an archived copy on archive.org when one exists.

## Data for tools and AI

The whole index can be downloaded as plain data: `data/kb.jsonl` (one entry per line) and
`data/taxonomy.json` (all tags). `llms.txt` gives language models a map of the site.
Subcircuit names match the PDF_OCR project, so its detections can link straight to ACKB.

## Adding entries

One JSON file per entry in `data/entries/`. `npm run new -- "Title"` creates one,
`npm run validate` checks it. Details: [docs/adding-entries.md](docs/adding-entries.md) and
[docs/taxonomy.md](docs/taxonomy.md).

## Run it locally

```bash
npm install
npm run dev
```

Node 22 or newer. How it's built: [docs/architecture.md](docs/architecture.md).
What comes next: [docs/roadmap.md](docs/roadmap.md).
