import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {createMapGesture} from '../src/gestures.js';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const THREE=await import('../vendor/three.module.js');
const {createGameCamera,positionGameCamera,mapPanDelta}=await import('../src/view.js');
const p=(id,x,y)=>({id,x,y});
test('short taps preselect; a map drag cannot become a tap',()=>{
 const g=createMapGesture();g.down(p(1,100,100));assert.equal(g.move(p(1,103,101)),null);assert.equal(g.up(p(1,103,101)).type,'tap');
 g.down(p(1,100,100));assert.deepEqual(g.move(p(1,120,108)),{type:'pan',dx:20,dy:8});assert.equal(g.up(p(1,120,108)).type,'end');assert.equal(g.size,0);
});
test('hold and slide previews a block; release remains a selection, not a job',()=>{
 const g=createMapGesture();g.down(p(4,100,100));assert.deepEqual(g.hold(),{type:'inspect-start',id:4,x:100,y:100});
 assert.deepEqual(g.move(p(4,120,130)),{type:'inspect-move',id:4,x:120,y:130});assert.equal(g.up(p(4,120,130)).type,'inspect-end');assert.equal(g.size,0);
});
test('pinch emits scale and centroid pan; neither released finger becomes a tap',()=>{
 const g=createMapGesture();g.down(p(1,100,100));assert.equal(g.down(p(2,200,100)).type,'pinch-start');assert.equal(g.hold(),null);
 const delta=g.move(p(2,250,100));assert.equal(delta.type,'pinch');assert.equal(delta.factor,1.5);assert.equal(delta.dx,25);
 assert.equal(g.up(p(2,250,100)).type,'end');assert.equal(g.move(p(1,110,110)).type,'pan');assert.equal(g.up(p(1,110,110)).type,'end');
 g.down(p(3,80,80));assert.equal(g.up(p(3,80,80)).type,'tap');
});
test('cancel/blur during a hold clears all pointers and ignores stale releases',()=>{
 const g=createMapGesture();g.down(p(1,50,50));g.hold();g.cancel();assert.equal(g.size,0);assert.equal(g.up(p(1,50,50)),null);assert.equal(g.move(p(1,70,70)),null);
 g.down(p(2,10,10));assert.equal(g.up(p(2,10,10)).type,'tap');
});
test('the gameplay optical center follows the available phone area and rays remain aligned',()=>{
 const plane=new THREE.Plane(new THREE.Vector3(0,1,0),-.15);
 for(const[width,height,area]of [[390,844,{left:0,right:390,top:175,bottom:650}],[844,390,{left:236,right:832,top:12,bottom:300}],[1112,720,null]]){
  const camera=createGameCamera();positionGameCamera(camera,{width,height,angle:Math.PI*.24,zoom:1.5,pan:{x:.5,z:-.3},playArea:area});
  const optical=camera.position.clone().addScaledVector(camera.getWorldDirection(new THREE.Vector3()),20).project(camera);
  const px=(optical.x*.5+.5)*width,py=(-optical.y*.5+.5)*height;
  assert.ok(Math.abs(px-(area?(area.left+area.right)/2:width/2))<1e-5);assert.ok(Math.abs(py-(area?(area.top+area.bottom)/2:height/2))<1e-5);
  for(const[x,z]of [[0,0],[-3,2],[4,-2]]){const world=new THREE.Vector3(x,.15,z),screen=world.clone().project(camera),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(screen.x,screen.y),camera);const hit=ray.ray.intersectPlane(plane,new THREE.Vector3());assert.ok(hit.distanceTo(world)<1e-7);}
 }
});
test('screen-space pan follows the finger and is reversible at enlarged zoom',()=>{
 const c=createGameCamera(),params={width:390,height:844,angle:Math.PI*.24,zoom:1.6,pan:{x:0,z:0},playArea:{left:0,right:390,top:175,bottom:650}};
 positionGameCamera(c,params);const point=new THREE.Vector3(0,.15,0),before=point.clone().project(c),delta=mapPanDelta(c,params.angle,30,20,844);
 params.pan={x:delta.x,z:delta.z};positionGameCamera(c,params);const after=point.clone().project(c);
 const dx=(after.x-before.x)*390/2,dy=-(after.y-before.y)*844/2;
 assert.ok(Math.abs(dx-30)<5,`pan x ${dx}`);assert.ok(Math.abs(dy-20)<5,`pan y ${dy}`);
 params.pan={x:0,z:0};positionGameCamera(c,params);assert.ok(point.clone().project(c).distanceTo(before)<1e-9);
});
