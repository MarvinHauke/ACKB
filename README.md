# ACKB: Analog Circuit Knowledge Base

A searchable index of good resources on synthesizer circuits (analog, digital or mixed): papers, schematics, service
manuals, datasheets and build logs. It is not a wiki and doesn't copy anything. Resources stay on
their original sites; ACKB stores the links, a short summary and tags.

Live site: https://marvinhauke.github.io/ACKB/

## What an article is

One article is one link: a page, video, repo or paper. It is tagged by manufacturer, instrument,
module (VCO, filter, …), subcircuit (OTA stage, voltage follower, …), function (soft clipping,
resonance, …), IC (LM13700, TL072, …) and author. The tags connect articles with each other: a
small knowledge graph.

## Finding things

Type in the search box (MS-20, LM13700, "buffer", …) or combine filters on the left. Each result
opens the resource directly; "Details" shows its tags and related articles. Every tag has a page,
e.g. [/component/ca3080](https://marvinhauke.github.io/ackb/component/ca3080) with facts, similar parts and its
articles. Hide source types (e.g. forum) or http:// links; your browser remembers it.

## How trustworthy is it

Every article has a confidence level, worked out from what it is: `official` (manufacturer
datasheets and manuals), `academic` (papers, patents, university lectures) or `community`
(everything else). Links are checked weekly; if one goes offline, the article points to an
archived copy on archive.org when one exists.

## Data for tools and AI

The whole index can be downloaded as plain data: `data/kb.jsonl` (one article per line),
`data/graph.json` (the knowledge graph) and `data/taxonomy.json` (all tags). One small file per
tag, e.g. `data/component/ca3080.json`, lets tools like the PDF_OCR CLI fetch just what they need.
`llms.txt` gives language models a map of the site.

## Adding articles

One JSON file per link in `data/articles/`. `npm run new -- "Title"` creates one,
`npm run validate` checks it; pull requests must pass [the source rules](docs/source-rules.md).
Details: [docs/adding-articles.md](docs/adding-articles.md) and [docs/taxonomy.md](docs/taxonomy.md).

## Run it locally

```bash
npm install
npm run dev
```

Node 22 or newer. How it's built: [docs/architecture.md](docs/architecture.md).
What comes next: [docs/roadmap.md](docs/roadmap.md).
