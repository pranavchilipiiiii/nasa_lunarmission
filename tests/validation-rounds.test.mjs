import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {atTime,elevations} from '../math.mjs';
import {azimuth} from '../math-additions.mjs';

const cache=JSON.parse(readFileSync(new URL('../data/ephemeris-year.json',import.meta.url)));
const fixture=JSON.parse(readFileSync(new URL('./validation-rounds.json',import.meta.url)));
const report={};

for(const [round,cases] of Object.entries(fixture.rounds)){
 const worst={sun:0,earth:0,azimuthSky:0};let count=0;
 for(const c of cases)for(const expected of c.rows){
  const row=atTime(cache.rows,Date.parse(expected.time)),value=elevations(c.site,row)[c.body];
  const difference=Math.abs(value-expected.elevation);
  worst[c.body]=Math.max(worst[c.body],difference);
  const actualAz=azimuth(c.site,row[c.body==='sun'?3:1],row[c.body==='sun'?4:2]);
  if(actualAz!==null&&Number.isFinite(expected.azimuth)){
   const azError=Math.abs(((actualAz-expected.azimuth+540)%360)-180)*Math.cos(expected.elevation*Math.PI/180);
   worst.azimuthSky=Math.max(worst.azimuthSky,azError);
   assert.ok(azError<0.01,`${round} sky-projected azimuth error ${azError} at ${JSON.stringify(c.site)} ${expected.time}`);
  }
  assert.ok(difference<0.01,`${round} ${c.body} elevation error ${difference} at ${JSON.stringify(c.site)} ${expected.time}`);
  count++;
 }
 report[round]={comparisons:count,worst};
}
console.log('Validation rounds checked against the shipped cache:',JSON.stringify(report));
