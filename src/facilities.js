import * as THREE from 'three';
import {RoundedBoxGeometry} from '../vendor/RoundedBoxGeometry.js';
import {STEP,xy} from './logic.js';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';
import {createWaterSurface} from './water-art.js';
export function createFacilities(state){
 const group=new THREE.Group(),ownedGeometries=new Set(),ownedMaterials=new Set(),tags=[],bridges=[],gates=[],pumps=[],blasts=[];
 const color={wood:'#fff0d2',dark:'#337e85',mint:'#eb8d72',brass:'#e7b85d',water:'#50b8c6',iron:'#3d6378'};
 const mat=(c,extra={})=>{const m=new THREE.MeshStandardMaterial({color:c,roughness:.65,...extra});ownedMaterials.add(m);return m;};
 const wood=mat(color.wood),dark=mat(color.dark),mint=mat(color.mint),brass=mat(color.brass),iron=mat(color.iron);
 function add(parent,geometry,material,pos=[0,0,0],rotation=[0,0,0]){ownedGeometries.add(geometry);const m=new THREE.Mesh(geometry,material);m.position.set(...pos);m.rotation.set(...rotation);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 const box=(p,size,m,pos,rot=[0,0,0])=>add(p,new RoundedBoxGeometry(...size,2,.025),m,pos,rot);
 const point=id=>{const{x,z}=xy(id);return new THREE.Vector3(x-5,.15+state.cells[id].h*STEP,z-4);};
 const midpoint=ids=>ids.reduce((p,id)=>p.add(point(id)),new THREE.Vector3()).multiplyScalar(1/ids.length);
 const tag=(id,name,kind,pos)=>tags.push({id,name,kind,position:pos.clone()});
 const waterArt=createWaterSurface();const water=waterArt.water;group.add(waterArt.group);
 for(const b of state.bridgeSlots||[]){
  const root=new THREE.Group();root.userData.tileId=b.id;const center=midpoint(b.cells),length=b.cells.length+.8,y=.15+b.h*STEP+.055;root.position.set(center.x,y,center.z);group.add(root);
  const built=new THREE.Group(),plan=new THREE.Group();root.add(built,plan);
  for(let i=0;i<Math.ceil(length*5);i++)box(built,[.17,.075,.72],i%3?wood:dark,[-length/2+.1+i*.2,0,0]);
  for(const z of [-.36,.36]){box(built,[length,.045,.045],dark,[0,.31,z]);for(const x of [-length*.43,0,length*.43])box(built,[.045,.43,.045],wood,[x,.13,z]);box(built,[length,.08,.06],dark,[0,-.09,z*.75]);}
  const ghost=mat('#53b4bc',{transparent:true,opacity:.55});
  for(let i=0;i<9;i++){const x=-length/2+i*length/8;box(plan,[.10,.025,.045],ghost,[x,.015,-.40]);box(plan,[.10,.025,.045],ghost,[x,.015,.40]);}
  bridges.push({b,built,plan});tag(b.id,b.name,'bridge',new THREE.Vector3(center.x,y+.25,center.z));
 }
 for(const g of state.gates||[]){
  const root=new THREE.Group();root.userData.tileId=g.id;const p=midpoint([g.a,g.b]);root.position.copy(p);root.position.y=.15+Math.max(state.cells[g.a].h,state.cells[g.b].h)*STEP;group.add(root);
  const alongX=Math.abs(g.a-g.b)===1;if(alongX)root.rotation.y=Math.PI/2;
  for(const x of [-.4,.4])box(root,[.08,.72,.10],wood,[x,.31,0]);box(root,[.92,.08,.13],dark,[0,.67,0]);
  const leaf=new THREE.Group();root.add(leaf);for(let i=0;i<4;i++)box(leaf,[.16,.40,.065],i%2?mint:wood,[-.255+i*.17,.2,0]);
  box(root,[.035,.35,.035],brass,[0,.72,0]);const crank=add(root,new THREE.TorusGeometry(.13,.024,6,18),brass,[0,.88,.04]);
  for(const a of [0,Math.PI/2])box(root,[.24,.025,.025],brass,[0,.88,.04],[0,0,a]);
  gates.push({g,leaf,crank,root});tag(g.id,g.name,'gate',root.position.clone().add(new THREE.Vector3(0,1.0,0)));
 }
 for(const p of state.pumps||[]){
  const root=new THREE.Group();root.position.copy(point(p.id));root.userData.tileId=p.id;group.add(root);
  box(root,[.42,.32,.38],mint,[0,.18,0]);box(root,[.5,.06,.44],dark,[0,.02,0]);
  add(root,new THREE.CylinderGeometry(.11,.11,.12,16),brass,[0,.43,0]);const handle=box(root,[.43,.045,.06],wood,[.07,.48,0]);
  for(const ids of [p.from,p.to]){const end=midpoint(ids).sub(root.position),curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.15,0),new THREE.Vector3(end.x*.5,.16,end.z*.5),new THREE.Vector3(end.x,end.y+.04,end.z)]);add(root,new THREE.TubeGeometry(curve,18,.032,6,false),iron);}
  pumps.push({p,handle});tag(p.id,p.name,'pump',root.position.clone().add(new THREE.Vector3(0,.78,0)));
 }
 for(const b of state.blasts||[]){const root=new THREE.Group();root.position.copy(point(b.id));root.userData.tileId=b.id;group.add(root);box(root,[.035,.52,.035],wood,[.34,.26,.2]);box(root,[.30,.19,.035],brass,[.33,.48,.2]);tag(b.id,b.name,'blast',root.position.clone().add(new THREE.Vector3(0,.9,0)));blasts.push({b,root});}
 let wheel=null;
 if(state.wheel){
  const w=state.wheel,root=new THREE.Group();root.userData.tileId=w.id;const p=midpoint(w.edge);root.position.set(p.x+.28,.64,p.z);group.add(root);
  const rotor=new THREE.Group();root.add(rotor);for(const x of [-.13,.13])add(rotor,new THREE.TorusGeometry(.35,.035,6,24),wood,[x,0,0],[0,Math.PI/2,0]);
  for(let i=0;i<10;i++){const a=i*Math.PI/5;box(rotor,[.32,.065,.17],i%2?wood:dark,[0,Math.sin(a)*.34,Math.cos(a)*.34],[a,0,0]);}
  add(root,new THREE.CylinderGeometry(.035,.035,.7,10),brass,[.10,0,0],[0,0,Math.PI/2]);for(const x of [-.25,.45])box(root,[.07,.60,.10],dark,[x,-.06,0]);wheel={root,rotor};tag(w.id,'Workshop wheel','wheel',root.position.clone().add(new THREE.Vector3(0,.65,0)));
 }
 for(const g of state.waterGoals||[]){const bounds=new THREE.Box3();for(const id of g.cells)bounds.expandByPoint(point(id));for(const x of [bounds.min.x-.42,bounds.max.x+.42])for(const z of [bounds.min.z-.42,bounds.max.z+.42]){box(group,[.04,.30,.04],wood,[x,.26+point(g.cells[0]).y,z]);add(group,new THREE.SphereGeometry(.055,8,5),brass,[x,.43+point(g.cells[0]).y,z]);}const p=midpoint(g.cells);p.y+=.62;tag(g.cells[0],g.name,'goal',p);}
 const moving=new Set([...gates.map(g=>g.crank),...pumps.map(p=>p.handle),waterArt.water]);
 function batchStatic(node){
  if(node===waterArt.group)return;
  for(const child of [...node.children])if(child.isGroup)batchStatic(child);
  const buckets=new Map();
  for(const child of [...node.children]){if(!child.isMesh||child.isInstancedMesh||moving.has(child)||Array.isArray(child.material))continue;const key=child.material;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(child);}
  for(const[mat,list]of buckets){if(list.length<2)continue;const parts=list.map(m=>{m.updateMatrix();const source=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();source.applyMatrix4(m.matrix);source.deleteAttribute('uv');return source;});const geometry=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());if(!geometry)continue;ownedGeometries.add(geometry);const merged=new THREE.Mesh(geometry,mat);merged.castShadow=merged.receiveShadow=true;node.add(merged);for(const m of list){node.remove(m);ownedGeometries.delete(m.geometry);m.geometry.dispose();}}
 }
 batchStatic(group);
 function update(s,time,dt=0){
  waterArt.update(s,time,dt);
  for(const {b,built,plan} of bridges){built.visible=(s.bridges||[]).includes(b.id);plan.visible=!built.visible;}
  for(const {g,leaf,crank} of gates){const actual=s.gates.find(v=>v.id===g.id);leaf.position.y=actual.open?.36:0;crank.rotation.z=actual.open?Math.PI*.7:0;}
  for(const {p,handle} of pumps){const active=s.miners.some(m=>m.status==='pumping'&&m.task?.target===p.id);handle.rotation.z=active?Math.sin(time*7)*.35:0;}
  for(const {b,root} of blasts)root.visible=b.affected.some(id=>s.cells[id].type==='rock');
  if(wheel)wheel.rotor.rotation.x-=(s.wheel.flow||0)*dt*2;
 }
 update(state,0);
 return {group,tags,pickables:[group],water,update,dispose(){for(const g of ownedGeometries)g.dispose();for(const m of ownedMaterials)m.dispose();waterArt.dispose();}};
}
