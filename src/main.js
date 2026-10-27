import * as THREE from 'three';
import {RoundedBoxGeometry} from '../vendor/RoundedBoxGeometry.js';
import {CARRY_SCALE,createMiner,animateMiner,createCamp,createRock,createAnimal,animateAnimal} from './models.js';
import {createUI} from './ui.js';
import {createFacilities} from './facilities.js';
import {createTerrain} from './terrain.js';
import {createDigEffects} from './dig-effects.js';
import {setCreekEnvironment} from './water-art.js';
import {preloadGarden,setGardenTime} from './garden.js';
import {createGameCamera,positionGameCamera,mapPanDelta} from './view.js';
import {createMapGesture} from './gestures.js';
import {createWorkshopBase} from './workshop-base.js';
import {W,D,STEP,CAMP,PLACE_SECONDS,LEVELS,levelInfo,advanceLevel,actionFor,goalsComplete,walkHeight,xy,neighbors,freshGame,pathTo,workSpot,inspect,command,tick,recall,pose,clone,validSave,upgradeSave} from './logic.js';

import {SAVE_KEY,LEGACY_KEY,loadProgress,saveProgress} from './progress.js';
import {preloadAnimals} from './animals.js';

async function startGame(){
await Promise.all([preloadAnimals(),preloadGarden()]);
document.querySelector('#loading')?.remove();
const SAVE=SAVE_KEY, canvas=document.querySelector('#world');
let state=freshGame(), history=[], selected=null, selectedMiner=null, tool='dig', muted=false, speed=1, hasSave=false, screenshotPaused=false, frame=0, completed=[], saveFailed=false;
try {const saved=loadProgress(localStorage);if(validSave(saved?.state)){state=upgradeSave(saved.state);state.level ||= 1;state.started=false;state.paused=false;history=(saved.history||[]).filter(s=>validSave(s)&&(s.level||1)===state.level).slice(-10).map(upgradeSave);hasSave=true;completed=(saved.completed||[]).filter(id=>LEVELS.some(l=>l.id===id));if(state.won&&!completed.includes(state.level))completed.push(state.level);}muted=(localStorage.getItem(SAVE+'-muted')??localStorage.getItem(LEGACY_KEY+'-muted'))==='true';} catch{}

const cameraPan=new THREE.Vector3(),gesture=createMapGesture();let holdTimer=null,precision=null,pointerTouch=false;const inputStats={taps:0,drags:0,pinches:0,inspections:0,loupeFrames:0};
const phoneLayout=()=>innerWidth<=700||(innerWidth<=1000&&innerHeight<=500)||(matchMedia('(pointer:coarse)').matches&&Math.min(innerWidth,innerHeight)<=700);
function layoutFlags(){document.documentElement.dataset.mobile=String(phoneLayout());document.documentElement.dataset.orientation=innerWidth>innerHeight?'landscape':'portrait';}
layoutFlags();
const loupe=document.createElement('div');loupe.id='touch-loupe';loupe.hidden=true;loupe.innerHTML='<canvas width="224" height="224"></canvas><span>Slide to aim · release to select</span>';
document.querySelector('#game').append(loupe);const loupeCanvas=loupe.querySelector('canvas'),loupeContext=loupeCanvas.getContext('2d');
let visualSeed=42,rngState=42;function rng(){rngState=(Math.imul(1664525,rngState)+1013904223)>>>0;return rngState/4294967296;}
const scene=new THREE.Scene();scene.background=null;scene.fog=new THREE.Fog(0xe8eee7,60,100);
const camera=createGameCamera();
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});}catch(e){document.body.innerHTML='<div style="padding:10vh;color:#244936;font:20px sans-serif">WebGL is unavailable. Enable hardware acceleration and reopen the game.</div>';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;setCreekEnvironment(renderer);
scene.add(new THREE.HemisphereLight(0xf4f5ec,0x79958d,1.5));
const sun=new THREE.DirectionalLight(0xfff2df,2.7);sun.position.set(-8,17,9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-10;sun.shadow.camera.right=10;sun.shadow.camera.top=10;sun.shadow.camera.bottom=-10;sun.shadow.camera.near=1;sun.shadow.camera.far=40;sun.shadow.normalBias=.025;sun.shadow.bias=-.0002;sun.shadow.radius=5;scene.add(sun);
const fill=new THREE.DirectionalLight(0xbce2ed,.65);fill.position.set(12,6,-10);scene.add(fill);
const world=new THREE.Group();scene.add(world);
function material(color,extra={}){return new THREE.MeshStandardMaterial({color,roughness:.94,...extra});}
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:0x52606b,opacity:.16}));ground.rotation.x=-Math.PI/2;ground.position.y=-.62;ground.receiveShadow=true;scene.add(ground);
function mesh(geo,mat,parent=world){const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const foundation=mesh(new RoundedBoxGeometry(W+.23,.45,D+.23,2,.12),material(0xf5e8cd));foundation.position.y=-.34;
const foundationLip=mesh(new RoundedBoxGeometry(W+.27,.08,D+.27,2,.04),material(0xe59579));foundationLip.position.y=-.58;world.add(createWorkshopBase(W,D));
const surface=id=>.15+state.cells[id].h*STEP;
const point=id=>{const {x,z}=xy(id);return new THREE.Vector3(x-(W-1)/2,surface(id),z-(D-1)/2);};
let terrain=null,pickTop;
function rebuildTerrain(){if(terrain){world.remove(terrain.group);terrain.dispose();}terrain=createTerrain(state,visualSeed);pickTop=terrain.pickTop;world.add(terrain.group);}
rebuildTerrain();
// Authored props sit in gameplay space. Every patch can be inspected or excavated.
const rocks=[];let propsLevel=0;
const camp=createCamp();camp.position.copy(point(CAMP));camp.position.z-=.22;camp.userData.tileId=CAMP;world.add(camp);
let animals=[],campAnimals=[],facility=null;
const MINER_SCALE=1.43;
const actors=state.miners.map(m=>{const g=createMiner(m.helmet,m.id);g.scale.setScalar(MINER_SCALE);world.add(g);return g;});
const workerRing=mesh(new THREE.RingGeometry(.27,.33,32),new THREE.MeshBasicMaterial({color:0xe48163,transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}));workerRing.rotation.x=-Math.PI/2;workerRing.visible=false;
const cursor=new THREE.Group();world.add(cursor);
const line=new THREE.LineSegments(new THREE.EdgesGeometry(new RoundedBoxGeometry(.99,.055,.99,1,.04)),new THREE.LineBasicMaterial({color:0xe88265}));cursor.add(line);
const ghost=new THREE.Mesh(new RoundedBoxGeometry(.96,.08,.96,1,.04),new THREE.MeshBasicMaterial({color:0xe88265,transparent:true,opacity:.2,depthWrite:false}));cursor.add(ghost);cursor.visible=false;
const route=new THREE.Group();world.add(route);const routeGeo=new THREE.CircleGeometry(.055,12),routeMat=new THREE.MeshBasicMaterial({color:0xffefb3,transparent:true,opacity:.8,depthWrite:false});
const digEffects=createDigEffects();world.add(digEffects.group);

let audio=null;
function unlockAudio(){if(!audio){const C=window.AudioContext||window.webkitAudioContext;if(C)audio=new C();}if(audio?.state==='suspended')audio.resume().catch(()=>{});}
function note(f,d=.13,v=.035,type='sine',delay=0){if(muted||!audio||state.paused)return;const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+delay;o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*.7,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+d);}
function sound(type){if(type==='strike'){note(155,.08,.025,'triangle');note(650,.035,.012,'square');}else if(type==='step'){note(85,.055,.009,'triangle');}else if(type==='delivery'||type==='collect'){[523,659,784].forEach((f,i)=>note(f,.22,.032,'sine',i*.08));}else if(type==='win'){[523,659,784,1047].forEach((f,i)=>note(f,.4,.045,'sine',i*.12));}else note(420,.06,.018,'sine');}
function save(flushHidden=false){
 if(!state.started||document.hidden&&flushHidden!==true)return;
 try{saveProgress(localStorage,{state,history,completed});saveFailed=false;hasSave=true;}
 catch{if(!saveFailed)ui?.notify('Progress could not be saved. Keep this tab open.');saveFailed=true;}
}
function remember(){history.push(clone(state));if(history.length>10)history.shift();}
function clearSelection(){selected=null;cursor.visible=false;clearRoute();renderUI();}
function clearRoute(){for(const c of [...route.children])route.remove(c);}
let ui;
const actions={
  start(){unlockAudio();state.started=true;state.paused=false;renderUI();canvas.focus({preventScroll:true});save();},
  chooseTool(kind){resetTouch();tool=kind;clearSelection();sound('ui');},
  confirm(){if(selected===null||state.paused||!state.started||state.won)return;const info=selectionInfo(selected);if(!info.valid){ui.notify(info.description);return;}remember();const r=command(state,selected,tool,selectedMiner);if(r.accepted){sound('ui');ui.notify(selectedMiner===null?'Job queued. The crew will share the work.':`Assigned to ${state.miners[selectedMiner].name}${state.miners[selectedMiner].task||state.miners[selectedMiner].carrying?' — next in their queue':' — on the way'}. Select another helper to share the work.`);selected=null;cursor.visible=false;clearRoute();}renderUI();save();},
  cancel(){resetTouch();clearSelection();},
  recall(){if(!state.started||state.paused||state.won)return;remember();recall(state);selected=null;ui.notify('Heading home! The crew will bring every carried neighbor along.');renderUI();save();},
  togglePause(){resetTouch();if(!state.started)return;state.paused=!state.paused;if(state.paused)audio?.suspend().catch(()=>{});else unlockAudio();renderUI();save();},
  undo(){resetTouch();if(!history.length)return;state=history.pop();digEffects.clear();state.started=true;state.paused=false;state.won=false;selected=null;rebuildTerrain();syncWorld(true);ui.notify('Undone. Terrain, water, animals and crew are restored.');renderUI();save();},
  restart(){beginLevel(freshGame(state.level||1));},
  'next-level'(){const next=advanceLevel(state);if(next)beginLevel(next);},
  playLevel(id){if(!Number.isInteger(id)||id<1||id>LEVELS.length)return;if(id===(state.level||1)&&!state.won){actions.start();return;}beginLevel(freshGame(id));},
  toggleSound(){muted=!muted;try{localStorage.setItem(SAVE+'-muted',String(muted));}catch{}unlockAudio();renderUI();},
  toggleSpeed(){speed=speed===1?2:1;renderUI();},
  rotate(d){targetAngle+=d*Math.PI/2;},
  zoom(d){zoomAt(1+d*.15,innerWidth/2,innerHeight/2);},
  fitCamera(){cameraPan.set(0,0,0);zoom=1/phoneScale();aimCamera();const bounds=ui.getPlayArea?.();if(bounds){const points=[];for(const x of [-W/2,W/2])for(const z of [-D/2,D/2])for(const y of [-.6,1.3]){const p=new THREE.Vector3(x,y,z).project(camera);points.push({x:(p.x*.5+.5)*innerWidth,y:(-p.y*.5+.5)*innerHeight});}const xs=points.map(p=>p.x),ys=points.map(p=>p.y),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);zoom*=Math.min((bounds.right-bounds.left-20)/(right-left),(bounds.bottom-bounds.top-16)/(bottom-top),1.3);aimCamera();}renderUI();},
  showHelp(){resetTouch();},selectMiner(id){resetTouch();selectedMiner=id===selectedMiner?null:id;if(selected!==null){cursorAt(selected);showRoute(selected);}renderUI();ui.notify(selectedMiner===null?'Auto crew on. All three helpers share new jobs.':`Selected ${state.miners[selectedMiner].name}. Pick soil or an animal, then confirm. Busy helpers queue jobs.`);},
  closeWin(){renderUI();}
};
function beginLevel(next){
  resetTouch();cameraPan.set(0,0,0);zoom=1.1;state=next;state.started=true;history=[];selected=null;selectedMiner=null;tool='dig';hasSave=true;
  cursor.visible=false;clearRoute();
  digEffects.clear();
  rebuildTerrain();syncWorld(true);renderUI();save();unlockAudio();
  ui.notify(`Level ${String(state.level).padStart(2,'0')} · ${levelInfo(state).name}. Take a look and find your route.`);
}
ui=createUI(actions);
function selectionInfo(id){
  const info=inspect(state,id,tool,selectedMiner),m=selectedMiner===null?null:state.miners[selectedMiner];
  if(!m||['blast'].includes(info.kind)||!info.valid)return info;
  const busy=m.task||m.carrying||m.status==='returning';
  return {...info,title:`${m.name} · ${info.title}`,description:`${busy?'Queued after the current job. ':''}${info.description}`,confirmLabel:info.valid?`Send ${m.name}${busy?' · queued':''}`:info.confirmLabel};
}
function statusText(m){return {idle:m.cell===CAMP?'At HQ':'Ready',walking:'On the way',digging:'Digging',filling:'Filling',collecting:'Picking up',returning:'Going home',settling:'Settling in',building:'Building',gating:'At the gate',pumping:'Pumping'}[m.status]||'Ready';}
function renderUI(){ui.update({level:levelInfo(state),levels:LEVELS,nextLevel:LEVELS[state.level||1]||null,waterGoals:state.waterGoals||[],wheel:state.wheel||null,tools:state.tools||levelInfo(state).tools,facilities:(state.bridgeSlots?.length||0)+(state.gates?.length||0)+(state.blasts?.length||0)+(state.pumps?.length||0),objectivesReady:goalsComplete(state),completed,started:state.started,paused:state.paused,delivered:state.delivered,crewHome:state.miners.filter(m=>m.cell===CAMP&&!m.path.length&&!m.task).length,goal:state.ores.length,selectedMiner,tool,speed,muted,selection:selected===null?null:{...selectionInfo(selected),kind:actionFor(state,selected,tool),count:1},miners:state.miners.map(m=>({...m,phase:m.status,status:statusText(m),queued:state.queue.filter(t=>t.minerId===m.id).length})),canUndo:history.length>0,won:state.won,flowersIntact:state.flowersIntact,dugCount:state.dugCount,hasSave,saveFailed});}
renderUI();
let angle=Math.PI*.24,targetAngle=angle,zoom=1.1;
function resize(){layoutFlags();renderer.setSize(innerWidth,innerHeight,false);aimCamera();}
resize();window.addEventListener('resize',resize);
function phoneScale(){return phoneLayout()&&state.started&&!ui.isSceneView?.()?(innerWidth>innerHeight?.86:1.42):1;}
function aimCamera(){positionGameCamera(camera,{width:innerWidth,height:innerHeight,angle,zoom:zoom*phoneScale(),pan:state.started?cameraPan:{x:0,z:0},playArea:phoneLayout()&&state.started&&!ui.isSceneView?.()?ui.getPlayArea?.():null,started:state.started,sceneView:!!ui.isSceneView?.()});}
aimCamera();
const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();let hover=null;
function pick(e){const r=canvas.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(mouse,camera);const hits=raycaster.intersectObjects([pickTop,camp,...rocks,...animals.filter(g=>g.visible),...(facility?.pickables||[])],true);for(const hit of hits){if(hit.object.userData.waterTiles)return hit.object.userData.waterTiles[hit.instanceId];if(hit.object===pickTop)return hit.instanceId;let node=hit.object;while(node&&node!==world){if(node.userData.tileId!==undefined)return node.userData.tileId;node=node.parent;}}return null;}
function cursorAt(id){if(id===null){cursor.visible=false;return;}cursor.position.copy(point(id));cursor.position.y+=.025;cursor.visible=true;line.material.color.setHex(selected!==null&&!selectionInfo(selected).valid?0xe9a264:0xffd56e);ghost.position.y=selected!==null&&state.cells[id].type==='soil'?(tool==='dig'?-.45:tool==='fill'?STEP:0):0;}
function showRoute(id){clearRoute();if(id===null)return;const kind=actionFor(state,id,tool);if(kind==='blast'){for(const cell of state.blasts.find(b=>b.id===id)?.affected||[]){const outline=new THREE.LineSegments(line.geometry,line.material);outline.position.copy(point(cell));outline.position.y+=.04;route.add(outline);}return;}let best=null;for(const m of state.miners){if(selectedMiner!==null&&m.id!==selectedMiner||m.task)continue;const spot=kind==='move'?{path:pathTo(state,m.cell,id)}:workSpot(state,m.cell,id,kind);if(spot?.path&&(!best||spot.path.length<best.length))best=spot.path;}for(const id of best||[]){const m=new THREE.Mesh(routeGeo,routeMat);m.rotation.x=-Math.PI/2;m.position.copy(point(id));m.position.y+=.025;route.add(m);}}
function canPoint(){return state.started&&!state.paused&&!state.won&&!ui.isSceneView?.()&&!document.querySelector('#ui').dataset.dialog;}
function hideLoupe(){precision=null;loupe.hidden=true;}
function resetTouch(){clearTimeout(holdTimer);gesture.cancel();hideLoupe();}
function panMap(dx,dy){const delta=mapPanDelta(camera,angle,dx,dy,innerHeight);cameraPan.x=THREE.MathUtils.clamp(cameraPan.x+delta.x,-7,7);cameraPan.z=THREE.MathUtils.clamp(cameraPan.z+delta.z,-7,7);aimCamera();}
const groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-.15);
function groundAt(x,y){const rect=canvas.getBoundingClientRect();mouse.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);raycaster.setFromCamera(mouse,camera);return raycaster.ray.intersectPlane(groundPlane,new THREE.Vector3());}
function zoomAt(factor,x,y){const before=groundAt(x,y);zoom=THREE.MathUtils.clamp(zoom*factor,phoneLayout()?.42:.7,phoneLayout()?2.55:1.7);aimCamera();const after=groundAt(x,y);if(before&&after){cameraPan.x=THREE.MathUtils.clamp(cameraPan.x+before.x-after.x,-7,7);cameraPan.z=THREE.MathUtils.clamp(cameraPan.z+before.z-after.z,-7,7);aimCamera();}}
function selectPoint(x,y){if(!canPoint())return;selected=pick({clientX:x,clientY:y});cursorAt(selected);showRoute(selected);renderUI();}
function inspectPoint(x,y){if(!canPoint())return;precision={x,y,id:pick({clientX:x,clientY:y})};cursorAt(precision.id);loupe.hidden=false;loupe.style.left=Math.max(65,Math.min(innerWidth-65,x))+'px';loupe.style.top=Math.max(138,y-24)+'px';loupe.dataset.tile=String(precision.id??'');}
function applyGesture(intent){
 if(!intent)return;
 if(intent.type==='down'){if(pointerTouch)holdTimer=setTimeout(()=>applyGesture(gesture.hold()),320);}
 else if(intent.type==='pinch-start'){clearTimeout(holdTimer);hideLoupe();}
 else if(intent.type==='pan'){inputStats.drags++;clearTimeout(holdTimer);if(pointerTouch)panMap(intent.dx,intent.dy);else targetAngle-=intent.dx*.006;}
 else if(intent.type==='pinch'){inputStats.pinches++;clearTimeout(holdTimer);hideLoupe();panMap(intent.dx,intent.dy);zoomAt(intent.factor,intent.x,intent.y);}
 else if(intent.type==='tap'){inputStats.taps++;clearTimeout(holdTimer);selectPoint(intent.x,intent.y);}
 else if(intent.type==='inspect-start'){inputStats.inspections++;selected=null;renderUI();inspectPoint(intent.x,intent.y);}
 else if(intent.type==='inspect-move')inspectPoint(intent.x,intent.y);
 else if(intent.type==='inspect-end'){const id=precision?.id;hideLoupe();if(canPoint()){selected=id??null;cursorAt(selected);showRoute(selected);renderUI();}}
 else {clearTimeout(holdTimer);hideLoupe();}
}
canvas.addEventListener('pointerdown',e=>{if(e.button!==0||!canPoint())return;e.preventDefault();if(!gesture.size)pointerTouch=e.pointerType!=='mouse'||phoneLayout();canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});unlockAudio();applyGesture(gesture.down({id:e.pointerId,x:e.clientX,y:e.clientY}));});
canvas.addEventListener('pointermove',e=>{if(gesture.has(e.pointerId)){if(!canPoint()){resetTouch();return;}e.preventDefault();applyGesture(gesture.move({id:e.pointerId,x:e.clientX,y:e.clientY}));return;}if(e.pointerType==='mouse'&&canPoint()){hover=pick(e);if(selected===null)cursorAt(hover);}});
canvas.addEventListener('pointerup',e=>{if(gesture.has(e.pointerId))applyGesture(gesture.up({id:e.pointerId,x:e.clientX,y:e.clientY}));});
canvas.addEventListener('pointercancel',resetTouch);
canvas.addEventListener('lostpointercapture',e=>{if(gesture.has(e.pointerId))resetTouch();});
canvas.addEventListener('contextmenu',e=>{if(phoneLayout())e.preventDefault();});
window.addEventListener('blur',resetTouch);
canvas.addEventListener('pointerleave',()=>{if(!gesture.size&&selected===null)cursor.visible=false;});
canvas.addEventListener('wheel',e=>{e.preventDefault();zoomAt(Math.exp(-e.deltaY*.001),e.clientX,e.clientY);},{passive:false});
window.addEventListener('keydown',e=>{if(e.target.closest?.('input,textarea,select,[contenteditable]')||e.target.closest?.('button')&&['Enter',' '].includes(e.key))return;const k=e.key.toLowerCase();if(ui.isSceneView?.()&&!['q','e'].includes(k))return;if(k==='escape')selected!==null?clearSelection():actions.togglePause();else if(k===' '){e.preventDefault();actions.togglePause();}else if(k==='enter')actions.confirm();else if(k==='z'&&(e.ctrlKey||e.metaKey)){e.preventDefault();actions.undo();}else if(k==='q')actions.rotate(-1);else if(k==='e')actions.rotate(1);else if(['1','2','3','4','5'].includes(k))actions.chooseTool(['dig','collect','move','facility','fill'][+k-1]);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)resetTouch();if(document.hidden&&state.started&&!state.won){state.paused=true;audio?.suspend().catch(()=>{});renderUI();save(true);}});window.addEventListener('pagehide',()=>save());

const labels=document.createElement('div');labels.id='world-labels';labels.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:2';document.querySelector('#game').append(labels);
let markers=[],facilityMarkers=[];
const markerStyle='position:absolute;pointer-events:auto;transform:translate(-50%,-100%)';
function label(name,id,onClick){const el=document.createElement('button');el.type='button';el.className='world-marker';el.textContent=name;el.setAttribute('aria-label',name);el.style.cssText=markerStyle;el.addEventListener('click',()=>{if(!state.started||state.paused||state.won||ui.isSceneView?.()||document.querySelector('#ui').dataset.dialog)return;onClick?.();if(!onClick){selected=id;cursorAt(selected);showRoute(selected);renderUI();}});labels.append(el);return el;}
function markerPin(el,kind,name,paw){
 el.classList.add(kind);el.title=name;
 el.innerHTML=paw?'<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="6" cy="8" rx="2.2" ry="3"/><ellipse cx="11" cy="5" rx="2.2" ry="3"/><ellipse cx="17" cy="7" rx="2.2" ry="3"/><ellipse cx="21" cy="11" rx="1.7" ry="2.5"/><path d="M5 18c0-4 5-8 8-8s7 5 7 8c0 4-4 2-7 2s-8 2-8-2Z"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 19 9-9m-3-5 8 8M8 6c5-3 9-2 12 2-5-1-8 1-10 4"/></svg>';
 const text=document.createElement('span');text.className='marker-name';text.textContent=name;el.append(text);
}

function releaseAnimal(g){world.remove(g);g.userData.rig?.mixer?.stopAllAction();if(g.userData.rig?.model)g.userData.rig?.mixer?.uncacheRoot(g.userData.rig.model);g.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();});}
function syncWorld(rebuild=false){
 const changed=propsLevel!==(state.level||1);
 if(changed||rebuild){
  for(const g of [...animals,...campAnimals])releaseAnimal(g);for(const el of [...markers,...facilityMarkers.map(m=>m.el)])el.remove();
  if(facility){world.remove(facility.group);facility.dispose();}facility=createFacilities(state);world.add(facility.group);
  animals=levelInfo(state).animals.map((a,i)=>{const g=createAnimal(a.kind);g.rotation.y=.58;g.position.copy(point(a.id));g.userData.tileId=a.id;world.add(g);return g;});
  campAnimals=levelInfo(state).animals.map((a,i)=>{const g=createAnimal(a.kind),many=state.ores.length>2;g.rotation.y=.58;g.scale.setScalar(many?.42:.53);g.position.copy(camp.position).add(camp.userData.cratePosition).add(new THREE.Vector3(many?(i%2-.5)*.30:(i-.5)*.29,.17,many?(Math.floor(i/2)-.5)*.23:(i-.5)*.09));world.add(g);return g;});
  markers=state.ores.map((o,i)=>label(`Inspect ${levelInfo(state).animals[i].name} burrow`,o.id));markers.forEach((el,i)=>markerPin(el,'animal-marker',levelInfo(state).animals[i].name,true));
  facilityMarkers=facility.tags.map(t=>({...t,el:label(t.name,t.id,['goal','wheel'].includes(t.kind)?()=>ui.notify(t.kind==='wheel'?'Flow water past the wheel for 2 seconds to start it.':`${t.name}: hold the target volume for 2 seconds to complete.`):null)}));
  for(const [i,c] of state.cells.filter(c=>c.hydraulic&&c.h>0&&c.type==='soil').entries()){const name=`Canal plug ${String.fromCharCode(65+i)}`;facilityMarkers.push({id:c.id,name,kind:'dig',position:point(c.id).add(new THREE.Vector3(0,.5,0)),el:label(name,c.id)});}
  for(const c of state.cells.filter(c=>c.type==='soil'&&c.initialH>0))facilityMarkers.push({id:c.id,name:'Fill here',kind:'fill',position:point(c.id),el:label(`Fill tile ${c.id+1}`,c.id)});
  for(const t of facilityMarkers){if(['dig','fill'].includes(t.kind))markerPin(t.el,'action-marker',t.name,false);else t.el.classList.add('goal-marker');}
  for(const a of actors)a.userData.poseReady=false;
 }
 const rockIds=state.cells.filter(c=>c.type==='rock').map(c=>c.id).join(',');
 if(changed||rebuild||world.userData.rockIds!==rockIds){for(const g of rocks){world.remove(g);g.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}rocks.length=0;for(const c of state.cells.filter(c=>c.type==='rock')){const g=createRock(c.id,1);g.position.copy(point(c.id));g.userData.tileId=c.id;world.add(g);rocks.push(g);}world.userData.rockIds=rockIds;}
 propsLevel=state.level||1;
 state.ores.forEach((o,i)=>{animals[i].visible=o.state==='raw';animals[i].position.copy(point(o.id));animals[i].scale.setScalar(1);animals[i].rotation.y=.58;campAnimals[i].visible=o.state==='delivered';});
}

syncWorld();
const renderStats=new URLSearchParams(location.search).has('inspect')?document.createElement('output'):null;if(renderStats){renderStats.id='render-stats';renderStats.setAttribute('aria-label','Render diagnostics');renderStats.style.cssText='position:fixed;right:20px;top:85px;z-index:30;white-space:pre;font:11px monospace;color:#4c6656;background:#fff8e8dd;border-radius:9px;padding:9px;pointer-events:none';document.body.append(renderStats);}
const qaReadout=renderStats?document.createElement('output'):null;if(qaReadout){qaReadout.id='qa-state';qaReadout.hidden=true;document.body.append(qaReadout);}
let ambienceTime=state.time,last=performance.now(),accumulator=0,lastUI=0,lastSave=0,frames=[],dtHistory=[];
function event(e){if(['strike','step','collect','delivery','win'].includes(e.type))sound(e.type);if(e.type==='strike')digEffects.emit(state,e.target,{miner:e.miner});if(e.type==='blast'){rebuildTerrain();syncWorld();digEffects.emit(state,e.target,{blast:true});ui.notify('Crew safe. The rock gate is open!');}if(e.type==='water-goal'){sound('delivery');ui.notify(`${e.name} complete! Progress is locked in.`);}if(e.type==='rising')ui.notify('Water is rising. Helpers are moving to a safe bank.');if(e.type==='facility'){sound('delivery');syncWorld();}if(e.type==='dig'||e.type==='fill'){rebuildTerrain();digEffects.emit(state,e.target,{miner:e.miner,finish:true,fill:e.type==='fill'});if(selected!==null){cursorAt(selected);showRoute(selected);}}if(e.type==='collect'||e.type==='delivery')syncWorld();if(e.type==='delivery')ui.notify(`Neighbor home! ${state.delivered}/${state.ores.length}. Bring the whole crew home when ready.`);if(e.type==='blocked')ui.notify('The route changed. Reassign the job, or use Fill to repair the path.');if(e.type==='win'){if(!completed.includes(state.level||1))completed.push(state.level||1);save();renderUI();}}
function animate(now){requestAnimationFrame(animate);const frameDelta=(now-last)/1000,dt=Math.min(frameDelta,.08);last=now;frame++;dtHistory.push(frameDelta*1000);if(dtHistory.length>180)dtHistory.shift();
  if(!screenshotPaused){accumulator+=dt*speed;while(accumulator>=1/60){tick(state,1/60,event);accumulator-=1/60;}}
  if(!state.paused&&!screenshotPaused)ambienceTime+=dt*speed;
  const visualTime=ambienceTime;setGardenTime(visualTime);
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  state.miners.forEach((m,i)=>{
    const g=actors[i],p=pose(state,m),home=m.cell===CAMP&&!m.path.length&&!m.carrying;
    const base=new THREE.Vector3(p.x-(W-1)/2,p.y,p.z-(D-1)/2),desired=base.clone();
    if(home){desired.x+=[-.66,-.05,-.75][i];desired.z+=[.65,1.30,1.35][i];}
    const walkingBack=home&&g.userData.poseReady&&g.position.distanceTo(desired)>.025;
    if(walkingBack){if(!state.paused&&!screenshotPaused)g.position.lerp(desired,1-Math.exp(-dt*7));}else g.position.copy(desired);
    g.userData.poseReady=true;
    let target=null;if(m.path.length)target=point(m.path[0]);else if(m.task)target=point(m.task.target);else if(walkingBack)target=desired;
    if(target){const a=Math.atan2(target.x-g.position.x,target.z-g.position.z);if(!state.paused&&!screenshotPaused)g.rotation.y+=Math.atan2(Math.sin(a-g.rotation.y),Math.cos(a-g.rotation.y))*Math.min(1,dt*12);}else if(home)g.rotation.y=.3;
    const kind=levelInfo(state).animals[state.ores.findIndex(o=>o.state===`carried:${m.id}`)]?.kind;
    const motion={action:state.won?'celebrate':m.path.length||walkingBack?'walking':m.status==='filling'?'digging':m.status,time:['digging','filling','collecting'].includes(m.status)?m.timer:visualTime,walkPhase:walkingBack?visualTime*11:m.walkPhase,progress:m.timer/.9,carrying:m.carrying,carryingKind:kind};
    if(m.status==='settling'&&m.timer<.55){motion.action='walking';motion.walkPhase=visualTime*11;}
    animateMiner(g,motion);
    if(m.status==='settling'){
      const index=state.ores.findIndex(o=>o.state===`carried:${m.id}`),load=g.userData.rig.carrying;
      if(index>=0){
        // Walk beside the pad first. Keep the animal above the palms while
        // crouching, then leave it on the pad as the hands open and withdraw.
        const bed=campAnimals[index].position,approach=smooth(m.timer/.55),drop=smooth((m.timer-.55)/.7),release=smooth((m.timer-1.25)/(PLACE_SECONDS-1.25));
        if(!state.paused&&!screenshotPaused)g.rotation.y+=Math.atan2(Math.sin(.3-g.rotation.y),Math.cos(.3-g.rotation.y))*Math.min(1,dt*12);
        const offset=load.position.clone().multiply(g.scale).applyAxisAngle(new THREE.Vector3(0,1,0),g.rotation.y);
        const standing=new THREE.Vector3(bed.x-offset.x,p.y,bed.z-offset.z);
        g.position.lerpVectors(base,standing,approach);
        const lower=Math.max(0,load.position.y-(bed.y-p.y)/g.scale.y)*drop;
        animateMiner(g,{...motion,lowerBy:lower*(1-release),release});
        if(release>0){g.updateMatrixWorld(true);load.position.copy(g.worldToLocal(bed.clone()));}
        load.scale.setScalar(THREE.MathUtils.lerp(CARRY_SCALE,campAnimals[index].scale.x/MINER_SCALE,drop));
        load.rotation.y=(campAnimals[index].rotation.y-g.rotation.y)*drop;
      }
    }
  });
  facility?.update(state,visualTime,state.paused?0:dt);
  workerRing.visible=selectedMiner!==null&&state.started&&!state.won&&!ui.isSceneView?.();
  if(workerRing.visible){workerRing.position.copy(actors[selectedMiner].position);workerRing.position.y+=.018;}
  animals.forEach((g,i)=>{
    if(g.visible){
      g.position.copy(point(state.ores[i].id));g.scale.setScalar(1);g.rotation.y=.58;
      const picker=state.miners.find(m=>m.status==='collecting'&&m.task?.target===state.ores[i].id);
      if(picker){const actor=actors[picker.id],t=smooth((picker.timer-.5)/1.1);actor.updateMatrixWorld(true);const hand=actor.userData.rig.carrying.getWorldPosition(new THREE.Vector3());g.position.lerp(hand,t);g.scale.setScalar(THREE.MathUtils.lerp(1,CARRY_SCALE*MINER_SCALE,t));g.rotation.y=THREE.MathUtils.lerp(.58,actor.rotation.y,t);}
      animateAnimal(g,{time:visualTime+i*.4,carried:!!picker});
    }
    if(campAnimals[i].visible)animateAnimal(campAnimals[i],{time:visualTime+i*.4,resting:true});
  });
  digEffects.update(state,!screenshotPaused&&!state.paused?dt*speed:0,camera);
  angle+=Math.atan2(Math.sin(targetAngle-angle),Math.cos(targetAngle-angle))*Math.min(1,dt*7);aimCamera();
  const projected=[];
  const projectLabel=(el,p,visible)=>{el.hidden=!state.started||state.won||!visible;if(el.hidden)return;p.project(camera);projected.push({el,x:(p.x*.5+.5)*innerWidth,y:(-p.y*.5+.5)*innerHeight});};
  state.ores.forEach((o,i)=>{const p=point(o.id);p.y+=1.05;projectLabel(markers[i],p,o.state==='raw'&&tool==='collect');});
  for(const t of facilityMarkers){
   if(t.kind==='fill')t.el.title='Fill +1';
   let visible=t.kind==='fill'&&!phoneLayout()&&tool==='fill'&&state.cells[t.id].h<state.cells[t.id].initialH||t.kind==='goal'&&tool==='facility'||!['dig','fill'].includes(t.kind)&&tool==='facility'||t.kind==='dig'&&tool==='dig'&&state.cells[t.id].h>0;
   if(t.kind==='blast'&&!state.blasts.find(b=>b.id===t.id)?.affected.some(id=>state.cells[id].type==='rock'))visible=false;
   const g=state.waterGoals?.find(g=>g.cells[0]===t.id);if(g)t.el.textContent=`${g.name} ${g.done?'✓':`${(g.volume||0).toFixed(1)}m³`}`;
   if(['dig','fill'].includes(t.kind)&&state.miners.some(m=>['digging','filling'].includes(m.status)&&m.task?.target===t.id))visible=false;
   const p=t.position.clone();if(['dig','fill'].includes(t.kind))p.y=surface(t.id)+.5;projectLabel(t.el,p,visible);
  }
  // Keep all visible action labels clickable, including on a narrow game panel.
  const occupied=[];
  for(const item of projected.sort((a,b)=>a.y-b.y)){
   const w=item.el.offsetWidth,h=item.el.offsetHeight;let box;
   outer:for(const dx of [0,-85,85,-170,170])for(const dy of [0,-34,34,-68,68,-102,102,-136,136]){
    const area=phoneLayout()?ui.getPlayArea?.():null;const x=Math.max((area?.left||0)+w/2+10,Math.min((area?.right||innerWidth)-w/2-(area?10:55),item.x+dx)),y=Math.max(h+(area?.top||55),Math.min(area?.bottom||innerHeight-100,item.y+dy));
    box={x,y,l:x-w/2-5,r:x+w/2+5,t:y-h-5,b:y+5};
    if(!occupied.some(p=>box.l<p.r&&box.r>p.l&&box.t<p.b&&box.b>p.t))break outer;
   }
   occupied.push(box);item.el.style.left=`${box.x}px`;item.el.style.top=`${box.y}px`;
  }
  renderer.render(scene,camera);
  if(precision&&!loupe.hidden&&frame%2===0){inputStats.loupeFrames++;const scale=canvas.width/innerWidth,size=60*scale,sx=precision.x*scale-size/2,sy=precision.y*scale-size/2;loupeContext.clearRect(0,0,224,224);loupeContext.drawImage(canvas,sx,sy,size,size,0,0,224,224);}

  if(renderStats&&frame%30===0){const samples=[...dtHistory].sort((a,b)=>a-b);renderStats.textContent=`${renderer.info.render.calls} draws · ${renderer.info.render.triangles.toLocaleString()} triangles\n${renderer.info.memory.geometries} geometries · ${renderer.info.memory.textures} textures\np50 ${samples[Math.floor(samples.length*.5)]?.toFixed(1)}ms · p95 ${samples[Math.floor(samples.length*.95)]?.toFixed(1)}ms\nParticles ${JSON.stringify(digEffects.stats())}`;}
  if(qaReadout&&frame%15===0)qaReadout.textContent=JSON.stringify({inputStats,camera:{pan:{x:cameraPan.x,z:cameraPan.z},zoom:zoom*phoneScale(),angle,mobile:phoneLayout(),gesture:gesture.mode,precisionTile:precision?.id??null},level:state.level,phase:!state.started?'title':state.won?'complete':state.paused?'paused':'active',dugCount:state.dugCount,delivered:state.delivered,crewHome:state.miners.filter(m=>m.cell===CAMP&&!m.path.length&&!m.task).length,selected,tool,canUndo:history.length>0,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,frameMs:dtHistory.reduce((a,b)=>a+b,0)/Math.max(1,dtHistory.length),miners:state.miners.map(m=>({name:m.name,status:m.status,jobs:m.jobs,cell:m.cell,carrying:m.carrying})),waterGoals:state.waterGoals.map(g=>({name:g.name,done:g.done,volume:g.volume})),wheel:state.wheel&&{flow:state.wheel.flow,done:state.wheel.done},particles:digEffects.stats()});
  if(now-lastUI>180){renderUI();lastUI=now;}if(now-lastSave>1800&&state.started&&!state.paused&&!document.hidden){save();lastSave=now;}
}
requestAnimationFrame(animate);

// Diagnostics expose observation and deterministic setup. Player input still uses ray picking + intents.
if(new URLSearchParams(location.search).has('inspect')){
window.__THREE_GAME_DIAGNOSTICS__={renderer:renderer.info,get state(){return {frame,level:state.level||1,completed:[...completed],phase:!state.started?'title':state.won?'complete':state.paused?'paused':'active-play',score:state.delivered,complete:state.won,waterGoals:clone(state.waterGoals||[]),wheel:clone(state.wheel||null),waterTotal:(state.water||[]).reduce((a,b)=>a+b,0),failed:false,dugCount:state.dugCount,crewHome:state.miners.filter(m=>m.cell===CAMP&&!m.path.length).length,miners:clone(state.miners),cells:clone(state.cells),ores:clone(state.ores),queue:clone(state.queue),time:state.time,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,frameMs:dtHistory.reduce((a,b)=>a+b,0)/Math.max(1,dtHistory.length),art:terrain.group.userData.visual,physics:{engine:'grid-height BFS',timestep:1/60,bodies:0},audio:{unlocked:!!audio,muted,state:audio?.state||'not-started'}};}};
window.__THREE_GAME_TEST_HOOKS__={async seed(seed){visualSeed=seed>>>0;rebuildTerrain();return {seed:visualSeed};},async setState(name){if(name==='active-play'){state=freshGame();state.started=true;history=[];}else if(name==='title'){state=freshGame();history=[];}else if(name==='paused'){state=freshGame();state.started=true;state.paused=true;}else throw new Error(`Unknown state ${name}`);selected=null;rebuildTerrain();syncWorld(true);renderUI();return {state:name};},async setPausedForScreenshot(paused){screenshotPaused=!!paused;return {paused:screenshotPaused};},projectCell(id){const p=point(id);p.project(camera);return {x:(p.x*.5+.5)*innerWidth,y:(-p.y*.5+.5)*innerHeight};},snapshot(){return clone(state);}};

}
}
startGame().catch(error=>{console.error(error);const loading=document.querySelector('#loading');if(loading)loading.innerHTML='<strong>The crew could not load</strong><span>Please reload to try again.</span><button onclick="location.reload()">Reload</button>';});
