import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {atTime} from '../math.mjs';
import {illuminatedFraction,lunarCycle,visibilityWindows,simpleEstimates,DAY_MS} from '../mission.mjs';
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
near(illuminatedFraction([0,0,0,0,0,384400]),1);
near(illuminatedFraction([0,0,0,180,0,384400]),0);
near(illuminatedFraction([0,0,0,90,0,384400]),.5);
const rows=[{time:0,sun:-1},{time:3600000,sun:1},{time:7200000,sun:-1}];
const stats=visibilityWindows(rows,'sun',0,7200000);near(stats.hours,1);assert.deepEqual(stats.windows,[[1800000,5400000]]);
near(visibilityWindows(rows,'sun',2700000,4500000).hours,.5);
near(visibilityWindows(rows,'sun',0,7200000,1).hours,0);
const allUp=[{time:0,sun:1},{time:DAY_MS,sun:1}];near(visibilityWindows(allUp,'sun',0,DAY_MS).hours,24);
const p=simpleEstimates(90);near(p.power,1361*.25);near(simpleEstimates(-10).power,0);assert.equal(simpleEstimates(-10).temperatureK,null);near(simpleEstimates(5,{horizon:10}).power,0);
near(simpleEstimates(30,{area:2,efficiency:50}).power,1361*.5);
assert.throws(()=>simpleEstimates(30,{efficiency:200}),RangeError);
const phases=JSON.parse(readFileSync(new URL('../data/lunar-phases.json',import.meta.url))).events;
assert.equal(phases.length,99);assert.ok(phases.every((e,i)=>!i||e.time>phases[i-1].time));
for(const t of ['2026-11-14T00:00:00Z','2027-11-14T00:00:00Z']){const c=lunarCycle(phases,Date.parse(t));assert.ok(c&&c.progress>=0&&c.progress<1&&c.next.length===4);assert.ok(c.periodDays>29&&c.periodDays<30);}
const newMoon=phases.find(e=>e.phase==='New Moon'&&e.time>Date.parse('2026-11-01'));near(lunarCycle(phases,newMoon.time).ageDays,0);
console.log('Passed: phase limits, official phase-calendar coverage, clipped visibility integration, obstruction and solar/thermal assumption limits.');

const cache=JSON.parse(readFileSync(new URL('../data/ephemeris-year.json',import.meta.url)));
const reference=JSON.parse(readFileSync(new URL('./lunar-phase-reference.json',import.meta.url)));
let worst=0;
for(const row of reference.rows){const difference=Math.abs(100*illuminatedFraction(atTime(cache.rows,row.time))-row.percent);worst=Math.max(worst,difference);assert.ok(difference<0.001);}
const sites=JSON.parse(readFileSync(new URL('../data/landing-sites.json',import.meta.url))).sites;
assert.equal(sites.length,15);assert.ok(sites.every(s=>Number.isFinite(s.lat)&&Number.isFinite(s.lon)&&Math.abs(s.lat)<=90&&Math.abs(s.lon)<=180&&s.source.startsWith('https://nssdc.gsfc.nasa.gov/')));
near(.9*5.670374419e-8*p.temperatureK**4,p.heat,1e-6);
console.log('Passed:',reference.rows.length,'NASA illuminated-percentage checks, worst difference',worst,'percentage points; 15 catalog entries; radiative balance.');
