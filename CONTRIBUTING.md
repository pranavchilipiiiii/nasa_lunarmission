# Contributing

## Branches

Work on your own branch. Pull `main` before pushing. Coordinate edits to `app.js` with the integration owner.

## File ownership

| Area | Files | Owner |
|---|---|---|
| Page layout and styles | `index.html`, `styles.css` | Shriyan |
| Globe, controls, integration | `app.js` | Pranav T |
| Calculations and data | `math*.mjs`, `mission.mjs`, `data/`, `scripts/` | Agastya |
| Tests, screenshots, demo | `tests/`, `docs/`, `SOURCES.md` | Pranav C |

Keep one shared calculation implementation in `math.mjs`. Do not hardcode sample values in the UI.

## Checks before a PR

Run every command in the README "Tests" section, and the detector if you changed UI files.

## Deployment

GitHub Pages serves `main` from the repository root. A repository administrator enables it under Settings, Pages, Deploy from a branch, `main` and `/`. No Actions workflow is needed.

Vercel preview deployments are used for branch review. Deployment protection is on by default; the team controls who can open preview URLs.

## Data provenance

Every cached NASA response is kept in `data/` with its query URL. Before changing a cache file, record the new query in the PR.

## AI disclosure

Say in the PR which parts were drafted with AI assistance and which parts a person reviewed.
