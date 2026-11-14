import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {atTime,elevations} from '../math.mjs';
import {azimuth} from '../math-additions.mjs';
const cache=JSON.parse(readFileSync(new URL('../data/ephemeris-year.json',import.meta.url)));
const references=JSON.parse(readFileSync(new URL('./horizons-extended.json',import.meta.url)));
const worst={sun:0,earth:0,azimuthSky:0};let count=0;
for(const c of references.cases)for(const expected of c.rows){
 const row=atTime(cache.rows,Date.parse(expected.time)),value=elevations(c.site,row)[c.body];
 const difference=Math.abs(value-expected.elevation);
 worst[c.body]=Math.max(worst[c.body],difference);
 const actualAz=azimuth(c.site,row[c.body==='sun'?3:1],row[c.body==='sun'?4:2]);assert.notEqual(actualAz,null);
 const azError=Math.abs(((actualAz-expected.azimuth+540)%360)-180)*Math.cos(expected.elevation*Math.PI/180);
 worst.azimuthSky=Math.max(worst.azimuthSky,azError);
 assert.ok(difference<0.01,`${c.body} elevation at ${JSON.stringify(c.site)}, ${expected.time}: ${difference}`);
 assert.ok(azError<0.01,`sky-projected azimuth error: ${azError}`);count++;
}
console.log('Passed',count,'direct NASA comparisons at two extended-range off-hour dates. Worst differences (degrees):',JSON.stringify(worst));
