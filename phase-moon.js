// Textured Earth-facing phase preview. Geometry follows NASA/JPL subpoint data;
// brightness is illustrative, not calibrated photometry. NASA texture: SOURCES.md.
import * as THREE from 'three';
import {direction} from './math.mjs';
let preview,unavailable=false;
class PhaseMoon {
  constructor(host){
    this.host=host;this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(35,1,.1,20);
    this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.setSize(320,320,false);this.renderer.setClearColor(0,0);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.95;
    const canvas=this.renderer.domElement;canvas.setAttribute('role','img');canvas.style.opacity='0';
    host.replaceChildren(canvas);host.setAttribute('aria-busy','true');
    this.sun=new THREE.DirectionalLight(0xffffff,2.6);this.scene.add(this.sun);
    // A faint visual fill keeps the unlit disc perceptible, without a painted overlay.
    this.scene.add(new THREE.AmbientLight(0xaab6c4,.035));
    const map=new THREE.TextureLoader().load('./assets/moon.jpg',()=>{
      this.ready=true;canvas.style.opacity='1';host.setAttribute('aria-busy','false');this.render();
    },undefined,()=>{host.textContent='Moon texture unavailable';host.setAttribute('aria-busy','false');});
    map.colorSpace=THREE.SRGBColorSpace;
    map.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(1,96,64),new THREE.MeshStandardMaterial({map,roughness:1,metalness:0})));
    canvas.addEventListener('webglcontextrestored',()=>this.render());
  }
  update(row,label){
    this.camera.position.set(...direction(row[2],row[1]).map(v=>v*3.65));
    this.camera.up.set(0,1,0);this.camera.lookAt(0,0,0);
    this.sun.position.set(...direction(row[4],row[3]).map(v=>v*10));
    this.renderer.domElement.setAttribute('aria-label',label+'; textured Moon viewed from Earth, lunar north up');
    this.render();
  }
  render(){if(this.ready)this.renderer.render(this.scene,this.camera);}
}
export function renderPhaseMoon(host,row,label){
  if(unavailable)return;
  try{if(!preview)preview=new PhaseMoon(host);preview.update(row,label);}
  catch(error){unavailable=true;host.textContent='Moon preview unavailable';host.setAttribute('aria-busy','false');console.warn('Phase preview unavailable:',error);}
}
