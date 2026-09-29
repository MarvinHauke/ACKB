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
| `build/sitemap.xml`, `build/robots.txt`       | prerendered routes: home, articles, tag pages with ≥ 3 articles (thin ones are `noindex,follow`; threshold `MIN_INDEXABLE_ARTICLES` in `src/lib/seo.ts`) |

The public base URL for sitemap, canonical links and JSON-LD is `SITE_URL` (`src/lib/server/seo.ts`;
default `https://marvinhauke.github.io/ackb`, later `SITE_URL=https://irregular-instruments.com/ackb`; change it together with `BASE_PATH`).
`robots.txt` is only read at a domain root: on the project site (`/ackb/robots.txt`) submit the sitemap in Search Console.

## Knowledge graph

- **Nodes**: articles (`data/articles/*.json`) and tags (`data/taxonomy/*.json`: manufacturers,
  products, modules, subcircuits, functions, components & ICs, authors).
- **Edges**: an article's tags; product → manufacturer; `parent` (subtypes); component `alternatives`.
- The build adds per tag: its articles, **same kind** (component alternatives and same category,
  subtypes/siblings, a maker's products) and **often used together** (tags that share articles).
- Component `successors` (reissues, replacements) are plain data on the node, not edges.
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
- `/references`: references (`data/references.json`): general electronics sites and single pages
  on them. A second collection next to the articles, outside the graph: pages point to tags and
  appear folded under "Need the basics?" on those tag pages and on articles sharing a subcircuit
  or component; only in the catalog, not in search, filters, related tags or the exports.

## Search and filters

- Filters: precomputed tag → entries index; tags combine with AND, content kind and confidence
  values with OR. State is kept in the URL.
- Hidden source types (e.g. forum) are a per-browser preference in localStorage
  (`src/lib/source-types.ts`); they hide links on entry pages and entries whose sources are all hidden.
- Search: Fuse.js with a prebuilt index. The search bar (`src/lib/components/SearchBar.svelte`) shows
  active tag filters and text terms as removable chips on its right (at most 4, then `+N`). Typing
  `,` or Enter turns the text before it into a chip: a tag when it matches the label or an alias of a used
  term (order modules › components › subcircuits › functions › products › manufacturers ›
  authors; the chip shows the type when the label is ambiguous), otherwise a text term. Text terms
  combine with AND. Suggestions (recent filters, matching tags while typing) are an ARIA listbox
  overlay. URL: tag params as before, text terms as repeated `q`; on load the last `q` is the live
  text in the field, the others become chips. With chips the live slot is always written
  (`?q=vca&q=`), so a reload shows the same chips; a single `?q=foo` stays live text.
- Related entries: weighted overlap of shared ICs, subcircuits, functions, products.

## Operations

- Deploy: `.github/workflows/deploy.yml` builds and publishes to GitHub Pages on push to `main`.
- Link health: `npm run links` (weekly in `.github/workflows/links.yml`) writes
  `data/link-health.json`; broken links show an archive.org copy if one exists.
- Analytics (optional): set the repo variable `GOATCOUNTER_URL`; only outbound clicks are counted.
