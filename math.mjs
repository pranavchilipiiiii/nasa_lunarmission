// AI-assisted implementation. See SOURCES.md for methods, evidence, and limitations.
export const RADIUS_KM = 1737.4;
const rad = Math.PI / 180;
export const wrapLon = n => ((n + 180) % 360 + 360) % 360 - 180;
export function direction(lat, lon) {
  const p = lat * rad, l = lon * rad;
  return [Math.cos(p) * Math.cos(l), Math.sin(p), -Math.cos(p) * Math.sin(l)];
}
export function coordinates([x, y, z]) {
  const length = Math.hypot(x, y, z);
  return { lat: Math.asin(Math.max(-1, Math.min(1, y / length))) / rad,
    lon: wrapLon(Math.atan2(-z, x) / rad) };
}
export function altitude(site, lon, lat, distanceKm = Infinity) {
  const a = direction(site.lat, site.lon), b = direction(lat, lon);
  const sine = Math.max(-1, Math.min(1, a.reduce((v, x, i) => v + x * b[i], 0)));
  // Finite distance: project the observer-to-target vector onto the local zenith.
  return Math.atan2(sine - RADIUS_KM / distanceKm, Math.sqrt(Math.max(0, 1 - sine * sine))) / rad;
}
export function atTime(rows, time) {
  if (time < rows[0][0] || time > rows.at(-1)[0]) throw new RangeError('Date outside cached interval');
  const index = Math.min(rows.length - 2, Math.floor((time - rows[0][0]) / (rows[1][0] - rows[0][0])));
  const a = rows[index], b = rows[index + 1], f = (time - a[0]) / (b[0] - a[0]);
  return a.map((v, i) => i === 0 ? time : i === 1 || i === 3 ? wrapLon(v + wrapLon(b[i] - v) * f) : v + (b[i] - v) * f);
}
export function elevations(site, row) {
  return { sun: altitude(site, row[3], row[4]), earth: altitude(site, row[1], row[2], row[5]) };
}
export function series(site, rows) { return rows.map(row => ({time: row[0], ...elevations(site, row)})); }
export function nextCrossing(points, time, key) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    if ((a[key] >= 0) === (b[key] >= 0) || a[key] === b[key]) continue;
    const when = a.time + (b.time - a.time) * -a[key] / (b[key] - a[key]);
    if (when > time) return {time: when, rising: b[key] > a[key]};
  }
  return null;
}
