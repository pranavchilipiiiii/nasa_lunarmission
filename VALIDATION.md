# MIDAS model validation

AI-assisted (Claude). Compares the site's calculation (`math.mjs` with `data/ephemeris.json`, repo commit 4437462)
against direct NASA/JPL Horizons surface-observer output (targets Sun `10` and Earth `399`, observer `coord@301`,
`QUANTITIES=4`, apparent azimuth and elevation). All differences are absolute, in degrees.

## Summary

| Round | Sites | Times (UTC) | Comparisons | Sun elevation, worst | Earth elevation, worst | Azimuth, worst (on the sky) |
|---|---|---|---|---|---|---|
| 1 | 3 | 11 dates at 00:00, 2026-11-14 to 12-14 | 66 | 0.0008 | 0.0059 | not tested |
| 2 | 7 | 10 dates at 07:30, 2026-11-14 to 12-11 | 90 | 0.0009 | 0.0046 | 0.0059 |

Round 2 times fall between the hourly cache samples, so it also tests the interpolation.
Azimuth uses `azimuth()` in `math-additions.mjs`, now integrated in the site. The exact-pole and overhead cases return undefined rather than an arbitrary bearing. Rounds 1 and 2 were subsequently re-queried and are now reproducible against the shipped `data/ephemeris-year.json` cache. Exact queries and raw NASA responses are saved in `data/validation-rounds-raw.json`; references are in `tests/validation-rounds.json`. Run `node tests/validation-rounds.test.mjs`. Round 3 is also saved and rerunnable.

## Round 1 (00:00 UTC)

| Site (E lon, lat) | Why chosen | Sun | Earth |
|---|---|---|---|
| 23.473, 0.674 | Near side, Apollo 11 | 0.0008 | 0.0057 |
| 0, -89 | South polar | 0.0007 | 0.0004 |
| 85, 0 | Earth near the horizon | 0.0008 | 0.0059 |

## Round 2 (07:30 UTC)

| Site (E lon, lat) | Why chosen | Body | Elevation | Azimuth (on the sky) |
|---|---|---|---|---|
| 0, 0 | Sub-Earth region | Sun | 0.0008 | 0.0000 |
| 180, 0 | Far side | Sun | 0.0009 | 0.0000 |
| 180, 0 | Far side | Earth | 0.0033 | 0.0053 |
| 45, -60 | Southern mid-latitude | Earth | 0.0024 | 0.0055 |
| 30, -85 | South polar, near side | Earth | 0.0005 | 0.0059 |
| 150, -88 | South polar, far side | Sun | 0.0007 | 0.0002 |
| 150, -88 | South polar, far side | Earth | 0.0004 | 0.0059 |
| 100, 70 | Northern high latitude, limb | Earth | 0.0020 | 0.0056 |
| 330, -20 | Western near side | Earth | 0.0046 | 0.0038 |

"On the sky" means the azimuth difference multiplied by cos(elevation), so it is a true angular error and does not
blow up near the zenith.

## What this does and does not show

- It shows the smooth-sphere geometry and the Earth-distance correction reproduce Horizons to better than 0.01 degrees
  at these sites and times, including the far side, both polar regions and off-hour times.
- It is 156 samples, not a proof for every location and date. Seven requested series were not retrieved
  (Horizons rate limit): Sun at 45,-60; 270,45; 30,-85; 100,70; 330,-20 and Earth at 0,0; 270,45.
- Rounds 1 and 2 do not test dates outside 2026-11-14 to 2026-12-14. Round 3 adds the two dates below; the full year is not exhaustively validated.
- Real terrain is not modelled. Near the poles, mountains and crater rims move rise and set times far more than any
  error measured here.
- Crossing (rise and set) times are interpolated estimates and were only spot-checked by hand at one site.

## Round 3 — extended-date reproducible checks (Codex)

The current extended cache is `data/ephemeris-year.json`; the original 30-day cache is preserved for older deployed clients.

18 direct NASA comparisons: the same nine retrieved body/site series in Round 2,
now at **2027-04-14 07:30 UTC** and **2027-11-13 07:30 UTC**. Both timestamps
fall between the hourly cache samples. Worst absolute Sun elevation difference:
**0.000836°**; Earth elevation: **0.004531°**; sky-projected azimuth: **0.005382°**.
All are below 0.01° for these samples; this is not an error guarantee elsewhere.

- Query URLs, site coordinates, direct reference angles and retrieval time:
  [tests/horizons-extended.json](tests/horizons-extended.json).
- Complete original NASA responses (JSON keys identify body/site):
  [data/validation-extended-raw.json](data/validation-extended-raw.json).
- Re-fetch references: `python3 scripts/validate_extended.py` (uses existing saved
  responses if present; remove/relocate that raw file to request fresh references).
- Re-run comparisons: `node tests/extended-validation.test.mjs`.

Combined scope: **174 elevation comparisons** (156 re-queried round-1/2 samples + 18
reproducible extended-date samples), with azimuth checked on **108** of them.
Disc-area fractions are analytic approximations for an unobstructed circular disc
above a smooth horizon, not direct-Horizons validation results. Sun angular radius
is fixed at 0.267°; Earth radius uses finite observer distance. Neither terrain
occultation nor eclipses are included. First/last disc contact times are not
implemented: all event labels explicitly refer to center crossings.

## Lunar-cycle and planning-tool checks

Seven additional direct Horizons **illuminated-percentage** references (quantity 10)
cover Nov 14–Dec 14, 2026 at five-day spacing. Worst difference: 0.0000041 percentage
point. These are distinct from the 174 elevation comparisons above. Query, original
response and values are in `tests/lunar-phase-reference.json`.

`node tests/mission.test.mjs` checks new/full/quarter geometric limits, official
calendar coverage, clipped piecewise-linear visibility intervals, catalog coordinate
bounds, obstruction/power limiting cases, and radiative equation balance. The
USNO phase calendar is cached with original responses. No independent validation
of actual terrain, solar-array output or hardware temperature is claimed: the
assumptions and excluded effects are explicit in the estimates tab and SOURCES.md.

## Catalog-wide reproducible checks

An additional **720 elevation comparisons** cover all 15 catalog sites, Sun and Earth, at 24 times (12 dates at 00:00 and 07:30 UTC) from November 19, 2026 through October 15, 2027. Worst sampled differences: Sun **0.000776°**, Earth **0.005444°**, sky-projected azimuth **0.005460°**. These are sampled checks, not a global error bound.

- Raw NASA responses and exact queries: `data/validation-catalog-raw.json`.
- Parsed references: `tests/validation-catalog.json`.
- Re-run: `node tests/validation-catalog.test.mjs`.
- Retrieve references: `python3 scripts/validate_catalog.py` (reuses saved responses).
