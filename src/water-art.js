import * as THREE from 'three';
import {getWaterFlow} from './water.js';

// World-space waves meet across tile borders. Advection uses measured solver
// flux, so a closed gate or a settled pond never pretends to be a fast river.
let creekEnvironment=null;
export function setCreekEnvironment(renderer){
 if(creekEnvironment)return;
 const w=128,h=64,pixels=new Uint8Array(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const height=y/(h-1),sky=Math.max(0,Math.sin((height-.5)*Math.PI)),cloud=Math.pow(Math.max(0,Math.sin(x*.052+Math.sin(y*.16))*.5+.5),7)*sky*.16;
  const c=new THREE.Color().setRGB(.21+.35*sky+cloud,.28+.39*sky+cloud,.26+.44*sky+cloud);const i=(y*w+x)*4;pixels[i]=c.r*255;pixels[i+1]=c.g*255;pixels[i+2]=c.b*255;pixels[i+3]=255;
 }
 const panorama=new THREE.DataTexture(pixels,w,h);panorama.mapping=THREE.EquirectangularReflectionMapping;panorama.needsUpdate=true;
 const pmrem=new THREE.PMREMGenerator(renderer);creekEnvironment=pmrem.fromEquirectangular(panorama);pmrem.dispose();panorama.dispose();
}
export function createWaterSurface(){
 const group=new THREE.Group();group.name='flowingCreek';
 const geometry=new THREE.PlaneGeometry(1,1,6,6);geometry.rotateX(-Math.PI/2);
 const flow=new THREE.InstancedBufferAttribute(new Float32Array(198),2),depth=new THREE.InstancedBufferAttribute(new Float32Array(99),1),bank=new THREE.InstancedBufferAttribute(new Float32Array(396),4);
 geometry.setAttribute('creekFlow',flow);geometry.setAttribute('creekDepth',depth);geometry.setAttribute('creekBank',bank);
 const clock={value:0};
 const fieldBytes=new Uint8Array(11*9*4),field=new THREE.DataTexture(fieldBytes,11,9);field.magFilter=field.minFilter=THREE.LinearFilter;field.generateMipmaps=false;
 const material=new THREE.MeshStandardMaterial({color:'#58b7c9',roughness:.24,metalness:.02,transparent:true,opacity:.88,depthWrite:false,envMap:creekEnvironment?.texture||null,envMapIntensity:.45});
 material.onBeforeCompile=shader=>{
  shader.uniforms.creekTime=clock;shader.uniforms.creekField={value:field};
  const declarations='uniform float creekTime; varying vec3 creekWorld; varying vec2 creekUV; varying vec2 creekVelocity; varying float creekD; varying vec4 creekShore;';
  shader.vertexShader=declarations+'\nattribute vec2 creekFlow; attribute float creekDepth; attribute vec4 creekBank;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   creekUV=uv;creekVelocity=creekFlow;creekD=creekDepth;creekShore=creekBank;
   vec3 wp=(modelMatrix*instanceMatrix*vec4(position,1.)).xyz;creekWorld=wp;
   transformed.y+=.003*sin(wp.x*5.3+wp.z*3.7+creekTime*1.4)+.0015*sin(wp.z*12.1-wp.x*4.9-creekTime*2.1);`);
  shader.fragmentShader=declarations+'uniform sampler2D creekField;\n'+`
   float creekNoise(vec2 p){return sin(p.x*1.23+sin(p.y*.93))*sin(p.y*1.71+cos(p.x*.67));}
   vec2 creekRipple(vec2 p,float t){return vec2(.075*cos(p.x*9.+p.y*5.+t*.8)+.032*cos(p.x*21.-p.y*12.-t*1.9),.067*cos(p.y*11.-p.x*4.-t*.9)+.028*sin(p.y*23.+p.x*9.+t*1.7));}
   float creekStreak(vec2 p,vec2 dir){float a=dot(p,dir),b=dot(p,vec2(-dir.y,dir.x));return smoothstep(.955,.995,sin(b*64.+sin(a*9.)*.8))*smoothstep(.45,.85,creekNoise(vec2(a*5.,b*17.))*.5+.5);}
  `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec4 fieldValue=texture2D(creekField,(creekWorld.xz+vec2(5.5,4.5))/vec2(11.,9.));
   vec2 velocity=(fieldValue.rg*255.-128.)/63.5;
   float speed=min(length(velocity),1.4);
   vec2 vel=velocity*.22;
   float phase=fract(creekTime*.16),phaseB=fract(creekTime*.16+.5),blend=1.-abs(phase*2.-1.);
   vec2 p=creekWorld.xz-vel*phase*6.25,pB=creekWorld.xz-vel*phaseB*6.25;
   float wave=mix(creekNoise(pB*3.7+vec2(creekTime*.12,0.)),creekNoise(p*3.7+vec2(creekTime*.12,0.)),blend)*.5+.5;
   float d=smoothstep(.01,.55,fieldValue.b*1.2);
   vec3 shallow=vec3(.10,.43,.50),deep=vec3(.045,.29,.40);
   diffuseColor.rgb=mix(shallow,deep,d)*(1.+.06*(wave-.5));
   vec4 shoreDist=vec4(creekUV.x,1.-creekUV.x,creekUV.y,1.-creekUV.y);
   float shore=dot(1.-smoothstep(vec4(0.),vec4(.055),shoreDist),creekShore);
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.25,.54,.52),min(shore*.45,.5));
   // Short broken streaks, never repeated circles or a tiled scrolling image.
   vec2 dir=speed>.002?normalize(velocity):vec2(1.,0.);
   float streak=mix(creekStreak(pB,dir),creekStreak(p,dir),blend)*smoothstep(.04,.35,speed);
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.80,.94,.91),streak*.38+min(shore*.07*speed,.12));
   diffuseColor.a=mix(.73,.87,d);`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec2 ripple=mix(creekRipple(pB,creekTime),creekRipple(p,creekTime),blend);
   normal=normalize(normal+mat3(viewMatrix)*vec3(ripple.x,0.,ripple.y));`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   float fresnel=pow(1.-max(dot(normal,normalize(vViewPosition)),0.),3.);
   float reflected=.5+.5*sin(p.x*4.6+p.y*3.1+sin(p.y*5.-creekTime*.5));
   outgoingLight=mix(outgoingLight,vec3(.56,.83,.87),fresnel*.33);
   outgoingLight+=vec3(.065,.082,.078)*pow(reflected,8.)*(.45+fresnel);
   #include <opaque_fragment>`);
 };
 material.customProgramCacheKey=()=> 'block-bloom-water-v1';
 const water=new THREE.InstancedMesh(geometry,material,99);water.count=0;water.receiveShadow=true;water.userData.waterTiles=[];group.add(water);
 const fallingGeo=new THREE.PlaneGeometry(.76,1,8,8),fallClock={value:0};
 const fallingMat=new THREE.MeshStandardMaterial({color:'#a4e3e1',transparent:true,opacity:.60,roughness:.18,side:THREE.DoubleSide,depthWrite:false});
 fallingMat.onBeforeCompile=shader=>{shader.uniforms.fallTime=fallClock;shader.vertexShader='varying vec2 fallUV;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfallUV=uv;');shader.fragmentShader='varying vec2 fallUV; uniform float fallTime;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float thread=sin(fallUV.x*49.+sin(fallUV.y*6.-fallTime*4.));
 diffuseColor.a*=smoothstep(0.,.18,fallUV.x)*smoothstep(0.,.18,1.-fallUV.x)*(.45+.4*thread*thread);
 diffuseColor.rgb*=.85+.15*sin(fallUV.y*35.+fallTime*14.+fallUV.x*8.);`);};fallingMat.customProgramCacheKey=()=> 'creek-falls-v09';
 const falls=new THREE.InstancedMesh(fallingGeo,fallingMat,180);falls.count=0;group.add(falls);
 const foamGeo=new THREE.CircleGeometry(1,16);foamGeo.rotateX(-Math.PI/2);
 const foamMat=new THREE.MeshBasicMaterial({color:'#e8f5e4',transparent:true,opacity:.28,depthWrite:false});
 const foam=new THREE.InstancedMesh(foamGeo,foamMat,180);foam.count=0;group.add(foam);
 // A continuous wet bed covers the dry terrain's construction bevels.
 const bedGeo=new THREE.PlaneGeometry(1,1);bedGeo.rotateX(-Math.PI/2);
 const bedMat=new THREE.MeshStandardMaterial({color:'#9caf9c',roughness:1});
 const bed=new THREE.InstancedMesh(bedGeo,bedMat,99);bed.count=0;bed.receiveShadow=true;group.add(bed);
 const pebbleGeo=new THREE.BoxGeometry(1,1,1),pebbleMat=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.65});
 const pebbles=new THREE.InstancedMesh(pebbleGeo,pebbleMat,396);pebbles.count=0;pebbles.receiveShadow=true;group.add(pebbles);
 const dropGeo=new THREE.IcosahedronGeometry(.011,0),dropMat=new THREE.MeshStandardMaterial({color:'#cfdfd5',transparent:true,opacity:.62,roughness:.2,depthWrite:false});
 const drops=new THREE.InstancedMesh(dropGeo,dropMat,540);drops.count=0;group.add(drops);
 const temp=new THREE.Object3D(),smoothFlow=new Float32Array(198);
 const surface=(s,id)=>.15+s.cells[id].h*.24+(s.water[id]||0)/4+.009;
 function update(s,time,dt=0){
  clock.value=fallClock.value=time;const flux=getWaterFlow(s);let n=0,nf=0,nd=0;
  water.userData.waterTiles.length=0;
  for(const c of s.cells){const id=c.id;for(let a=0;a<2;a++){const t=dt>0?1-Math.exp(-dt*8):0;smoothFlow[id*2+a]+=(Math.max(-2,Math.min(2,flux?.[id*2+a]||0))-smoothFlow[id*2+a])*t;fieldBytes[id*4+a]=Math.round(128+smoothFlow[id*2+a]*63.5);}fieldBytes[id*4+2]=Math.round(Math.min(1,(s.water?.[id]||0)/4/1.2)*255);fieldBytes[id*4+3]=255;}
  field.needsUpdate=true;
  for(const c of s.cells){
   const volume=s.water?.[c.id]||0;if(volume<.008)continue;
   const id=c.id,x=id%11,z=Math.floor(id/11),y=surface(s,id),d=volume/4;
   temp.position.set(x-5,y,z-4);temp.rotation.set(0,0,0);temp.scale.set(1,1,1);temp.updateMatrix();water.setMatrixAt(n,temp.matrix);water.userData.waterTiles.push(id);
   temp.position.y=.15+c.h*.24+.006;temp.updateMatrix();bed.setMatrixAt(n,temp.matrix);
   for(let k=0;k<4;k++){const seed=(id+3)*29+k*83,px=Math.sin(seed)*.29,pz=Math.cos(seed*.77)*.28,scale=.068+(seed%7)*.008;temp.position.set(x-5+px,.15+c.h*.24+.018,z-4+pz);temp.scale.set(scale,.025,scale*.73);temp.rotation.y=seed;temp.updateMatrix();pebbles.setMatrixAt(n*4+k,temp.matrix);pebbles.setColorAt(n*4+k,new THREE.Color([0x87b6b7,0xc5d4bb,0x619da7,0xd6be8c][seed%4]));}

   flow.setXY(n,smoothFlow[id*2],smoothFlow[id*2+1]);depth.setX(n,d);
   const neighbors=[x>0?id-1:-1,x<10?id+1:-1,z<8?id+11:-1,z>0?id-11:-1];
   const shore=neighbors.map(j=>j<0||s.water[j]<.008&&.15+s.cells[j].h*.24>=y-.02?1:0);bank.setXYZW(n,...shore);n++;
   for(const j of [x<10?id+1:-1,z<8?id+11:-1]){
    if(j<0||s.water[j]<.008)continue;const difference=y-surface(s,j);if(Math.abs(difference)<.045)continue;
    if((s.gates||[]).some(g=>!g.open&&[g.a,g.b].includes(id)&&[g.a,g.b].includes(j)))continue;
    const axis=j-id===1?0:1,flowRate=Math.abs(smoothFlow[id*2+axis]);if(flowRate<.012)continue;
    const midX=(x+j%11)/2-5,midZ=(z+Math.floor(j/11))/2-4,height=Math.abs(difference),low=Math.min(y,surface(s,j));
    temp.position.set(midX,low+height/2,midZ);temp.rotation.set(0,axis===0?Math.PI/2:0,0);temp.scale.set(1,height,1);temp.updateMatrix();falls.setMatrixAt(nf,temp.matrix);
    temp.position.y=low+.009;temp.rotation.set(0,0,0);temp.scale.set(axis===0?.085:.35,1,axis===0?.35:.085);temp.updateMatrix();foam.setMatrixAt(nf,temp.matrix);
    for(let k=0;k<3;k++){
     const phase=(time*(1.3+flowRate*.4)+id*.618+k*.327)%1,spread=Math.sin(id*7+k*11)*.25,forward=(difference>0?1:-1)*(.02+phase*.20);
     temp.position.set(midX+(axis===0?forward:spread),low+.018+Math.sin(phase*Math.PI)*Math.min(.16,height*.6),midZ+(axis===0?spread:forward));temp.rotation.set(0,0,phase*2);temp.scale.set(.7,1.4*(1-phase)+.3,.7);temp.updateMatrix();drops.setMatrixAt(nd++,temp.matrix);
    }
    nf++;
   }
  }
  water.count=bed.count=n;pebbles.count=n*4;drops.count=nd;falls.count=foam.count=nf;
  for(const attribute of [pebbles.instanceColor,flow,depth,bank,water.instanceMatrix,falls.instanceMatrix,foam.instanceMatrix,bed.instanceMatrix,pebbles.instanceMatrix,drops.instanceMatrix])if(attribute)attribute.needsUpdate=true;
  for(const mesh of [water,falls,foam,bed,pebbles,drops]){mesh.computeBoundingSphere();mesh.computeBoundingBox();}
 }
 return {group,water,update,dispose(){for(const m of [water,falls,foam,bed,pebbles,drops])m.dispose();for(const g of [geometry,fallingGeo,foamGeo,bedGeo,pebbleGeo,dropGeo])g.dispose();for(const m of [material,fallingMat,foamMat,bedMat,pebbleMat,dropMat])m.dispose();field.dispose();}};
}
