# Adding articles

One article = one link (a page, video, repo, paper, …) with its tags. The tags connect it to ICs,
subcircuits, modules, products and authors, and through them to related articles: together they
form a small knowledge graph. There are no hand-made topics; groupings come from the filters.

```bash
npm run new -- "Building a DIY Eurorack MS-20 Lowpass Filter"   # creates data/articles/<id>.json
# fill in the file (VS Code autocompletes fields from the schema)
npm run validate
```

## Example

```json
{
	"$schema": "../../schema/article.schema.json",
	"schemaVersion": 3,
	"title": "Building a DIY Eurorack MS-20 Lowpass Filter",
	"url": "https://www.n8synth.co.uk/diy-eurorack/eurorack-ms-20-lowpass-filter/",
	"type": "website",
	"authors": ["n8-synthesizers"],
	"summary": "Step-by-step Eurorack build of René Schmitz's late MS-20 filter with an LM13700 …",
	"manufacturers": ["korg"],
	"products": ["ms-20"],
	"modules": ["filter"],
	"subcircuits": ["sallen-key", "ota-stage", "diode-limiter"],
	"functions": ["nonlinear-feedback", "soft-clipping"],
	"components": ["lm13700"],
	"kinds": ["build-guide", "schematic"],
	"added": "2026-09-26"
}
```

## Rules

The full checklist, including what CI checks on every pull request, is in
[source-rules.md](source-rules.md).


- The file name is the id (`lowercase-kebab-case.json`), usually a slug of the title. All ids
  are kebab-case.
- One file per link: the same URL in two files is an error.
- Tag fields use **ids** from `data/taxonomy/` (see [taxonomy](taxonomy.md)); authors come from
  `authors.json`. Typos get a "did you mean" hint from `npm run validate`.
- A product's manufacturer must also be in `manufacturers`.
- Summaries in your own words, about this article; link to the original, never copy content.
- After adding articles, check that the filters still fit (new tags need a group; do FX
  subtypes, products or authors need adding?).

| Field          | Values                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------- |
| `type`         | `website`, `paper`, `datasheet`, `patent`, `repo`, `video`, `forum`, `manual`, `schematic` |
| `modules`      | module ids (a subtype plus its parent: `["fx", "delay"]`); may be empty for general topics |
| `kinds`        | one or more of `build-guide`, `explanation`, `analysis`, `schematic`, `reference`           |
| `origin`       | optional: `manufacturer`, `academic`                                                         |

`kinds` says what the resource is: `build-guide` (step by step, parts list, layout),
`explanation` (how and why it works), `analysis` (maths, measurements, simulation),
`schematic` (circuit diagrams without much text), `reference` (manuals, datasheets, calculators).

Confidence isn't set by hand; the build derives it: `official` for a `datasheet` or `manual` or
`"origin": "manufacturer"`, `academic` for a `paper` or `patent` or `"origin": "academic"` (e.g. a
university lecture video), otherwise `community`.

`"summaryFromGroup": true` marks summaries inherited from the old multi-link entries (before
2026-09-28). `npm run validate --verbose` lists them; rewrite the summary for the article and drop
the flag.
