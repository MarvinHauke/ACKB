# Adding entries

One entry = one topic (e.g. "MS-20 filter analysis") with one or more sources.

```bash
npm run new -- "Moog ladder filter analysis"   # creates data/entries/moog-ladder-filter-analysis.json
# fill in the file (VS Code autocompletes fields from the schema)
npm run validate
```

## Example

```json
{
	"$schema": "../../schema/entry.schema.json",
	"schemaVersion": 1,
	"title": "MS-20 Late Filter DIY Builds (LM13700)",
	"summary": "Practical builds of René Schmitz's late MS-20 filter using an LM13700 OTA …",
	"manufacturers": ["korg"],
	"products": ["ms-20"],
	"circuitTypes": ["filter"],
	"subcircuits": ["sallen_key", "ota_stage", "diode_limiter"],
	"functions": ["nonlinear_feedback", "soft_clipping"],
	"ics": ["lm13700"],
	"difficulty": "intermediate",
	"confidence": "community-verified",
	"added": "2026-09-26",
	"sources": [
		{
			"type": "website",
			"title": "Building a DIY Eurorack MS-20 Lowpass Filter",
			"url": "https://www.n8synth.co.uk/diy-eurorack/eurorack-ms-20-lowpass-filter/",
			"author": "N8 Synthesizers"
		}
	]
}
```

## Rules

- The file name is the id (`lowercase-kebab-case.json`).
- Tag fields use **ids** from `data/taxonomy/` (see [taxonomy](taxonomy.md)). Typos get a
  "did you mean" hint from `npm run validate`.
- A product's manufacturer must also be in `manufacturers`.
- Summaries in your own words; link to the original, never copy content.

| Field        | Values                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------- |
| `difficulty` | `beginner`, `intermediate`, `advanced`                                                       |
| `confidence` | `official`, `academic`, `community-verified`, `community`, `experimental`                    |
| source type  | `website`, `paper`, `datasheet`, `patent`, `github`, `video`, `forum`, `manual`, `schematic` |
