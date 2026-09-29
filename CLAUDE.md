# ACKB: notes for Claude

Static SvelteKit site: a curated index of links on synth circuits, modeled as a small knowledge
graph in JSON (`data/articles/` = one file per link, `data/taxonomy/` = tag nodes, tags = edges).
Details: `docs/architecture.md`, `docs/taxonomy.md`, `docs/source-rules.md`, `docs/roadmap.md`.

## Rules

- **Review taxonomy and architecture with the `taxonomy-architect` subagent** before committing
  changes that add or edit sources (`data/articles`), tags (`data/taxonomy`), schemas, the data
  model, routes or exports. Fix its "must fix" findings, mention the "consider" ones to the user.
- New sources follow `docs/source-rules.md` (CI enforces the mechanical part on every PR).
- After adding resources, check that the filters still fit (groups, subtypes, products, authors).
- Keep code and docs in sync: when the model changes, update `src/lib/types.ts`,
  `scripts/lib/data.js`, the schemas and the docs together.

## Agent team

Peer Claude sessions that message each other (`SendMessage`), watchable in tmux:

| Name             | Agent file                         | Model  | Job                                     |
| ---------------- | ---------------------------------- | ------ | --------------------------------------- |
| `ackb-architect` | `.claude/agents/ackb-architect.md` | opus   | lead; tasks, model decisions, overviews |
| `ackb-curator`   | `.claude/agents/content-curator.md`| sonnet | adds articles and references, commits   |
| `ackb-reviewer`  | `.claude/agents/taxonomy-architect.md` | opus | reviews; asks the architect about missing filters |

Flow: architect → curator → reviewer (→ architect for new tags/filters) → curator commits →
short overview to the architect. Only the user pushes. `scripts/agents.sh` opens the curator and
reviewer as splits in one tmux window `ackb-agents` (at most 4 panes), resuming them by the
session ids written in their agent files.

## Workflow

- Work on branch `data`; PRs `data` → `main`; `main` deploys to GitHub Pages
  (repo `MarvinHauke/ackb`, later irregular-instruments.com/ackb).
- `npm run check` (validate + types), `npm run check:sources -- --base origin/main` (source rules,
  slow), `npm run data` (regenerate), `BASE_PATH=/ackb npm run build`.
- Pushing needs the user's SSH key: ask the user to run `! git push origin data`.
