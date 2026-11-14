// Run from the repo root after copying both files in:  node tests/math-additions.test.mjs
import assert from 'node:assert/strict';
import { azimuth, discVisibility, earthAngularRadius } from '../math-additions.mjs';
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: got ${a}, expected ${b}`);
// Geometry
near(azimuth({ lat: 0, lon: 0 }, 90, 0), 90, 1e-9, 'body due east');
near(azimuth({ lat: 0, lon: 0 }, -90, 0), 270, 1e-9, 'body due west');
near(azimuth({ lat: 0, lon: 0 }, 0, 45), 0, 1e-9, 'body due north');
near(azimuth({ lat: 0, lon: 0 }, 0, -45), 180, 1e-9, 'body due south');
// Direct Horizons samples (QUANTITIES 4, apparent azimuth), 2026-Nov-17 07:30 UTC.
// Sub-points interpolated from the hourly cache at that time.
const row = [0, -5.5611, 0.2824, 86.2745, -1.5533];   // earthLon, earthLat, sunLon, sunLat
near(azimuth({ lat: 0, lon: 0 }, row[3], row[4]), 91.556558, 0.01, 'Sun azimuth at 0E 0N');
near(azimuth({ lat: -85, lon: 30 }, row[1], row[2]), 324.349373, 0.02, 'Earth azimuth at 30E 85S');
// Disc visibility
assert.deepEqual(discVisibility(1, 0.267), { state: 'full', fraction: 1 });
assert.deepEqual(discVisibility(-1, 0.267), { state: 'below', fraction: 0 });
near(discVisibility(0, 0.267).fraction, 0.5, 1e-12, 'half the disc at centre on the horizon');
assert.equal(discVisibility(0.1, 0.267).state, 'partial');
near(earthAngularRadius(384400), 0.9507, 0.001, 'Earth radius at mean distance');
console.log('Passed: azimuth geometry, two NASA azimuth samples, disc visibility, Earth angular radius.');

assert.equal(azimuth({lat:90,lon:0},30,20),null,'compass north undefined at lunar pole');
assert.equal(azimuth({lat:0,lon:0},0,0),null,'azimuth undefined overhead');
near(discVisibility(-0.1,0.267).fraction+discVisibility(0.1,0.267).fraction,1,1e-12,'disc area symmetry');
