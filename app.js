import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import {direction,coordinates,atTime,elevations,series,nextCrossing,chartWindow,validateCache} from './math.mjs';

import {skyState} from './math-additions.mjs';
import {duration} from './mission.mjs';
import {setupMissionTools,updateMissionTools} from './mission-ui.js';

const $ = id => document.getElementById(id);
let data, time, site={lat:-89,lon:0}, pins=[], points=[], playing=false, windowRange;
let scene, camera, renderer, controls, moon, sunlight, selectedMarker, pinMarkers=[], modelRequest=0;
const fmtCoord = s => `${Math.abs(s.lat).toFixed(2)}° ${s.lat<0?'S':'N'} · ${Math.abs(s.lon).toFixed(2)}° ${s.lon<0?'W':'E'}`;
const value = n => {const rounded=Number(n.toFixed(2));return `${rounded>=0?'+':''}${rounded.toFixed(2)}°`;};
const dateString = t => new Date(t).toISOString().slice(0,16).replace('T',' ')+' UTC';
const dayLabel = t => new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(t);

function setupGlobe() {
  try {
    const host=$('globe');
    scene=new THREE.Scene();
    camera=new THREE.PerspectiveCamera(36,1,.1,100); camera.position.set(3.9,.7,.3);
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setClearColor(0,0);
    renderer.outputColorSpace=THREE.SRGBColorSpace; host.append(renderer.domElement);
    controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=true;
    controls.enablePan=false;controls.minDistance=2.25;controls.maxDistance=6;
    controls.rotateSpeed=.6; controls.zoomSpeed=.7;
    const texture=new THREE.TextureLoader().load('./assets/moon.jpg',()=>renderScene()); texture.colorSpace=THREE.SRGBColorSpace;
    moon=new THREE.Mesh(new THREE.SphereGeometry(1,96,64),new THREE.MeshStandardMaterial({map:texture,roughness:1,metalness:0}));scene.add(moon);
    loadMoon(false);
    if(renderer.capabilities.maxTextureSize<8192){$('hd-moon').disabled=true;$('hd-status').textContent='Standard detail · HD needs 8K texture support';}
    scene.add(new THREE.AmbientLight(0xc5d8ec,.28)); sunlight=new THREE.DirectionalLight(0xffffff,3);scene.add(sunlight);
    const gridMaterial=new THREE.LineBasicMaterial({color:0x9bb5cf,transparent:true,opacity:.16});
    function line(vertices){scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(vertices.map(v=>new THREE.Vector3(...v).multiplyScalar(1.003))),gridMaterial));}
    for(let lat=-60;lat<=60;lat+=30)line(Array.from({length:181},(_,i)=>direction(lat,i*2-180)));
    for(let lon=0;lon<360;lon+=30)line(Array.from({length:91},(_,i)=>direction(i*2-90,lon)));
    selectedMarker=makeMarker(0xffffff,.016);scene.add(selectedMarker);
    let down;
    renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});
    renderer.domElement.addEventListener('pointerup',e=>{
      if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
      const rect=renderer.domElement.getBoundingClientRect();
      const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);
      const hit=ray.intersectObject(moon,true)[0];if(hit)selectSite(coordinates(hit.point.toArray()));
    });
    new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}).observe(host);
    renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera)});
  } catch(error){$('globe-error').hidden=false;console.error('Globe unavailable:',error)}
}
function disposeMoon(object){
  object.traverse(child=>{
    if(!child.isMesh)return;
    child.geometry.dispose();
    for(const material of Array.isArray(child.material)?child.material:[child.material]){
      for(const value of Object.values(material))if(value?.isTexture)value.dispose();
      material.dispose();
    }
  });
}
function loadMoon(hd){
  const request=++modelRequest, button=$('hd-moon');
  button.disabled=true;$('hd-status').textContent=hd?'Loading HD · 18.4 MB…':'Loading standard detail…';
  new GLTFLoader().load(hd?'./assets/moon_lro_hd.glb':'./assets/moon_lro_web.glb',gltf=>{
    const model=gltf.scene;
    if(request!==modelRequest){disposeMoon(model);return;}
    model.updateMatrixWorld(true);
    let radius=0;const vertex=new THREE.Vector3();
    model.traverse(object=>{
      if(!object.isMesh)return;
      const positions=object.geometry.attributes.position;
      for(let i=0;i<positions.count;i++)radius=Math.max(radius,vertex.fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld).length());
      for(const material of Array.isArray(object.material)?object.material:[object.material]){material.roughness=1;material.metalness=0;}
    });
    if(!Number.isFinite(radius)||radius<=0){disposeMoon(model);return;}
    // Preserve all decoded node transforms and the geographic origin/axes.
    model.scale.multiplyScalar(1/radius);model.updateMatrixWorld(true);
    const previous=moon;scene.remove(previous);moon=model;scene.add(moon);disposeMoon(previous);
    button.dataset.hd=String(hd);button.textContent=hd?'Use standard Moon':'Load HD Moon · 18.4 MB';
    button.disabled=renderer.capabilities.maxTextureSize<8192;
    $('hd-status').textContent=hd?'HD detail · 8K texture':'Standard detail · 4K texture';
    syncMarkers();renderScene();
  },undefined,error=>{
    if(request!==modelRequest)return;
    console.warn('Moon detail unavailable; keeping the current view.',error);
    button.disabled=renderer.capabilities.maxTextureSize<8192;
    $('hd-status').textContent='Could not load detail. Current Moon remains usable; try again.';
  });
}
$('hd-moon').addEventListener('click',()=>loadMoon($('hd-moon').dataset.hd!=='true'));
function renderScene(){if(renderer&&scene&&camera)renderer.render(scene,camera)}
function makeMarker(color,size=.025){return new THREE.Mesh(new THREE.SphereGeometry(size,16,12),new THREE.MeshBasicMaterial({color}));}
function setPosition(marker,s){
  if(!marker)return;
  const outward=new THREE.Vector3(...direction(s.lat,s.lon));
  const hit=moon&&new THREE.Raycaster(outward.clone().multiplyScalar(2),outward.clone().negate()).intersectObject(moon,true)[0];
  marker.position.copy(outward).multiplyScalar((hit?hit.point.length():1)+.018);
}
function syncMarkers(){
  if(!scene)return;
  setPosition(selectedMarker,site);
  for(const marker of pinMarkers){scene.remove(marker);marker.geometry.dispose();marker.material.dispose()}
  pinMarkers=pins.map((s,i)=>{const marker=makeMarker(i===0?0x52e4e9:0xffbd4a);setPosition(marker,s);scene.add(marker);return marker});
}
function selectSite(s){site={lat:Math.max(-90,Math.min(90,s.lat)),lon:s.lon};$('latitude').value=site.lat.toFixed(3);$('longitude').value=site.lon.toFixed(3);syncMarkers();if(data){points=series(site,data.rows);updateAll(true)}}

function chartSVG(points,current,mini=false,domain,location=site){
  const w=520,h=mini?145:190,pad={l:38,r:15,t:14,b:28},pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;
  const times=[points[0].time,points.at(-1).time];
  const all=points.flatMap(p=>[p.sun,p.earth]);
  let min=domain?.[0]??Math.floor((Math.min(0,...all)-1)/5)*5,max=domain?.[1]??Math.ceil((Math.max(0,...all)+1)/5)*5;
  const tickStep=[1,2,5,10,15,30,45,90].find(step=>step>=(max-min)/4)||90;
  min=Math.max(-90,Math.floor(min/tickStep)*tickStep);max=Math.min(90,Math.ceil(max/tickStep)*tickStep);if(min===max)max=min+tickStep;
  const x=t=>pad.l+(t-times[0])/(times[1]-times[0])*pw,y=n=>pad.t+(max-n)/(max-min)*ph;
  const path=key=>points.filter((_,i)=>i%3===0||i===points.length-1).map((p,i)=>`${i?'L':'M'}${x(p.time).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ');
  let inner='';for(let n=Math.ceil(min/tickStep)*tickStep;n<=max;n+=tickStep){inner+=`<line x1="${pad.l}" x2="${w-pad.r}" y1="${y(n)}" y2="${y(n)}" stroke="#263548" stroke-width=".7"/><text x="${pad.l-7}" y="${y(n)+3}" text-anchor="end">${n}°</text>`;}
  for(let i=0;i<4;i++){const t=times[0]+(times[1]-times[0])*i/3;inner+=`<text x="${x(t)}" y="${h-7}" text-anchor="middle">${dayLabel(t)}</text>`;}
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Sun and Earth elevation over thirty days for ${fmtCoord(location)}. Horizontal dashed line is zero degrees." style="font:10px Arial;fill:#879db5">${inner}<line x1="${pad.l}" x2="${w-pad.r}" y1="${y(0)}" y2="${y(0)}" stroke="#9cacc0" stroke-dasharray="5 5"/><path d="${path('sun')}" fill="none" stroke="#ffbd4a" stroke-width="2.5"/><path d="${path('earth')}" fill="none" stroke="#52e4e9" stroke-width="2.5"/><line x1="${x(current)}" x2="${x(current)}" y1="${pad.t}" y2="${h-pad.b}" stroke="#dbeafa" opacity=".7"/></svg>`;
}
function eventText(event){return event?`${event.rising?'Rise':'Set'} ≈ ${dateString(event.time)} · in ${duration(event.time-time)}`:'No center crossing before '+dayLabel(data.rows.at(-1)[0])+' '+new Date(data.rows.at(-1)[0]).getUTCFullYear();}
function updateAll(rechart=false){
  const row=atTime(data.rows,time),v=elevations(site,row),sky=skyState(site,row,v);
  updateMissionTools({data,time,site,row,windowRange});
  $('site-coordinates').textContent=fmtCoord(site);
  for(const key of ['sun','earth']){
    $(key+'-value').textContent=value(v[key]);
    const near=Math.abs(v[key])<.3;
    const state=sky[key];
    $(key+'-status').textContent=state.state==='full'?'Full disc above modeled horizon':state.state==='below'?'Disc below modeled horizon':`Partial disc · ≈${Math.round(state.fraction*100)}% visible area`;
    $(key+'-status').classList.toggle('near',near||state.state==='partial');
    const az=state.azimuth;
    $(key+'-direction').textContent=az===null?'Direction undefined at pole / overhead':`Bearing ${az.toFixed(1)}° · ${['North','Northeast','East','Southeast','South','Southwest','West','Northwest'][Math.round(az/45)%8]}`;
    $(key+'-event').textContent=eventText(nextCrossing(points,time,key));
  }
  $('date-time').value=new Date(time).toISOString().slice(0,16);
  $('time-slider').value=(time-windowRange.start)/3600000;
  document.querySelectorAll('.ticks span').forEach((el,i)=>el.textContent=dayLabel(windowRange.start+(windowRange.end-windowRange.start)*i/3));
  if(sunlight){sunlight.position.set(...direction(row[4],row[3]).map(v=>v*10));}
  const visiblePoints=points.filter(p=>p.time>=windowRange.start&&p.time<=windowRange.end);
  $('main-chart').innerHTML=chartSVG(visiblePoints,time);
  const allPinPoints=pins.map(s=>series(s,data.rows).filter(p=>p.time>=windowRange.start&&p.time<=windowRange.end));
  const all=allPinPoints.flatMap(a=>a.flatMap(p=>[p.sun,p.earth]));
  const domain=all.length?[Math.max(-90,Math.floor((Math.min(0,...all)-1)/5)*5),Math.min(90,Math.ceil((Math.max(0,...all)+1)/5)*5)]:undefined;
  for(let i=0;i<2;i++){
    const el=$('compare-'+(i?'b':'a'));
    if(!pins[i]){el.classList.add('empty');el.innerHTML=`<span class="pin-letter">${i?'B':'A'}</span><h3>${i?'A second perspective':'Your first location'}</h3><p>${i?'Pin another location<br>to explore the trade-offs.':'Select a place on the Moon,<br>then pin it here.'}</p>`;continue;}
    const pin=pins[i],e=elevations(pin,row);el.classList.remove('empty');
    el.innerHTML=`<h3><span style="color:${i?'#ffbd4a':'#52e4e9'}">●</span> Site ${i?'B':'A'}</h3><p class="coord">${fmtCoord(pin)}</p><div class="mini-values"><span class="sun">☀ ${value(e.sun)}</span><span class="earth">◉ ${value(e.earth)}</span></div><div class="mini-chart">${chartSVG(allPinPoints[i],time,true,domain,pin)}</div><p class="micro">Same time range & elevation scale</p>`;
  }
  $('pin-site').textContent=pins.length===0?'＋ Pin as Site A':pins.length===1?'＋ Pin as Site B':'↻ Replace Site B';
  $('clear-pins').disabled=pins.length===0;
}
function cacheStatus(){return `NASA/JPL Horizons · ${data.rows.length} hourly samples · ${dateString(data.rows[0][0]).slice(0,10)} – ${dateString(data.rows.at(-1)[0]).slice(0,10)} · simplified model`;}
function setTime(t,recenter=true){if(!data||!Number.isFinite(t)||t<data.rows[0][0]||t>data.rows.at(-1)[0])return false;time=t;$('date-error').textContent='';$('date-error').hidden=true;$('load-status').textContent=cacheStatus();if(recenter||!windowRange||t<windowRange.start||t>windowRange.end)windowRange=chartWindow(data.rows,time);updateAll();return true;}
$('coordinates').addEventListener('submit',e=>{e.preventDefault();if(e.currentTarget.reportValidity())selectSite({lat:Number($('latitude').value),lon:Number($('longitude').value)})});
document.querySelectorAll('[data-lat]').forEach(b=>b.addEventListener('click',()=>selectSite({lat:Number(b.dataset.lat),lon:Number(b.dataset.lon)})));
$('reset-view').addEventListener('click',()=>{if(camera){camera.position.set(3.9,.7,.3);controls.target.set(0,0,0);controls.update()}});
function focusSelectedSite(){if(camera){camera.position.set(...direction(Math.max(-85,Math.min(85,site.lat)),site.lon).map(v=>v*3.9));controls.target.set(0,0,0);controls.update()}}
$('focus-site').addEventListener('click',focusSelectedSite);
$('pin-site').addEventListener('click',()=>{if(pins.length<2)pins.push({...site});else pins[1]={...site};syncMarkers();updateAll()});
$('clear-pins').addEventListener('click',()=>{pins=[];syncMarkers();updateAll()});
$('time-slider').addEventListener('input',e=>setTime(windowRange.start+Number(e.target.value)*3600000,false));
function applyDate(){
  const input=$('date-time'),t=Date.parse(input.value+'Z');
  if(!setTime(t)){
    const message=`Choose a UTC date between ${dateString(data.rows[0][0])} and ${dateString(data.rows.at(-1)[0])}. Your previous date was restored.`;
    $('load-status').textContent=message;$('date-error').textContent=message;$('date-error').hidden=false;
    input.value=new Date(time).toISOString().slice(0,16);
  }
}
// Native date inputs emit change while individual month/day/year segments are edited.
// Wait for the complete edit before rejecting an out-of-range intermediate value.
$('date-time').addEventListener('focus',()=>{playing=false;$('play').textContent='▶';$('play').setAttribute('aria-label','Play time animation')});
$('date-time').addEventListener('blur',applyDate);
$('date-time').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.target.blur()}});
const dialog=$('about');$('help').addEventListener('click',()=>dialog.showModal());$('close-help').addEventListener('click',()=>dialog.close());$('sources-link').addEventListener('click',e=>{e.preventDefault();dialog.showModal()});
$('play').addEventListener('click',()=>{playing=!playing;$('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?'Pause time animation':'Play time animation')});
setInterval(()=>{if(playing&&data)setTime(time+3*3600000>data.rows.at(-1)[0]?data.rows[0][0]:time+3*3600000,false)},250);
setupMissionTools({selectSite,focusSite:focusSelectedSite,setTime,pause:()=>{playing=false;$('play').textContent='▶';$('play').setAttribute('aria-label','Play time animation')}});
setupGlobe();
try{
  const response=await fetch('./data/ephemeris-year.json');if(!response.ok)throw new Error(`Data load failed (${response.status})`);data=await response.json();
  if(!validateCache(data.rows))throw new Error('Invalid ephemeris cache');
  time=Math.min(data.rows.at(-1)[0],data.rows[0][0]+10*86400000);windowRange=chartWindow(data.rows,time);
  $('date-time').min=new Date(data.rows[0][0]).toISOString().slice(0,16);$('date-time').max=new Date(data.rows.at(-1)[0]).toISOString().slice(0,16);
  ['date-time','time-slider','play','pin-site'].forEach(id=>$(id).disabled=false);
  $('load-status').textContent=cacheStatus();
  $('query-link').href=data.queryUrl;selectSite(site);
}catch(error){$('load-status').textContent='Could not load the NASA data. Check your connection and refresh to try again.';$('load-status').classList.add('error');$('mission-context').textContent='Mission results unavailable until NASA data loads. Check your connection and refresh.';$('phase-name').textContent='NASA data unavailable';console.error(error)}
