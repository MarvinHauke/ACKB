# Architecture

Static SvelteKit site, no backend. JSON in `data/` is the only source of truth.

```
data/entries + data/taxonomy
  → scripts/validate.js     (schema, ids, duplicates)
  → scripts/build-data.js   (catalog, related entries, search index, exports)
  → vite build              (every page prerendered to build/)
```

## Generated files (not committed)

| File                                     | Used for                                 |
| ---------------------------------------- | ---------------------------------------- |
| `src/lib/server/generated/catalog.json`  | input for the prerendered pages          |
| `static/data/search-index.json`          | search, loaded on first focus            |
| `static/data/kb.jsonl`, `taxonomy.json`  | exports for AI tools / PDF_OCR           |
| `static/llms.txt`                        | site map for LLMs                        |
| `static/data/<type>/<id>.json`, `index.json` | entries per tag, for the PDF_OCR CLI |

## Lookup files (static API)

No server: the build writes one JSON file per used tag, e.g.
`https://marvinhauke.github.io/ACKB/data/subcircuit/ota_stage.json`. Types are `manufacturer`,
`product`, `type`, `subcircuit`, `function`, `ic`; `data/index.json` lists every available id and maps PDF_OCR kinds to subcircuit ids
(`pdfOcrKinds`).
Each file has the term (subcircuits include `pdfOcrKind`) and its entries with sources, so the
PDF_OCR CLI can fetch exactly one file per detection.

## Pages

`/`, `/entry/<id>`, and one page per used tag: `/manufacturer/…`, `/product/…`,
`/type/…`, `/subcircuit/…`, `/function/…`, `/ic/…`.

## Search and filters

- Filters: precomputed tag → entries index; tags combine with AND, content kind and confidence
  values with OR. State is kept in the URL.
- Hidden source types (e.g. forum) are a per-browser preference in localStorage
  (`src/lib/source-types.ts`); they hide links on entry pages and entries whose sources are all hidden.
- Search: Fuse.js with a prebuilt index.
- Related entries: weighted overlap of shared ICs, subcircuits, functions, products.

## Operations

- Deploy: `.github/workflows/deploy.yml` builds and publishes to GitHub Pages on push to `main`.
- Link health: `npm run links` (weekly in `.github/workflows/links.yml`) writes
  `data/link-health.json`; broken links show an archive.org copy if one exists.
- Analytics (optional): set the repo variable `GOATCOUNTER_URL`; only outbound clicks are counted.
