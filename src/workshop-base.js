import * as THREE from 'three';
import {RoundedBoxGeometry} from '../vendor/RoundedBoxGeometry.js';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';
// Fitted case corners and a printed workshop nameplate frame the playable grid.
// These stay below/outside the rule surface and never intercept tile picking.
export function createWorkshopBase(w,d){
 const group=new THREE.Group(),parts=[];
 function box(size,color,pos){const source=new RoundedBoxGeometry(...size,1,Math.min(.035,...size.map(n=>n*.18))),geo=source.index?source.toNonIndexed():source;if(geo!==source)source.dispose();geo.deleteAttribute('uv');geo.translate(...pos);const c=new THREE.Color(color),rgb=new Float32Array(geo.attributes.position.count*3);for(let i=0;i<rgb.length;i+=3){rgb[i]=c.r;rgb[i+1]=c.g;rgb[i+2]=c.b;}geo.setAttribute('color',new THREE.Float32BufferAttribute(rgb,3));parts.push(geo);}
 for(const x of [-w/2+.08,w/2-.08])for(const z of [-d/2+.08,d/2-.08]){
  box([.30,.29,.30],'#377e89',[x,-.34,z]);
  box([.12,.035,.12],'#fff3d9',[x,-.175,z]);
 }
 for(const x of [-4.4,-4.14,-3.88])box([.14,.07,.035],'#e28f75',[x,-.30,d/2+.14]);
 for(const x of [3.5,3.76,4.02])box([.13,.07,.035],'#387c83',[x,-.30,d/2+.14]);
 const geo=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.65}));mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const ctx=canvas.getContext('2d');
 ctx.fillStyle='#f8edcf';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#365a63';ctx.font='700 55px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('BLOCK & BLOOM  /  RESCUE KIT',512,66);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const badge=new THREE.Mesh(new THREE.PlaneGeometry(3.5,.25),new THREE.MeshStandardMaterial({map:texture,roughness:.9}));badge.position.set(0,-.31,d/2+.145);group.add(badge);return group;
}
