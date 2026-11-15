import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {atTime,elevations} from '../math.mjs';
import {azimuth} from '../math-additions.mjs';

const cache=JSON.parse(readFileSync(new URL('../data/ephemeris-year.json',import.meta.url)));
const fixture=JSON.parse(readFileSync(new URL('./validation-catalog.json',import.meta.url)));
const worst={sun:0,earth:0,azimuthSky:0};let count=0;const sites=new Set();
for(const c of fixture.cases){
 sites.add(c.name);
 for(const expected of c.rows){
  const row=atTime(cache.rows,Date.parse(expected.time)),value=elevations(c.site,row)[c.body];
  const difference=Math.abs(value-expected.elevation);
  worst[c.body]=Math.max(worst[c.body],difference);
  const actualAz=azimuth(c.site,row[c.body==='sun'?3:1],row[c.body==='sun'?4:2]);
  if(actualAz!==null&&Number.isFinite(expected.azimuth)){
   const azError=Math.abs(((actualAz-expected.azimuth+540)%360)-180)*Math.cos(expected.elevation*Math.PI/180);
   worst.azimuthSky=Math.max(worst.azimuthSky,azError);
   assert.ok(azError<0.02,`sky azimuth error ${azError} at ${c.name} ${expected.time}`);
  }
  assert.ok(difference<0.02,`${c.body} elevation error ${difference} at ${c.name} ${expected.time}`);
  count++;
 }
}
assert.equal(sites.size,15,'expected all 15 catalog sites');
console.log(`Catalog validation: ${count} comparisons across ${sites.size} sites. Worst differences (degrees):`,JSON.stringify(worst));
