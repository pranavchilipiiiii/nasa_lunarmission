# Data, attribution, and AI assistance

## NASA/JPL data
- [Horizons](https://ssd.jpl.nasa.gov/horizons/), [API documentation](https://ssd-api.jpl.nasa.gov/doc/horizons.html), [manual](https://ssd.jpl.nasa.gov/horizons/manual.html).
- `data/horizons-raw.txt` preserves the full returned header, table, units, and explanatory footer.
- `data/ephemeris.json` contains the exact query URL, retrieval timestamp, column meanings, and 721 hourly samples, 2026-11-14 through 2026-12-14 UTC.
- Run `python3 scripts/fetch_data.py` to reproduce. The query uses the Moon as target, Earth center as observer, quantities 14/15 (apparent sub-observer/sub-solar coordinates) and 20 (range, km).

## Model
Smooth reference sphere, radius 1737.4 km. Elevation uses the dot product of a surface normal and the subpoint direction. Earth elevation includes finite-distance surface parallax using each row's actual Earth distance. Directions and distances retain Horizons' apparent/light-time conventions. The simple geometry is a prototype approximation, not an exact terrain or navigation model. Interpolation between hourly samples uses shortest-path longitude interpolation.

Claude reported comparison against direct surface-observer results for 3 sites and 11 dates at 00:00 UTC: Sun differences below 0.001 degrees, Earth differences below 0.02 degrees with a mean-distance correction. These are limited collaborator-reported results, not a global error bound. This code uses varying distance from quantity 20 rather than the mean-distance constant; the team should independently recheck it. Azimuth is omitted because it has not been validated. Near-horizon labels indicate sensitivity, not a proven numerical error interval.

No topography, terrain occultation, local slopes, eclipses, radio-link budget, relay coverage, power-system model, or thermal analysis. Earth and Sun centers are used; partial-disc visibility is not modeled. No crossing in the cached period does not mean a body never rises/sets. Event dates are interpolated estimates.

## Visual assets and libraries
- Moon color map: [NASA SVS CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/), NASA/GSFC/Arizona State University; Lunar Reconnaissance Orbiter Camera. Download: `https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg`. This texture does not implement terrain shadows. See [NASA media usage guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/).
- [Three.js](https://threejs.org/) 0.170.0 / r170, MIT. Vendored core, OrbitControls, and license in `vendor/`. OrbitControls imports the pinned local core through an import map. No runtime CDN dependency.
- UI uses system fonts and text symbols. No NASA logos or implied NASA endorsement.

## AI assistance
Team MIDAS supplied the rotatable Moon / click-to-card concept. Codex and Claude assisted with research, planning, mockups, code, validation design, and explanatory text. Claude reported data-method comparisons; Codex implemented this starter and automated checks. Team review is required. Screenshots of the running site show computed output; prior AI concept images contain sample values and must remain labeled if reused.
