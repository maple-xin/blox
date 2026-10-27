import {registerHooks} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const THREE=await import('three');
const {createGameCamera,positionGameCamera}=await import('../src/view.js');
const {preloadGarden}=await import('../src/garden.js');await preloadGarden();
const {createTerrain}=await import('../src/terrain.js');
const {freshGame,W,D,STEP,xy}=await import('../src/logic.js');
const results=[];
for(const level of [1,9]){
 const state=freshGame(level),terrain=createTerrain(state),ray=new THREE.Raycaster();terrain.group.updateMatrixWorld(true);
 for(const [width,height]of [[1280,720],[900,1125],[390,844],[844,390]])for(let turn=0;turn<4;turn++){
  const camera=createGameCamera(),angle=Math.PI*.24+turn*Math.PI/2;
  positionGameCamera(camera,{width,height,angle});assert.ok(camera.isPerspectiveCamera);
  const occluded=[];
  for(const c of state.cells){
   const {x,z}=xy(c.id),point=new THREE.Vector3(x-(W-1)/2,.15+c.h*STEP,z-(D-1)/2).project(camera);
   assert.ok(Math.abs(point.x)<.97&&Math.abs(point.y)<.97,'default camera clips a playable cell');
   ray.setFromCamera(new THREE.Vector2(point.x,point.y),camera);
   const hit=ray.intersectObject(terrain.pickTop,false)[0];assert.ok(hit,'projected ground has no pick hit');
   if(hit.instanceId!==c.id){
    // Raised terrain can physically hide a lower tile. It must be the real
    // higher foreground cell, never a stale orthographic-coordinate mismatch.
    assert.ok(state.cells[hit.instanceId].h>c.h,'a visible cell picks the wrong tile');occluded.push(c.id);
   }
  }
  const dir=new THREE.Vector3(Math.sin(angle),0,Math.cos(angle));
  const across=new THREE.Vector3(Math.cos(angle),0,-Math.sin(angle));
  const widthAt=depth=>{const left=dir.clone().multiplyScalar(depth).addScaledVector(across,-.5),right=left.clone().add(across);return Math.abs(right.project(camera).x-left.project(camera).x);};
  const nearFarRatio=widthAt(4)/widthAt(-4);assert.ok(nearFarRatio>1.1&&nearFarRatio<1.8,'near/far scale should be visible but restrained');
  const landmark=new THREE.Vector3(-3,-.4,-9).project(camera),other=createGameCamera();positionGameCamera(other,{width,height,angle:angle+.3});
  assert.ok(landmark.distanceTo(new THREE.Vector3(-3,-.4,-9).project(other))>.03,'background landmark has no camera parallax');
  results.push({level,width,height,quarterTurn:turn,rays:99,unobstructedCellsPicked:99-occluded.length,physicallyOccludedCells:occluded,nearFarRatio});
 }
 terrain.dispose();
}
await writeFile(new URL('../artifacts/camera-check.json',import.meta.url),JSON.stringify({method:'CPU projection and real terrain ray picking, not a rendered screenshot',views:results},null,2));
console.log(`Camera checks passed: ${results.length} views, 3168 cell rays, real near/far scale and world parallax.`);
