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

## Pages

`/`, `/entry/<id>`, `/browse`, and one page per used tag: `/manufacturer/…`, `/product/…`,
`/type/…`, `/subcircuit/…`, `/function/…`, `/ic/…`.

## Search and filters

- Filters: precomputed tag → entries index; tags combine with AND. State is kept in the URL.
- Search: Fuse.js with a prebuilt index.
- Related entries: weighted overlap of shared ICs, subcircuits, functions, products.

## Operations

- Deploy: `.github/workflows/deploy.yml` builds and publishes to GitHub Pages on push to `main`.
- Link health: `npm run links` (weekly in `.github/workflows/links.yml`) writes
  `data/link-health.json`; broken links show an archive.org copy if one exists.
- Analytics (optional): set the repo variable `GOATCOUNTER_URL`; only outbound clicks are counted.
