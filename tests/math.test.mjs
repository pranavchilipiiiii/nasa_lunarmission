import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {altitude,coordinates,direction,atTime,elevations,nextCrossing,chartWindow,validateCache} from '../math.mjs';
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
// Independent geometric limits: overhead, antipodal, and the finite-distance horizon.
near(altitude({lat:0,lon:0},0,0),90);
near(altitude({lat:0,lon:0},180,0),-90);
near(altitude({lat:0,lon:0},90,0),0);
near(altitude({lat:0,lon:0},90,0,384400),-Math.atan(1737.4/384400)*180/Math.PI);
for(const s of [{lat:-89,lon:0},{lat:0,lon:85},{lat:42,lon:-170}]){
 const got=coordinates(direction(s.lat,s.lon));near(got.lat,s.lat);near(got.lon,s.lon);
}
const cache=JSON.parse(await readFile(new URL('../data/ephemeris-year.json',import.meta.url)));
assert.equal(cache.rows.length,8761);assert.equal(cache.rows.at(-1)[0]-cache.rows[0][0],365*86400000);
assert.ok(validateCache(cache.rows));assert.ok(!validateCache(cache.rows.slice(0,700)));
const broken=cache.rows.map(r=>[...r]);broken[50][0]+=1;assert.ok(!validateCache(broken));
for(const t of [cache.rows[0][0],Date.parse('2027-04-14T07:30:00Z'),cache.rows.at(-1)[0]]){
 const w=chartWindow(cache.rows,t);assert.equal(w.end-w.start,30*86400000);assert.ok(t>=w.start&&t<=w.end);assert.ok(w.start>=cache.rows[0][0]&&w.end<=cache.rows.at(-1)[0]);
}
const last=atTime(cache.rows,cache.rows.at(-1)[0]);near(last[5],cache.rows.at(-1)[5]);
assert.throws(()=>atTime(cache.rows,cache.rows[0][0]-1),RangeError);
// A longitude seam must interpolate across 0°, not across the far side of the Moon.
const wrapped=atTime([[0,359,0,359,0,384400],[1000,1,0,1,0,384400]],500);near(wrapped[1],0);near(wrapped[3],0);
assert.equal(nextCrossing([{time:0,sun:1},{time:100,sun:1}],0,'sun'),null);
assert.deepEqual(nextCrossing([{time:0,sun:1},{time:100,sun:-1}],0,'sun'),{time:50,rising:false});
// Direct JPL Horizons result cited by Claude for Apollo 11 site, Nov 17 00:00 UTC.
const row=atTime(cache.rows,Date.parse('2026-11-17T00:00:00Z'));
near(elevations({lat:.674,lon:23.473},row).sun,23.36,.02);
console.log('Passed: geometry, finite-distance correction, coordinate picking, data bounds, seam interpolation, crossings, NASA sample regression.');
