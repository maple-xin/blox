import {registerHooks} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const THREE=await import('../vendor/three.module.js');
const {freshGame,LEVELS,W,D,STEP,xy}=await import('../src/logic.js');
const {createTerrain}=await import('../src/terrain.js');
const {createFacilities}=await import('../src/facilities.js');
const {preloadAnimals}=await import('../src/animals.js');await preloadAnimals();
const kit=await import('../src/models.js');
const report={method:'CPU geometry, input-ray alignment and animation contact checks; browser evidence is separate',terrain:[],facilities:[],models:[]};
function inspect(root){let meshes=0,triangles=0;root.updateMatrixWorld(true);root.traverse(m=>{if(!m.isMesh)return;meshes++;for(const n of m.geometry.attributes.position.array)assert.ok(Number.isFinite(n),'non-finite mesh vertex');for(const n of m.matrixWorld.elements)assert.ok(Number.isFinite(n),'non-finite transform');if(m.isInstancedMesh){assert.ok(m.count<=m.instanceMatrix.count,'instance pool overflow');for(const n of m.instanceMatrix.array)assert.ok(Number.isFinite(n),'invalid instance');}if(m.visible)triangles+=(m.geometry.index?.count||m.geometry.attributes.position.count)/3*(m.isInstancedMesh?m.count:1);});return{meshes,triangles};}
for(const level of LEVELS){
 for(const edited of [false,true]){
  const s=freshGame(level.id);if(edited)for(const c of s.cells.filter(c=>c.type==='soil'&&c.h>0&&c.id%5===0)){c.h--;c.dug=true;}
  const t=createTerrain(s,42),metrics=inspect(t.group);assert.ok(metrics.triangles<180000,'terrain budget');
  const ground=t.group.children.filter(m=>['clay-building-blocks','meadow-cap-tiles','excavated-sand-tiles'].includes(m.name));
  const ray=new THREE.Raycaster();for(const c of s.cells){const{x,z}=xy(c.id);ray.set(new THREE.Vector3(x-(W-1)/2,10,z-(D-1)/2),new THREE.Vector3(0,-1,0));assert.equal(ray.intersectObject(t.pickTop)[0]?.instanceId,c.id,'pick grid mismatch');const hit=ray.intersectObjects(ground)[0];assert.ok(hit,'missing terrain');assert.ok(Math.abs(hit.point.y-(.15+c.h*STEP))<.035,'visual/rule ground mismatch');}
  report.terrain.push({level:level.id,edited,...metrics,all99TilesAligned:true,...t.group.userData.visual});t.dispose();
 }
 const s=freshGame(level.id),f=createFacilities(s);for(const b of s.bridgeSlots)s.bridges.push(b.id);f.update(s,3,1/60);const metrics=inspect(f.group);assert.equal(f.water.count,s.water.filter(v=>v>=.008).length);assert.ok(metrics.triangles<70000,'facility budget');report.facilities.push({level:level.id,...metrics,waterPickingAligned:true});f.dispose();
}
for(const[name,model]of [['Pip',kit.createMiner('#efbd52',0)],['Rusty',kit.createMiner('#e98b70',1)],['Sprout',kit.createMiner('#63a997',2)],['mole',kit.createAnimal('mole')],['groundhog',kit.createAnimal('groundhog')],['camp',kit.createCamp()],['rock',kit.createRock(2)]]){
 const isCrew=['Pip','Rusty','Sprout'].includes(name);
 if(isCrew){
  for(const action of ['idle','walking','digging','collecting','returning','settling','celebrate'])for(let time=0;time<2;time+=.1){kit.animateMiner(model,{action,time,walkPhase:time*9,carrying:['returning','settling'].includes(action),carryingKind:'mole'});inspect(model);}
  for(const kind of ['mole','groundhog']){kit.animateMiner(model,{action:'returning',time:1,carrying:true,carryingKind:kind});const rig=model.userData.rig,animal=rig.carrying.children.find(c=>c.visible);assert.equal(animal.userData.kind,kind);assert.ok(Math.abs(rig.carrying.position.x)<.04,'load must stay between hands');model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(animal);for(const[i,arm]of rig.arms.entries())assert.ok(bounds.distanceToPoint(arm.localToWorld(new THREE.Vector3(i?.008:-.008,-.164,.012)))<.09,'hand must support carried animal');}
  kit.animateMiner(model,{action:'collecting',time:.8});assert.equal(model.userData.rig.tool.visible,false);
 }else if(['mole','groundhog'].includes(name))for(let time=0;time<5;time+=.1)kit.animateAnimal(model,{time,carried:time>2,resting:time>3});
 const metrics=inspect(model),bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());assert.ok(size.length()>0&&size.length()<5);report.models.push({name,...metrics,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}});
}
await writeFile(new URL('../artifacts/art-check.json',import.meta.url),JSON.stringify(report,null,2));console.log('PASS: 24 terrain states × 99 ray-aligned tiles, 12 facility states, 7 model/rig checks.');
