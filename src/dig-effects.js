import * as THREE from 'three';

// Five fixed GPU pools. Strikes recycle slots; there is no per-grain mesh,
// material allocation, or save data. Sand, clods, grass and dust age separately.
export function createDigEffects(){
 const group=new THREE.Group();group.name='excavationDebris';
 const clod=new THREE.BoxGeometry(1,1,1),stone=new THREE.BoxGeometry(1,1,1),grain=new THREE.TetrahedronGeometry(1,0);
 const sprig=new THREE.BufferGeometry();sprig.setAttribute('position',new THREE.Float32BufferAttribute([-.14,0,0,.14,0,0,.08,.8,.05, -.14,0,0,.08,.8,.05,-.13,1,.08, -.08,.1,-.03,.08,.1,-.03,-.35,.62,.02],3));sprig.computeVertexNormals();
 const dustGeometry=new THREE.PlaneGeometry(1,1);
 const dustMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},vertexShader:`attribute float lifeAlpha; varying vec2 dustUV; varying float dustA; void main(){dustUV=uv;dustA=lifeAlpha;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 dustUV;varying float dustA;void main(){vec2 p=dustUV*2.-1.;float d=length(p);float cloud=1.-smoothstep(.15,1.,d);float texture= .8+.2*sin(p.x*11.+p.y*8.)*sin(p.y*17.-p.x*5.);gl_FragColor=vec4(.59,.46,.31,cloud*cloud*texture*dustA*.22);
 #include <tonemapping_fragment>\n #include <colorspace_fragment>}`});
 const palette=[['soil',180,clod,'#ba8060',.042,.85],['stone',80,stone,'#6a8c96',.024,.95],['sand',300,grain,'#e7bb84',.010,.66],['grass',110,sprig,'#79b083',.095,1.05],['dust',28,dustGeometry,null,.34,.85]];
 const temp=new THREE.Object3D(),tint=new THREE.Color();let serial=0;
 const pools=palette.map(([name,capacity,geometry,color,size,duration])=>{
  const material=name==='dust'?dustMaterial:new THREE.MeshStandardMaterial({color,roughness:1,side:name==='grass'?THREE.DoubleSide:THREE.FrontSide,flatShading:true});
  const mesh=new THREE.InstancedMesh(geometry,material,capacity);mesh.count=0;mesh.frustumCulled=false;mesh.castShadow=name==='soil'||name==='stone';mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(mesh);
  let alpha=null;if(name==='dust'){alpha=new THREE.InstancedBufferAttribute(new Float32Array(capacity),1);geometry.setAttribute('lifeAlpha',alpha);}
  const items=Array.from({length:capacity},()=>({life:0,x:0,y:0,z:0,vx:0,vy:0,vz:0,rx:0,ry:0,rz:0,spin:0,size:0,max:1,color:1}));
  return {name,capacity,mesh,items,size,duration,next:0,alpha};
 });
 function emit(s,id,{miner=null,finish=false,fill=false,blast=false}={}){
  const c=s.cells[id];if(!c)return;
  const targetX=id%11-5,targetZ=Math.floor(id/11)-4;
  const worker=miner===null?null:s.miners[miner];let dx=0,dz=1;
  if(worker){dx=targetX-(worker.cell%11-5);dz=targetZ-(Math.floor(worker.cell/11)-4);const length=Math.hypot(dx,dz)||1;dx/=length;dz/=length;}
  const px=targetX-dx*.33,pz=targetZ-dz*.33,py=.15+(c.h+(finish&&!fill?1:0))*.24+.035;
  const grassy=!fill&&(finish?c.h===c.initialH-1:c.h===c.initialH);
  const counts=blast?[42,26,70,10,9]:fill?[7,2,18,0,3]:finish?[18,7,42,grassy?16:3,6]:[9,3,22,grassy?9:0,3];
  pools.forEach((pool,k)=>{for(let i=0;i<counts[k];i++){
   const p=pool.items[pool.next++%pool.capacity],rnd=()=>{serial=(Math.imul(serial+1,1664525)+1013904223)>>>0;return serial/4294967296;};
   const sideways=(rnd()-.5)*1.8,power=blast?2:finish?1.1:.85;
   p.max=p.life=pool.duration*(.7+rnd()*.6);p.x=px+(rnd()-.5)*.18;p.y=py+rnd()*.07;p.z=pz+(rnd()-.5)*.18;
   p.vx=(dx*.16-dz*sideways)*power;p.vz=(dz*.16+dx*sideways)*power;p.vy=(.8+rnd()*1.55)*power;
   if(k===4){p.vx*=.23;p.vz*=.23;p.vy=.16+rnd()*.19;}
   p.size=pool.size*(.6+rnd()*.8);p.rx=rnd()*6;p.ry=rnd()*6;p.rz=rnd()*6;p.spin=(rnd()-.5)*14;p.color=.78+rnd()*.4;
  }});
 }
 function update(s,dt,camera){
  for(const pool of pools){let n=0;
   for(const p of pool.items){if(p.life<=0)continue;p.life=Math.max(0,p.life-dt);if(p.life===0)continue;
    const dust=pool.name==='dust';p.vy-=dt*(dust?.05:5.3);p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
    const x=Math.round(p.x+5),z=Math.round(p.z+4),c=x>=0&&x<11&&z>=0&&z<9?s.cells[z*11+x]:null,floor=c?.h*.24+.16;
    if(!dust&&c&&p.y<floor&&p.vy<0){p.y=floor;p.vy*=-.24;p.vx*=.57;p.vz*=.57;}
    temp.position.set(p.x,p.y,p.z);const t=1-p.life/p.max,fade=Math.min(1,p.life/.2),scale=p.size*(dust?1+t*2.5:Math.sqrt(fade));
    if(dust&&camera){temp.quaternion.copy(camera.quaternion);temp.rotateZ(p.rz);temp.scale.set(scale,scale*.8,scale);pool.alpha.setX(n,Math.sin(Math.PI*t)*fade);}
    else{p.rx+=dt*p.spin;p.rz+=dt*p.spin*.7;temp.rotation.set(p.rx,p.ry,p.rz);temp.scale.set(scale,scale*(pool.name==='soil'?.65:1),scale*.8);}
    temp.updateMatrix();pool.mesh.setMatrixAt(n,temp.matrix);if(!dust){tint.setScalar(p.color);pool.mesh.setColorAt(n,tint);}n++;
   }
   pool.mesh.count=n;pool.mesh.instanceMatrix.needsUpdate=true;if(pool.mesh.instanceColor)pool.mesh.instanceColor.needsUpdate=true;if(pool.alpha)pool.alpha.needsUpdate=true;
  }
 }
 function clear(){for(const p of pools){p.items.forEach(item=>item.life=0);p.mesh.count=0;}}
 return {group,emit,update,clear,stats:()=>Object.fromEntries(pools.map(p=>[p.name,p.mesh.count])),dispose(){for(const p of pools){p.mesh.dispose();p.mesh.geometry.dispose();p.mesh.material.dispose();}}};
}
