// Model geometry checks, independent of the web renderer and texture loading.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.min.js';
import {direction,coordinates} from '../math.mjs';
for(const file of ['moon_lro_web.glb','moon_lro_hd.glb']){
const bytes=readFileSync(new URL('../assets/'+file,import.meta.url));
assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
const length=bytes.readUInt32LE(12),doc=JSON.parse(bytes.toString('utf8',20,20+length));
const binary=bytes.subarray(28+length);
assert.equal(doc.nodes.length,1);assert.equal(doc.nodes[0].mesh,0);
const node=doc.nodes[0];const transform=new THREE.Matrix4();if(node.matrix)transform.fromArray(node.matrix);else transform.compose(new THREE.Vector3(...(node.translation??[0,0,0])),new THREE.Quaternion(...(node.rotation??[0,0,0,1])),new THREE.Vector3(...(node.scale??[1,1,1])));
const primitive=doc.meshes[0].primitives[0];assert.equal(primitive.mode??4,4);
function accessor(index){
 const a=doc.accessors[index],view=doc.bufferViews[a.bufferView],size={SCALAR:1,VEC2:2,VEC3:3}[a.type],width={5122:2,5123:2,5125:4,5126:4}[a.componentType];
 const values=[];for(let i=0;i<a.count;i++)for(let j=0;j<size;j++){
  const offset=(view.byteOffset??0)+(a.byteOffset??0)+i*(view.byteStride??size*width)+j*width;
  let value=a.componentType===5126?binary.readFloatLE(offset):a.componentType===5122?binary.readInt16LE(offset):a.componentType===5123?binary.readUInt16LE(offset):binary.readUInt32LE(offset);
  if(a.normalized)value=a.componentType===5122?Math.max(-1,value/32767):value/65535;values.push(value);
 }return {values,size};
}
const position=accessor(primitive.attributes.POSITION);for(let i=0;i<position.values.length;i+=3){const v=new THREE.Vector3(...position.values.slice(i,i+3)).applyMatrix4(transform);position.values.splice(i,3,v.x,v.y,v.z);}
const uv=accessor(primitive.attributes.TEXCOORD_0),indices=accessor(primitive.indices);
assert.ok(indices.values.length/3<500000);assert.ok(bytes.length<25*1024*1024);
const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(position.values,3));geometry.setIndex(indices.values);
const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());let radius=0;
for(let i=0;i<position.values.length;i+=3)radius=Math.max(radius,Math.hypot(...position.values.slice(i,i+3)));
mesh.scale.setScalar(1/radius);mesh.updateMatrixWorld(true);
for(const [lat,lon] of [[.674,23.473],[0,0],[0,90],[0,-90],[0,179.9],[-89,0],[89,0],[45,45],[-45,-45]]){
 const vector=new THREE.Vector3(...direction(lat,lon));
 const hit=new THREE.Raycaster(vector.clone().multiplyScalar(2),vector.clone().negate()).intersectObject(mesh)[0];assert.ok(hit,`ray hits ${lat}, ${lon}`);
 const result=coordinates(hit.point.toArray());assert.ok(Math.abs(result.lat-lat)<1e-7);assert.ok(Math.abs(result.lon-lon)<1e-7);
 assert.ok(hit.point.length()>.97&&hit.point.length()<=1.00001,'normalized surface radius');
}
// Confirm the north and longitude signs against the asset's equirectangular UV convention.
for(const [u,v,lat,lon] of [[.5,.5,0,0],[.75,.5,0,90],[.5,.05,81,0]]){
 let best=Infinity,index=0;for(let i=0;i<uv.values.length;i+=2){const error=(uv.values[i]-u)**2+(uv.values[i+1]-v)**2;if(error<best){best=error;index=i/2;}}
 const actual=new THREE.Vector3(...position.values.slice(index*3,index*3+3)).normalize(),expected=new THREE.Vector3(...direction(lat,lon));
 assert.ok(actual.angleTo(expected)*180/Math.PI<3,'texture axes align with coordinate convention');
}
console.log(`Passed ${file}: GLB structure, upload size, ${indices.values.length/3} triangles, axis convention and 9 surface-ray coordinate checks including Apollo 11.`);
}
