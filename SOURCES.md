# Data, attribution, and AI assistance

## NASA/JPL data
- [Horizons](https://ssd.jpl.nasa.gov/horizons/), [API documentation](https://ssd-api.jpl.nasa.gov/doc/horizons.html), [manual](https://ssd.jpl.nasa.gov/horizons/manual.html).
- `data/horizons-year-raw.txt` preserves the full returned header, table, units, and explanatory footer.
- `data/ephemeris-year.json` contains the exact query URL, retrieval timestamp, column meanings, and 8,761 hourly samples, 2026-11-14 through 2027-11-14 UTC.
- Run `python3 scripts/fetch_data.py` to reproduce. The query uses the Moon as target, Earth center as observer, quantities 14/15 (apparent sub-observer/sub-solar coordinates) and 20 (range, km).

## Model
Smooth reference sphere, radius 1737.4 km. Elevation uses the dot product of a surface normal and the subpoint direction. Earth elevation includes finite-distance surface parallax using each row's actual Earth distance. Directions and distances retain Horizons' apparent/light-time conventions. The simple geometry is a prototype approximation, not an exact terrain or navigation model. Interpolation between hourly samples uses shortest-path longitude interpolation.

See [VALIDATION.md](VALIDATION.md): 156 Claude-reported elevation comparisons across two rounds, plus 18 independently retrieved, reproducible off-hour comparisons at two 2027 dates. Azimuth is now implemented, with checks on 108 of these body/site samples. Combined worst sampled differences are Sun elevation 0.0009°, Earth elevation 0.0059°, and sky-projected azimuth 0.0059°. These are sample results, not a global error bound. Extended-date raw NASA responses and exact query URLs are committed. Analytic disc-area fractions are not covered by these comparisons. Sun angular radius is fixed at 0.267°; Earth angular radius is based on finite observer distance.

No topography, terrain occultation, local slopes, eclipses, radio-link budget, relay coverage, power-system model, or thermal analysis. Elevations and crossing times refer to body centers. Partial-disc area above the smooth horizon is estimated separately; no first/last disc contact times are calculated. No crossing in the cached period does not mean a body never rises/sets. Event dates are interpolated estimates.

## Visual assets and libraries
- Optional HD display: `assets/moon_lro_hd.glb`, Claude conversion of the same team-supplied original; 18.4 MB, 487,578 triangles, 8192×4096 WebP texture, KHR_mesh_quantization. The decoded node translation and scale are preserved before normalizing its outer radius. It is opt-in on every device; the 5.08 MB model stays default. GPU texture support is checked, and the previous model remains usable during loading/failure. Replaced geometry, materials and textures are disposed. Original asset provenance is still awaiting team confirmation.
- Detailed display mesh: `assets/moon_lro_web.glb`, converted by Claude from the team's supplied `Moon_NASA_LRO_8k_Topo.glb`; 121,828 triangles, 4096×2048 WebP color texture, recomputed smooth normals. Original asset download URL/author beyond the LRO filename is still awaiting team confirmation; do not treat the filename alone as verified NASA authorship. The visual mesh is not used for scientific terrain calculations. Its node axes and texture convention match +Y north / +X 0° E / −Z 90° E; tests cover surface picking and size, not landmark survey accuracy. Record the original source before final submission.
- Moon color map: [NASA SVS CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/), NASA/GSFC/Arizona State University; Lunar Reconnaissance Orbiter Camera. Download: `https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg`. This texture does not implement terrain shadows. See [NASA media usage guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/).
- [Three.js](https://threejs.org/) 0.170.0 / r170, MIT. Vendored core, OrbitControls, GLTFLoader, BufferGeometryUtils, and license in `vendor/`. GLTFLoader's utility import is changed to the neighboring local file. Modules import the pinned local core through an import map. No runtime CDN dependency.
- UI uses system fonts and text symbols. No NASA logos or implied NASA endorsement.

## AI assistance
Team MIDAS supplied the rotatable Moon / click-to-card concept. Codex and Claude assisted with research, planning, mockups, code, validation design, and explanatory text. Claude reported data-method comparisons; Codex implemented this starter and automated checks. Team review is required. Screenshots of the running site show computed output; prior AI concept images contain sample values and must remain labeled if reused.
