# Architecture

Static SvelteKit site, no backend. JSON in `data/` is the only source of truth.

```
data/articles + data/taxonomy          (the knowledge graph: articles, tag nodes, id references as edges)
  → scripts/validate.js     (schema, ids, duplicates)
  → scripts/build-data.js   (catalog, related articles and tags, search index, exports)
  → vite build              (every page prerendered to build/)
```

## Generated files (not committed)

| File                                          | Used for                                              |
| --------------------------------------------- | ----------------------------------------------------- |
| `src/lib/server/generated/catalog.json`       | input for the prerendered pages                       |
| `static/data/search-index.json`               | search, loaded on first focus                         |
| `static/data/kb.jsonl`, `taxonomy.json`       | one article per line, and the vocabulary              |
| `static/data/graph.json`                      | the whole graph: nodes (articles, tags) and edges     |
| `static/data/<type>/<path>.json`, `index.json` | per tag: facts, related tags, articles (PDF_OCR CLI)  |
| `static/llms.txt`                             | site map for LLMs                                     |

## Knowledge graph

- **Nodes**: articles (`data/articles/*.json`) and tags (`data/taxonomy/*.json`: manufacturers,
  products, modules, subcircuits, functions, components & ICs, authors).
- **Edges**: an article's tags; product → manufacturer; `parent` (subtypes); component `alternatives`.
- The build adds per tag: its articles, **same kind** (component alternatives and same category,
  subtypes/siblings, a maker's products) and **often used together** (tags that share articles).
- No graph database needed at this size; `graph.json` can be imported into one later.

## Lookup files (static API)

No server: one JSON file per used tag, e.g.
`https://marvinhauke.github.io/ackb/data/component/ca3080.json`. Types are `manufacturer`, `product`,
`module`, `subcircuit`, `function`, `component`, `author`; `data/index.json` lists every id and maps
PDF_OCR kinds to subcircuit paths (`pdfOcrKinds`). Subtypes sit under their parent
(`data/module/fx/delay.json`). `schemaVersion` 3 (one record per article, kebab-case ids).

## Pages

- `/`: search and filters (`?component=ca3080&module=filter`). One row per article; the title opens the
  resource in a new tab, tag chips open the tag pages, "Details" the article page.
- `/<type>/<path>` (`/component/ca3080`, `/module/fx/delay`, `/author/juergen-haible`, …): one page per used tag
  with facts, related tags and its articles (first 20, narrowed by kind chips and an author select).
- `/article/<id>`: one page per article with its tags and related articles.

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
