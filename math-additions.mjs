// AI-assisted (Claude, integrated and guarded by Codex). See VALIDATION.md.
// Validated against direct NASA/JPL Horizons surface-observer output: see VALIDATION.md.
import { RADIUS_KM } from './math.mjs';
const rad = Math.PI / 180;
export const EARTH_RADIUS_KM = 6378.137;
// The Sun's apparent radius seen from the Moon varies between about 0.262 and 0.271 degrees
// over a year. A fixed value is used because the cache does not hold the Sun's distance.
export const SUN_ANGULAR_RADIUS_DEG = 0.267;

/** Compass direction of a body from a site, in degrees clockwise from lunar north (0 = N, 90 = E).
 *  site: {lat, lon}; lon/lat: the body's sub-point on the Moon (east-positive degrees).
 *  Undefined in practice when the body is at the zenith or nadir, or the site is at a pole. */
export function azimuth(site, lon, lat) {
  const p = site.lat * rad, ps = lat * rad, dl = (lon - site.lon) * rad;
  const east = Math.sin(dl) * Math.cos(ps);
  const north = Math.cos(p) * Math.sin(ps) - Math.sin(p) * Math.cos(ps) * Math.cos(dl);
  if (Math.abs(Math.cos(p)) < 1e-10 || Math.hypot(east, north) < 1e-10) return null;
  const a = Math.atan2(east, north) / rad;
  return (a + 360) % 360;
}

/** Apparent radius of Earth's disc, in degrees, at a given Earth distance in km. */
export const earthAngularRadius = distanceKm => Math.asin(EARTH_RADIUS_KM / distanceKm) / rad;

/** How much of a disc clears a smooth horizon.
 *  centerElevation and radius in degrees. Returns state plus the visible fraction of the disc's AREA (0 to 1). */
export function discVisibility(centerElevation, radius) {
  if (centerElevation >= radius) return { state: 'full', fraction: 1 };
  if (centerElevation <= -radius) return { state: 'below', fraction: 0 };
  const x = centerElevation / radius;                       // -1..1, height of the centre in disc radii
  const fraction = 0.5 + (x * Math.sqrt(1 - x * x) + Math.asin(x)) / Math.PI;   // area of a circular segment
  return { state: 'partial', fraction };
}

/** Convenience: direction and disc state for both bodies from one cache row
 *  [timeMs, earthLon, earthLat, sunLon, sunLat, earthDistanceKm] and elevations {sun, earth} from math.mjs. */
export function skyState(site, row, elev) {
  const p=site.lat*rad, q=row[2]*rad, dl=(row[1]-site.lon)*rad;
  const projected=Math.sin(p)*Math.sin(q)+Math.cos(p)*Math.cos(q)*Math.cos(dl);
  const earthDistance=Math.sqrt(row[5]**2+RADIUS_KM**2-2*row[5]*RADIUS_KM*projected);
  const earthRadius=earthAngularRadius(earthDistance);
  return {
    sun: { azimuth: azimuth(site, row[3], row[4]), ...discVisibility(elev.sun, SUN_ANGULAR_RADIUS_DEG) },
    earth: { azimuth: azimuth(site, row[1], row[2]), radius: earthRadius, ...discVisibility(elev.earth, earthRadius) },
  };
}
