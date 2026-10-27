// Finite-volume shallow-water grid. One cell has an area of 4 m².
// Soil height is in the existing 0.24 m steps; water is stored in m³.
export const WATER_AREA=4,WADING_VOLUME=1;
const edges=[];for(let z=0;z<9;z++)for(let x=0;x<11;x++){const id=z*11+x;if(x<10)edges.push([id,id+1]);if(z<8)edges.push([id,id+11]);}
export function waterVolume(s,ids){return ids.reduce((sum,id)=>sum+(s.water?.[id]||0),0);}
export function pumpGoal(s,pump){return s.waterGoals?.find(g=>pump.to.every(id=>g.cells.includes(id)));}
// Render-only fluxes stay out of saves/undo and cannot change the simulation.
const renderFlow=new WeakMap();
export function getWaterFlow(s){return renderFlow.get(s);}
export function stepWater(s,dt){
 let flow=renderFlow.get(s);if(!flow){flow=new Float32Array(198);renderFlow.set(s,flow);}flow.fill(0);
 const threats=new Set();if(!s.water?.some(v=>v>1e-9))return threats;
 const closed=new Set((s.gates||[]).filter(g=>!g.open).map(g=>[Math.min(g.a,g.b),Math.max(g.a,g.b)].join(':')));
 const deck=new Set((s.bridgeSlots||[]).filter(b=>(s.bridges||[]).includes(b.id)).flatMap(b=>b.cells));
 const protectedCells=new Set();for(const m of s.miners){protectedCells.add(m.cell);if(m.path[0]!==undefined)protectedCells.add(m.path[0]);if(m.evacuating)for(const n of m.path)protectedCells.add(n);}
 for(const id of deck)protectedCells.delete(id);
 let wheelFlow=0;
 for(const [a,b] of edges){
  if(closed.has(`${a}:${b}`)||['rock','camp'].includes(s.cells[a].type)||['rock','camp'].includes(s.cells[b].type))continue;
  const floorA=s.cells[a].h*.24,floorB=s.cells[b].h*.24,headA=floorA+s.water[a]/WATER_AREA,headB=floorB+s.water[b]/WATER_AREA;
  const from=headA>headB?a:b,to=from===a?b:a;
  const head=from===a?headA:headB,other=from===a?headB:headA,bank=from===a?floorB:floorA;
  let q=Math.min(s.water[from],Math.max(0,head-Math.max(bank,other))*7*dt);
  if(q>1e-8&&protectedCells.has(to)&&s.water[to]+q>WADING_VOLUME*.8){threats.add(to);q=Math.min(q,Math.max(0,WADING_VOLUME*.8-s.water[to]));}
  s.water[from]-=q;s.water[to]+=q;
  if(q>0&&dt>0){const axis=b-a===1?0:1,v=(from===a?1:-1)*q/dt;flow[a*2+axis]+=v;flow[b*2+axis]+=v;}
  if(s.wheel&&s.wheel.edge.includes(a)&&s.wheel.edge.includes(b))wheelFlow+=q/dt;
 }
 if(s.wheel)s.wheel.flow=wheelFlow;
 return threats;
}
export function pumpWater(s,pump,dt){
 const from=pump.from.filter(id=>s.water[id]>1e-8).sort((a,b)=>s.water[b]-s.water[a]);
 let remaining=1.4*dt,moved=0;
 for(const id of from){const q=Math.min(s.water[id],remaining);s.water[id]-=q;for(const dest of pump.to)s.water[dest]+=q/pump.to.length;moved+=q;remaining-=q;if(remaining<=1e-12)break;}
 return moved;
}
export function updateWaterGoals(s,dt,emit){
 for(const g of s.waterGoals||[]){g.volume=waterVolume(s,g.cells);if(g.done)continue;g.hold=g.volume>=g.min-.001&&g.volume<=g.max+.001?g.hold+dt:0;if(g.hold>=2){g.done=true;emit({type:'water-goal',target:g.cells[0],name:g.name});}}
 if(s.wheel&&!s.wheel.done){s.wheel.hold=s.wheel.flow>=.015?s.wheel.hold+dt:0;if(s.wheel.hold>=2){s.wheel.done=true;emit({type:'water-goal',target:s.wheel.id,name:'Waterwheel'});}}
}
