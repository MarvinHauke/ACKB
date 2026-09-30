# Design rules

The UI rules for ACKB, as the code does them today. Tokens live in `src/app.css`.

- **Restrained:** the sidebar and the result list are the product. No decoration, no new
  libraries, no ads.
- **Colors:** tokens only (`--fg`, `--muted`, `--accent`, `--line`, `--panel`, `--bg`, `--hover`,
  plus `--ok`, `--warn`, `--bad`), each defined for light and dark. No raw color values in components.
- **Surfaces:** page = `--bg`; boxes (sidebar filter groups) and chips = `--panel`; separators =
  `--line`, lighter inside lists (a `color-mix` of `--line` in `ArticleList`).
- **Hover:** a `--hover` tint (accent at 8%), or an accent border on chips. Hover never darkens
  and is never the only cue.
- **Focus:** 2px `--accent` outline (`:focus-visible`).
- **Active or selected:** accent border and text (`button.chip.on`, `aria-pressed`).
- **Remove:** `--bad` on hover (the × of a filter chip).
- **Spacing:** only `--space-1…5` (0.25, 0.5, 1, 1.5, 2.5rem). Radius: 3px chips, 4px controls and rows, 6px boxes.
  Overlays use `--shadow`; nothing else has a shadow.
- **Filter lists:** long lists scroll inside their box (max ≈12 rows, thin line-colored scrollbar,
  fade at the bottom while more is below, never horizontal); no "Show all" in the filters.
- **Groups:** a left chevron in `--muted` (› closed, down when open); children of an open group
  hang on a 1px `--line` guide line.
- **Headings:** one small uppercase style (`.eyebrow`) for sidebar and toolbar headings. Header
  rows across columns share one height and one thin line (`.head-row`: sidebar "Filters" ↔ results
  toolbar or "Recent articles").
- **Responsive:** works from 360 to 1400px with no horizontal scroll. The filters fold behind a
  toggle below 45rem; no control disappears (Reset stays next to the toggle).
  Tap targets: ≥44px for stacked links, ≥24px plus spacing for inline links.
- **Accessibility:** real buttons and links, labels, `aria-*` where needed (combobox and listbox
  in the search bar, `aria-pressed`, `aria-expanded`). Links out use
  `target="_blank" rel="noopener external"` with `data-out`.
- **Separation:** articles and references never share one list ("Need the basics?" is its own
  folded box).
