# MIDAS - Lunar Landing Site Navigator

NASA Space Apps Challenge 2026 - Team Midas (Austin, TX)

Rotate a 3D Moon, click a location, choose a date, and see whether the Sun and Earth are above the horizon there. Pin a second location to compare.

## Status

Work in progress (hackathon weekend, Nov 14-15, 2026).

The first working starter includes a rotatable/clickable Moon, coordinate entry,
UTC date controls spanning one year (`data/ephemeris-year.json`), real cached NASA/JPL data, elevation cards,
compass directions, disc-visibility estimates, moving 30-day charts,
two-site comparison, a 15-site mission catalog, and method/source disclosures.
Five planning tabs add Earth-view lunar phases, a panoramic surface sky, visibility
windows/countdowns, same-site alternative dates, and labeled simplified obstruction,
horizontal-panel power and radiative reference-plate scenarios. All browser dependencies are
local. No framework, package install, account, or API key is needed to run it.

The detailed Moon is `assets/moon_lro_web.glb` (5.08 MB, 121,828 triangles,
4096×2048 WebP texture), converted by Claude from the team-supplied LRO model.
It preserves the geographic axes and scales to unit outer radius. The original
textured sphere remains interactive while loading and if the GLB is unavailable.
An optional HD toggle loads `assets/moon_lro_hd.glb` (18.4 MB, 487,578 triangles, 8K texture). Standard detail remains the default on every device.
Relief is visual only; elevation calculations still use a smooth reference sphere.

## Run locally

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000` in a modern browser. Do not open `index.html` directly
as a file: JavaScript modules and the data fetch need a local server.

## Team file map

| Area | Files | Suggested owner |
| --- | --- | --- |
| Page layout and styles | `index.html`, `styles.css` | Shriyan |
| Globe, controls, integration | `app.js` | Pranav T |
| Calculations and data | `math.mjs`, `data/`, `scripts/fetch_data.py` | Agastya |
| Test cases, screenshots, demo | `tests/`, `SOURCES.md` | Pranav C |

Keep one shared calculation implementation in `math.mjs`; do not type sample
mockup values into the UI. Make changes on your own branch and pull teammates'
updates before pushing. Coordinate edits to `app.js` with the integration owner.

## Check and refresh the data

```sh
node tests/math.test.mjs
node tests/moon-model.test.mjs
node tests/math-additions.test.mjs
node tests/extended-validation.test.mjs
node tests/mission.test.mjs
node --check app.js
python3 scripts/fetch_data.py
```

Only the last command needs network access. Direct reference samples can be refreshed with `python3 scripts/validate_extended.py`; see VALIDATION.md. It replaces the checked-in one-year
cache and raw response; inspect changes before committing. Python uses its
standard library. Tests need Node.js 18+.

The mathematical checks include geometric limits, Earth parallax, coordinate
round-trips, date bounds, interpolation across the longitude seam, event handling,
and a direct-Horizons sample regression. They do not establish flight-level accuracy.

## Optional GitHub Pages hosting

After this starter is on `main`, a repository administrator can enable **Settings
→ Pages → Deploy from a branch → main / (root)**. This buildless site needs no
Actions workflow. The source is public, but GitHub Pages is only live after Pages
has been enabled and deployment has completed.

## Limits and attribution

See [SOURCES.md](SOURCES.md) for the exact NASA sources, model assumptions, third-party
license, collaborator-reported validation, and AI assistance. Supported dates:
2026-11-14 00:00 through 2027-11-14 00:00 UTC. Terrain shadows, eclipses,
radio-link engineering, actual equipment performance and actual ground temperatures are not calculated. The Simple estimates tab uses explicit hypothetical assumptions; see SOURCES.md.

## Data

Sun and Earth positions come from NASA/JPL Horizons. Model: smooth lunar surface; terrain is not included.

## AI use

AI assistants (Claude and ChatGPT Codex) helped with planning, data-method checks and parts of the code. Details are listed in the project submission.
