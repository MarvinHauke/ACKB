# Rules for adding sources

## What belongs in ACKB

ACKB is about **electronic musical instruments**. A resource gets its own article when its main
value is designing, modifying, repairing or documenting them: synth schematics, service manuals,
circuit analyses of instruments, build logs, synth-specific papers and lectures, datasheets and
application notes of parts used in synths.

- **General electronics** (a textbook chapter on op-amps, a filter calculator) gets in only when
  it explains a concept that already has an ACKB tag, e.g. a clear voltage-follower article tagged
  `voltage-follower`. It gets no product, module or function tags it doesn't actually discuss.
- **Never mirror another site's structure**: don't add a site's chapters one by one, and don't
  create tags just because another site has a page about something.
- **General electronics sites** (All About Circuits, Electronics Tutorials, simulators) are
  **references**, never articles. They live in `data/references.json`, apart from the graph:
  - a *site* entry per site: https url, `category` (`learning`, `simulation`, `calculators`,
    `parts`) and a summary in your own words;
  - optional *page* entries: one page on a listed site (`site`) that explains an existing tag,
    with the tag fields articles use (`subcircuits`, `components`, …). Pages only point to tags,
    never create them; pick at most one or two per tag, only where the basics help.

  References show up on `/references` and, folded, under "Need the basics?" on tag and article
  pages; never in search, filters, related tags or the exports. `npm run validate` checks them
  (schema, known site, same host, known tags, not also an article).

In doubt, ask: would someone working on a synth circuit be glad to find this under that tag?

## How it's checked

Every article reaches `main` through a pull request. CI runs `npm run check:sources` on it and
fails on any error; run it locally before pushing:

```bash
npm run check:sources -- --base origin/main   # articles changed since main
npm run check:sources -- --all                # audit every article as if it were new
```

"New" means the URL isn't on the base branch yet. The strict rules (4, 6, 7, 8) apply to new
articles only.

## Checked by CI (errors)

1. **Valid data**: schema, kebab-case ids, known tags (`npm run validate`).
2. **One article per link**: also after removing `www.`, trailing slashes and tracking parameters
   (`utm_*`, `fbclid`, …). No tracking parameters and no short links (bit.ly, youtu.be, …).
3. **The link works** (OK or redirect). Sites that block automated checks (e.g. forums returning
   403) need `"linkCheck": "blocked"` after checking the link by hand.
4. **Enough tags**: an author (or `"origin": "manufacturer"` for manufacturer documents) and at
   least one module, subcircuit, function or component.
5. **Tags fit the filters**: every subcircuit and function used has a sidebar `group`.
6. **Own summary**: no `summaryFromGroup`; `added` is not in the future.
7. **Own words**: the summary must not share 8 words in a row with the page (text or meta
   description).
8. **https when possible**: an `http://` link fails if the same page works over `https://`.

## Reported by CI (warnings)

- A site that isn't in ACKB yet: check its quality once.
- A subcircuit or function group with more than 12 entries: consider a subgroup.

## Checked by you (PR checklist)

- Primary or technically deep source, not a shop page or aggregator.
- Summary in your own words, describing this article.
- Author credited; license notes added where the site states them.
- Nothing copied: no images, no text. ACKB only links.
- Filters still fit after adding the article.
