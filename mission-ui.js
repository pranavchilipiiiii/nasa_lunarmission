// Team-requested cycle, comparison and simplified mission scenarios.
import {atTime,elevations,series,nextCrossing} from './math.mjs';
import {skyState} from './math-additions.mjs';
import {lunarCycle,illuminatedFraction,visibilityWindows,simpleEstimates,duration,DAY_MS} from './mission.mjs';
import {renderPhaseMoon} from './phase-moon.js';
const $=id=>document.getElementById(id);
const stamp=t=>new Date(t).toISOString().slice(0,16).replace('T',' ')+' UTC';
const coord=s=>`${Math.abs(s.lat).toFixed(2)}° ${s.lat<0?'S':'N'}, ${Math.abs(s.lon).toFixed(2)}° ${s.lon<0?'W':'E'}`;
let state,callbacks,phases=[],catalog=[],active='cycle',alternative=null,offset=7,initialized=false;
const settings=()=>({horizon:$('assumed-horizon').validity.valid?Number($('assumed-horizon').value):0,area:Number($('panel-area').value),efficiency:Number($('panel-efficiency').value)});
const hours=n=>`${n.toFixed(1)} h`;
export function setupMissionTools(api){
 callbacks=api;
 document.querySelectorAll('[data-tool]').forEach(button=>{
  button.addEventListener('click',()=>{active=button.dataset.tool;document.querySelectorAll('[data-tool]').forEach(b=>{const selected=b===button;b.setAttribute('aria-selected',selected);b.tabIndex=selected?0:-1;});document.querySelectorAll('[data-tool-panel]').forEach(p=>p.hidden=p.dataset.toolPanel!==active);render();});
  button.addEventListener('keydown',e=>{const buttons=[...document.querySelectorAll('[data-tool]')],i=buttons.indexOf(button);let next;if(e.key==='ArrowRight')next=(i+1)%buttons.length;if(e.key==='ArrowLeft')next=(i+buttons.length-1)%buttons.length;if(e.key==='Home')next=0;if(e.key==='End')next=buttons.length-1;if(next!==undefined){e.preventDefault();buttons[next].click();buttons[next].focus();}});
 });
 $('site-catalog').addEventListener('change',e=>{const site=catalog[Number(e.target.value)];if(e.target.value!==''&&site){callbacks.selectSite(site);callbacks.focusSite();}});
 $('phase-events').addEventListener('click',e=>{const button=e.target.closest('[data-phase-time]');if(button&&!button.disabled){callbacks.pause();callbacks.setTime(Number(button.dataset.phaseTime));}});
 const applyAlternative=()=>{if(!state)return;const value=Date.parse($('alternative-date').value+'Z');if(Number.isFinite(value)&&value>=state.data.rows[0][0]&&value<=state.data.rows.at(-1)[0]){alternative=value;$('compare-error').textContent='';renderCompare();}else{$('compare-error').textContent='Choose an alternative date inside the supported year.';$('alternative-date').value=new Date(altTime()).toISOString().slice(0,16);}};
 $('alternative-date').addEventListener('focus',()=>callbacks.pause());
 $('alternative-date').addEventListener('blur',applyAlternative);
 $('alternative-date').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.target.blur();}});
 document.querySelectorAll('[data-offset]').forEach(b=>b.addEventListener('click',()=>{offset=Number(b.dataset.offset);alternative=null;$('compare-error').textContent='';renderCompare();}));
 $('apply-alternative').addEventListener('click',()=>{callbacks.pause();callbacks.setTime(altTime());});
 $('estimate-assumptions').addEventListener('input',render);
 $('estimate-assumptions').addEventListener('change',render);
 Promise.all([fetch('./data/lunar-phases.json').then(r=>{if(!r.ok)throw Error('Phase calendar unavailable');return r.json()}),fetch('./data/landing-sites.json').then(r=>{if(!r.ok)throw Error('Site catalog unavailable');return r.json()})]).then(([p,c])=>{
  phases=p.events;catalog=c.sites;
  for(const group of [...new Set(catalog.map(s=>s.group))]){const options=document.createElement('optgroup');options.label=group;catalog.forEach((site,i)=>{if(site.group!==group)return;const option=document.createElement('option');option.value=String(i);option.textContent=site.name;options.append(option)});$('site-catalog').append(options)}
  $('catalog-source').href=c.source;render();
 }).catch(error=>{$('phase-name').textContent='Additional calendar/catalog data unavailable';console.warn(error)});
}
export function updateMissionTools(next){
 state=next;
 if(!initialized){const first=new Date(state.data.rows[0][0]).toISOString().slice(0,16),last=new Date(state.data.rows.at(-1)[0]).toISOString().slice(0,16);$('alternative-date').min=first;$('alternative-date').max=last;initialized=true;}
 $('mission-context').textContent=`${coord(state.site)} · ${stamp(state.time)}`;
 const selected=catalog.findIndex(s=>Math.abs(s.lat-state.site.lat)<.001&&Math.abs(s.lon-state.site.lon)<.001);$('site-catalog').value=selected<0?'':String(selected);
 render();
}
function render(){if(!state)return;if(active==='cycle')renderCycle();if(active==='horizon')renderHorizon();if(active==='windows')renderWindows();if(active==='dates')renderCompare();if(active==='estimates')renderEstimates();}
function renderCycle(){
 const cycle=lunarCycle(phases,state.time);if(!cycle)return;
 const fraction=illuminatedFraction(state.row);
 renderPhaseMoon($('phase-picture'),state.row,`${cycle.name}, approximately ${(fraction*100).toFixed(1)} percent illuminated`);
 $('phase-name').textContent=cycle.name;$('phase-fraction').textContent=`≈${(fraction*100).toFixed(1)}% illuminated`;
 $('phase-age').textContent=`${cycle.ageDays.toFixed(1)} Earth days since new Moon · this cycle ${cycle.periodDays.toFixed(2)} days`;
 $('phase-progress').value=cycle.progress*100;
 const first=state.data.rows[0][0],last=state.data.rows.at(-1)[0];
 $('phase-events').innerHTML=cycle.next.map(e=>`<button data-phase-time="${e.time}" ${e.time<first||e.time>last?'disabled':''}><strong>${e.phase}</strong><span>${stamp(e.time)}</span><small>in ${duration(e.time-state.time)}</small></button>`).join('');
}
function renderHorizon(){
 const value=elevations(state.site,state.row),sky=skyState(state.site,state.row,value),h=settings().horizon;
 const x=a=>40+a/360*640,y=e=>35+(90-e)/120*220;let body='';
 for(const elevation of [-30,0,30,60,90])body+=`<line x1="40" x2="680" y1="${y(elevation)}" y2="${y(elevation)}" stroke="${elevation===0?'#bdcad9':'#263548'}" stroke-dasharray="${elevation===0?'6 4':'0'}"/><text x="30" y="${y(elevation)+4}" text-anchor="end">${elevation}°</text>`;
 for(const [a,label] of [[0,'N'],[90,'E'],[180,'S'],[270,'W'],[360,'N']])body+=`<text x="${x(a)}" y="279" text-anchor="middle">${label} ${a}°</text>`;
 body+=`<rect x="40" y="${y(0)}" width="640" height="${y(-30)-y(0)}" fill="#8793a7" opacity=".07"/>`;
 if(h>0)body+=`<rect x="40" y="${y(h)}" width="640" height="${y(0)-y(h)}" fill="#ffbd4a" opacity=".12"/><line x1="40" x2="680" y1="${y(h)}" y2="${y(h)}" stroke="#ffbd4a" stroke-dasharray="3 5"/>`;
 for(const [key,label,color] of [['sun','Sun','#ffbd4a'],['earth','Earth','#52e4e9']]){const az=sky[key].azimuth;if(az===null)continue;const cx=x(az),cy=y(Math.max(-30,value[key]));body+=`<circle cx="${cx}" cy="${cy}" r="7" fill="${color}"/><text x="${cx<590?cx+12:cx-12}" y="${cy-8}" text-anchor="${cx<590?'start':'end'}" fill="${color}">${label}${value[key]<-30?' ↓':''}</text>`;}
 $('horizon-view').innerHTML=`<svg viewBox="0 0 720 300" role="img" aria-label="Panoramic sky: Sun elevation ${value.sun.toFixed(2)} degrees, Earth elevation ${value.earth.toFixed(2)} degrees. North, east, south and west shown.">${body}</svg>`;
 $('horizon-readings').textContent=`Sun ${value.sun.toFixed(2)}° · Earth ${value.earth.toFixed(2)}° · assumed obstruction ${h.toFixed(1)}°. Dots show centers; sizes are schematic. Bearings are undefined at an exact pole or overhead.`;
}
function renderWindows(){
 const points=series(state.site,state.data.rows),start=state.windowRange.start,end=state.windowRange.end;
 $('window-range').textContent=`${stamp(start)} → ${stamp(end)} · centers above 0°`;
 for(const key of ['sun','earth']){
  const result=visibilityWindows(points,key,start,end),event=nextCrossing(points,state.time,key);
  $(`${key}-hours`).textContent=`${hours(result.hours)} / 720 h`;
  $(`${key}-longest`).textContent=`Longest continuous interval in window: ${hours(result.longestHours)}`;
  $(`${key}-countdown`).textContent=event?`≈${duration(event.time-state.time)} until ${event.rising?'rise':'set'}`:'No further center crossing in the cached year';
  $(`${key}-windows`).innerHTML=result.windows.filter(([,b])=>b>state.time).slice(0,3).map(([a,b])=>`<li>${stamp(a)} → ${stamp(b)}<br><strong>≈${duration(b-a)}</strong>${a===start||b===end?' · clipped at chart boundary':''}</li>`).join('')||'<li>No remaining above-horizon interval in this chart window.</li>';
 }
}
function altTime(){return alternative??Math.min(state.data.rows.at(-1)[0],state.time+offset*DAY_MS);}
function relativeChart(points,start){
 const w=360,h=150,x=t=>30+(t-start)/(30*DAY_MS)*315,y=e=>15+(90-e)/180*105;
 let content='';for(const e of [-90,0,90])content+=`<line x1="30" x2="345" y1="${y(e)}" y2="${y(e)}" stroke="#344356" stroke-dasharray="${e===0?'4 4':'0'}"/><text x="25" y="${y(e)+3}" text-anchor="end">${e}°</text>`;
 for(const [key,color] of [['sun','#ffbd4a'],['earth','#52e4e9']])content+=`<path d="${points.filter((_,i)=>i%3===0||i===points.length-1).map((p,i)=>`${i?'L':'M'}${x(p.time).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>`;
 for(const d of [0,10,20,30])content+=`<text x="${x(start+d*DAY_MS)}" y="142" text-anchor="middle">Day ${d}</text>`;
 return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Sun and Earth elevations during the thirty days following this landing date">${content}</svg>`;
}
function renderCompare(){
 const other=altTime();$('alternative-date').value=new Date(other).toISOString().slice(0,16);
 const cacheEnd=state.data.rows.at(-1)[0],all=series(state.site,state.data.rows),values=[];
 $('alternative-note').textContent=alternative===null&&state.time+offset*DAY_MS>cacheEnd?'The requested date shift extends beyond the cache; B is limited to '+stamp(cacheEnd)+'.':'';
 for(const [i,t] of [state.time,other].entries()){
  const end=Math.min(cacheEnd,t+30*DAY_MS),row=atTime(state.data.rows,t),e=elevations(state.site,row);values.push(e);
  const visible=all.filter(p=>p.time>=t&&p.time<=end);
  if(!visible.length||visible[0].time!==t)visible.unshift({time:t,...e});
  if(visible.at(-1).time<end)visible.push({time:end,...elevations(state.site,atTime(state.data.rows,end))});
  const sun=visibilityWindows(all,'sun',t,end),earth=visibilityWindows(all,'earth',t,end);
  $(`date-${i}-result`).innerHTML=`<h3>${i?'B · Alternative':'A · Selected date'}</h3><p>${stamp(t)}</p><div class="scenario-values"><span class="sun">Sun ${e.sun.toFixed(2)}°</span><span class="earth">Earth ${e.earth.toFixed(2)}°</span></div><div class="relative-chart">${end>t?relativeChart(visible,t):'<p>No post-landing chart coverage at the final cache timestamp.</p>'}</div><p>${end>t?`Sunlight ≈${hours(sun.hours)} · Earth visibility ≈${hours(earth.hours)}`:'Duration estimates unavailable beyond this date.'}</p><small>${end-t<30*DAY_MS?'Coverage ends at the cache boundary; no extrapolation.':'30 days after landing · center above 0°'}</small>`;
 }
 $('date-difference').textContent=`B minus A: Sun elevation ${(values[1].sun-values[0].sun).toFixed(2)}° · Earth elevation ${(values[1].earth-values[0].earth).toFixed(2)}°`;
}
function renderEstimates(){
 const form=$('estimate-assumptions');if(!form.checkValidity()){for(const id of ['estimated-power','estimated-heat','estimated-temperature'])$(id).textContent='—';$('obstruction-result').textContent='Enter a valid obstruction angle, positive panel area, and efficiency from 0% to 100%.';return;}
 const assumptions=settings(),e=elevations(state.site,state.row),estimate=simpleEstimates(e.sun,assumptions),sky=skyState(state.site,state.row,e);
 $('estimated-power').textContent=`≈${estimate.power.toFixed(1)} W`;
 $('estimated-heat').textContent=`≈${estimate.heat.toFixed(1)} W/m²`;
 $('estimated-temperature').textContent=estimate.temperatureK?`≈${estimate.temperatureK.toFixed(0)} K`:'— in shadow';
 const earthClear=e.earth-assumptions.horizon;
 const earthState=earthClear>=sky.earth.radius?'full':earthClear<=-sky.earth.radius?'below':'partial';
 $('obstruction-result').textContent=`With a uniform ${assumptions.horizon.toFixed(1)}° assumed skyline: Sun disc ${estimate.visible===0?'blocked':estimate.visible===1?'clear':`≈${Math.round(estimate.visible*100)}% clear`}; Earth disc ${earthState==='full'?'clear':earthState==='below'?'blocked':'partly clear'}. This is a user-defined obstruction scenario, not measured terrain.`;
}
