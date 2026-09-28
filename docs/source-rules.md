# Rules for adding sources

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
