// AI-assisted implementation of team-requested planning tools. See SOURCES.md.
import {direction} from './math.mjs';
import {discVisibility,SUN_ANGULAR_RADIUS_DEG} from './math-additions.mjs';
export const DAY_MS=86400000;
export function illuminatedFraction(row){
  const earth=direction(row[2],row[1]),sun=direction(row[4],row[3]);
  return Math.max(0,Math.min(1,(1+earth.reduce((sum,n,i)=>sum+n*sun[i],0))/2));
}
export function lunarCycle(events,time){
  const moons=events.filter(e=>e.phase==='New Moon');
  const previous=moons.filter(e=>e.time<=time).at(-1),next=moons.find(e=>e.time>time);
  if(!previous||!next)return null;
  const progress=(time-previous.time)/(next.time-previous.time);
  const lastPrimary=events.filter(e=>e.time<=time).at(-1);
  const nearby=events.find(e=>Math.abs(e.time-time)<=6*3600000);
  const stage={'New Moon':'Waxing crescent','First Quarter':'Waxing gibbous','Full Moon':'Waning gibbous','Last Quarter':'Waning crescent'};
  return {ageDays:(time-previous.time)/DAY_MS,periodDays:(next.time-previous.time)/DAY_MS,progress,waxing:['New Moon','First Quarter'].includes(lastPrimary?.phase),name:nearby?.phase??stage[lastPrimary?.phase]??'Lunar phase',next:events.filter(e=>e.time>time).slice(0,4)};
}
// Integrate piecewise-linear center elevations exactly within the selected window.
// Returned intervals are clipped at start/end and do not imply crossings outside it.
export function visibilityWindows(points,key,start,end,threshold=0){
  const windows=[];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],left=Math.max(start,a.time),right=Math.min(end,b.time);
    if(right<=left)continue;
    const at=t=>a[key]+(b[key]-a[key])*(t-a.time)/(b.time-a.time)-threshold;
    const x=at(left),y=at(right);let from=left,to=right;
    if(x<=0&&y<=0)continue;
    if(x<=0)from=left+(right-left)*(-x)/(y-x);
    if(y<=0)to=left+(right-left)*x/(x-y);
    if(to<=from)continue;
    const previous=windows.at(-1);
    if(previous&&Math.abs(previous[1]-from)<1)previous[1]=to;else windows.push([from,to]);
  }
  return {windows,hours:windows.reduce((sum,[a,b])=>sum+(b-a)/3600000,0),longestHours:windows.reduce((max,[a,b])=>Math.max(max,(b-a)/3600000),0)};
}
export function simpleEstimates(elevation,{horizon=0,area=1,efficiency=25,absorptivity=.9,emissivity=.9}={}){
  if(![horizon,area,efficiency,absorptivity,emissivity,elevation].every(Number.isFinite)||horizon<0||horizon>30||area<=0||efficiency<0||efficiency>100||absorptivity<0||absorptivity>1||emissivity<=0||emissivity>1)throw new RangeError('Invalid estimate assumptions');
  const visible=discVisibility(elevation-horizon,SUN_ANGULAR_RADIUS_DEG).fraction;
  const incident=1361*Math.max(0,Math.sin(elevation*Math.PI/180))*visible;
  const heat=incident*absorptivity;
  return {incident,power:incident*area*efficiency/100,heat,temperatureK:heat>0?(heat/(emissivity*5.670374419e-8))**.25:null,visible};
}
export function phaseDiscSVG(fraction,waxing=true,label='Moon phase schematic'){
  const points=[],steps=60;
  for(let i=0;i<=steps;i++){const y=-1+2*i/steps,r=Math.sqrt(Math.max(0,1-y*y));points.push([waxing?r:-r,y]);}
  for(let i=steps;i>=0;i--){const y=-1+2*i/steps,r=Math.sqrt(Math.max(0,1-y*y));points.push([(waxing?1:-1)*(1-2*fraction)*r,y]);}
  return `<svg viewBox="0 0 120 120" role="img" aria-label="${label}"><circle cx="60" cy="60" r="51" fill="#111d2c" stroke="#53677c"/><polygon points="${points.map(([x,y])=>`${60+50*x},${60+50*y}`).join(' ')}" fill="#e3e9ef"/></svg>`;
}
export function duration(milliseconds){
  const minutes=Math.max(0,Math.round(milliseconds/60000)),days=Math.floor(minutes/1440),hours=Math.floor(minutes%1440/60),mins=minutes%60;
  return [days?`${days}d`:'',hours?`${hours}h`:'',mins||(!days&&!hours)?`${mins}m`:''].filter(Boolean).join(' ');
}
