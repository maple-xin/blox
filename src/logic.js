// All authoritative gameplay lives here. No renderer or wall-clock dependency.
export const W = 11, D = 9, STEP = 0.24;
export const CAMP = 56;
export const PLACE_SECONDS = 1.6;
import {LEVELS,ANIMALS,engineerLayout} from './levels.js';
import {stepWater,pumpWater,pumpGoal,updateWaterGoals,WADING_VOLUME,waterVolume} from './water.js';
export {LEVELS,ANIMALS};
export const levelInfo = s => LEVELS[(s.level || 1)-1] || LEVELS[0];
export const HELMETS = ['#efbd52', '#e98b70', '#63a997'];
export const xy = id => ({x:id % W, z:Math.floor(id / W)});
export const idAt = (x,z) => z * W + x;
export function neighbors(id) { const {x,z}=xy(id); return [[x-1,z],[x+1,z],[x,z-1],[x,z+1]].filter(([a,b])=>a>=0&&b>=0&&a<W&&b<D).map(([a,b])=>idAt(a,b)); }
export const clone = a => JSON.parse(JSON.stringify(a));
export function upgradeSave(s){
 // Keep the player's terrain and progress; allow repairing the old low bank.
 if(s.level===9&&s.cells[26].initialH===1)s.cells[26].initialH=2;
 return s;
}
export function freshGame(level=1) {
  if(!LEVELS.some(l=>l.id===level))throw new Error('Unknown level');
  const cells = Array.from({length:W*D},(_,id)=>{
    const {x,z}=xy(id);
    let h=x<=3?1:3;
    if(x>4 && (z===8 || z===0)) h=2;
    if(x===4) h=3;
    const basin=(x===8||x===9)&&[1,2,6,7].includes(z);
    if(basin)h=0;
    const rock=x===5 && [1,2,3,5,6,7].includes(z);
    const ore=(x===8&&(z===2||z===6));
    if(ore) h=0;
    if([CAMP, CAMP-1,CAMP+1,CAMP-W,CAMP+W,CAMP-W-1].includes(id))h=1;
    const clearing=x<=2&&z>=4&&z<=6;
    return {id,h,initialH:h,type:clearing?'camp':rock?'rock':ore?'ore':'soil',basin,flower:(x===6&&z===4)||(x===4&&z===1),dug:false};
  });
  if(level===2)for(const c of cells){
    const {x,z}=xy(c.id);
    // A solid rock belt leaves two soft entrances. The near approach crosses
    // high ground; the longer lower route follows a pre-existing low terrace.
    const basin=[8,9].includes(x)&&[2,3].includes(z);
    const rock=x===5&&z>=1&&z<=7;
    const clearing=x<=2&&z>=4&&z<=6;
    let h=x<=3?1:3;
    if(x===5&&(z===0||z===8))h=2;
    if((z===8&&x>=6)||(x===10&&z>=2)||(x===9&&z>=4))h=1;
    if(x===7&&z===3)h=1;
    if(basin)h=0;
    c.h=c.initialH=h;c.basin=basin;c.type=clearing?'camp':rock?'rock':[30,41].includes(c.id)?'ore':'soil';
    c.flower=(x===7&&z===1)||(x===7&&z===6);
  }
  const extra=level>=3?engineerLayout(level,cells):{water:Array(W*D).fill(0),gates:[],bridgeSlots:[],blasts:[],pumps:[],waterGoals:[],wheel:null};
  extra.waterGoals=extra.waterGoals.map(g=>({...g,hold:0,done:false,volume:0}));if(extra.wheel)Object.assign(extra.wheel,{hold:0,done:false,flow:0});
  cells[CAMP].type='camp';
  const miners = ['Pip','Rusty','Sprout'].map((name,id)=>({id,name,cell:CAMP,path:[],moveT:0,status:'idle',task:null,timer:0,carrying:false,jobs:0,walkPhase:id*2,helmet:HELMETS[id]}));
  return {version:1,level,...extra,waterInitial:extra.water.reduce((a,b)=>a+b,0),bridges:[],tools:{...LEVELS[level-1].tools},pendingBlast:null,cells,miners,ores:LEVELS[level-1].animals.map(a=>({id:a.id,state:'raw'})),queue:[],delivered:0,dugCount:0,flowersIntact:true,time:0,won:false,started:false,paused:false};
}
export function advanceLevel(s){if(!s.won||!LEVELS[s.level||1])return null;const next=freshGame((s.level||1)+1);next.started=true;return next;}
export function bridgeAt(s,id){return (s.bridgeSlots||[]).find(b=>(s.bridges||[]).includes(b.id)&&b.cells.includes(id));}
export const walkHeight=(s,id)=>bridgeAt(s,id)?.h??s.cells[id]?.h;
export function walkable(s,id) { return !!s.cells[id] && s.cells[id].type!=='rock' && (!!bridgeAt(s,id)||(s.water?.[id]||0)<=WADING_VOLUME); }
export function actionFor(s,target,kind='dig'){
 if(!['dig','facility'].includes(kind))return kind;
 if((s.bridgeSlots||[]).some(b=>b.id===target))return 'bridge';
 if((s.gates||[]).some(g=>g.id===target))return 'gate';
 if((s.pumps||[]).some(p=>p.id===target))return 'pump';
 if((s.blasts||[]).some(b=>b.id===target)&&s.cells[target]?.type==='rock')return 'blast';
 if(s.cells[target]?.type==='ore')return 'collect';
 return kind;
}
export function goalsComplete(s){return s.delivered===s.ores.length&&(s.waterGoals||[]).every(g=>g.done)&&(!s.wheel||s.wheel.done);}

export function pathTo(s,from,to) {
  if(from===to)return [];
  if(!walkable(s,to))return null;
  const q=[from], prev=new Map([[from,-1]]);
  for(let i=0;i<q.length;i++) for(const n of neighbors(q[i])) {
    if(prev.has(n)||!walkable(s,n)||Math.abs(walkHeight(s,n)-walkHeight(s,q[i]))>1)continue;
    prev.set(n,q[i]); q.push(n);
    if(n===to){const path=[];let v=to;while(v!==from){path.push(v);v=prev.get(v);}return path.reverse();}
  }
  return null;
}
export function workSpot(s,from,target,kind,exclude=new Set()) {
  const c=s.cells[target]; if(!c)return null;
  let best=null;
  for(const id of neighbors(target)) {
    if(exclude.has(id)||!walkable(s,id)||s.cells[id].type==='ore'||(['dig','fill','bridge','gate','pump'].includes(kind)&&s.cells[id].hydraulic))continue;
    const diff=Math.abs(walkHeight(s,id)-c.h);
    if(diff>(['dig','fill','bridge','gate','pump'].includes(kind)?2:1))continue;
    if(['dig','fill','bridge','gate','pump'].includes(kind)&&(s.water?.[id]||0)>.05)continue;
    const path=pathTo(s,from,id);
    if(path!==null&&(!best||path.length<best.path.length))best={id,path};
  }
  return best;
}
function digSafety(s,target) {
  const old=s.cells[target].h;s.cells[target].h--;
  const okay=s.miners.every(m=>pathTo(s,m.cell,CAMP)!==null);
  const access=neighbors(target).some(n=>pathTo(s,CAMP,n)!==null&&Math.abs(s.cells[n].h-s.cells[target].h)<=1);
  s.cells[target].h=old;
  return okay&&(access||s.cells[target].hydraulic);
}
function fillSafety(s,target){
 const c=s.cells[target];
 if(c.type!=='soil'||c.h>=c.initialH||s.miners.some(m=>m.cell===target||m.path.includes(target)))return false;
 c.h++;const safe=s.miners.every(m=>pathTo(s,m.cell,CAMP)!==null);c.h--;return safe;
}
export function inspect(s,target,kind='dig',minerId=null) {
  if(minerId!==null&&!s.miners.some(m=>m.id===minerId))return {valid:false,title:'Choose a helper',description:'Select a crew portrait or switch to Auto crew.'};
  const candidates=minerId===null?s.miners:s.miners.filter(m=>m.id===minerId);
  kind=actionFor(s,target,kind);
  const c=s.cells[target];
  if(!c)return {valid:false,title:'Pick a tile',description:'Select a target in the meadow.'};
  if(kind==='fill'){
    if(c.type!=='soil'||c.h>=c.initialH)return {valid:false,title:'Nothing to fill',description:'Fill only soil that you dug, up to its original height. Animals and equipment stay safe.'};
    const queued=s.queue.some(t=>t.target===target)||s.miners.some(m=>m.task?.target===target);
    const spot=candidates.some(m=>workSpot(s,m.cell,target,'fill')),safe=fillSafety(s,target);
    return {valid:!queued&&spot&&safe,title:`Fill one layer · ${c.h} → ${c.h+1}`,description:queued?'A helper is already working here.':!spot?'Start beside dry ground and fill one tile at a time.':!safe?'Move the crew off this tile and its paths before filling. Keep a route to HQ.':'Replace one soil layer to repair a leaking bank or bridge approach. Rescue progress is kept.',confirmLabel:'Fill this tile'};
  }
  if(['bridge','gate','blast','pump'].includes(kind))return inspectFacility(s,target,kind,candidates);
  if(kind==='facility')return {valid:false,title:'Choose equipment',description:'Select a bridge plan, gate, pump or marked rock gate.'};
  if(c.type==='rock')return {valid:false,title:'Solid rock',description:(s.level||1)===2?'Dig around either end of the rocks. The upper path is shorter; the lower needs less work.':'This rock cannot be dug. Look for a gap or go around it.'};
  if(c.type==='camp')return {valid:false,title:'Rescue HQ',description:'Animals count when placed on the rescue pad. Use Home to recall the crew.'};
  const queued=s.queue.some(t=>t.target===target)||s.miners.some(m=>m.task?.target===target);
  if(queued)return {valid:false,title:'Already assigned',description:'A helper has this job. Give them a moment.'};
  if(kind==='move') {
    const reachable=candidates.some(m=>(minerId!==null||!m.task)&&pathTo(s,m.cell,target)!==null);
    return {valid:reachable,title:'Walk here',description:reachable?'Send an available helper to this tile.':'No walkable route yet. Dig a gentle set of steps.',confirmLabel:'Go here'};
  }
  if(c.type==='ore') {
    const ore=s.ores.find(o=>o.id===target),animal=levelInfo(s).animals.find(a=>a.id===target);
    if(ore.state!=='raw')return {valid:false,title:ore.state==='delivered'?`${animal.name} is at HQ`:'On the way home',description:'Each neighbor counts once, after being safely placed at HQ.'};
    const spot=candidates.some(m=>workSpot(s,m.cell,target,'collect'));
    return {valid:spot,title:`Rescue ${animal.name}`,description:spot?'Your helper puts the tool away, scoops up the animal and carries it to HQ.':'This neighbor is in a burrow. Dig nearby steps: height 3 → 2 → 1.',confirmLabel:'Carry to HQ'};
  }
  if(kind==='collect')return {valid:false,title:'A soil tile',description:'No animal here. Choose Dig and make a path to a burrow.'};
  if(c.h<=0)return {valid:false,title:'At the bottom',description:'This tile is already at its lowest level.'};
  const spot=candidates.some(m=>workSpot(s,m.cell,target,'dig'));
  const safe=spot&&digSafety(s,target);
  return {valid:!!safe,title:c.hydraulic?`Clear the canal · ${c.h} → ${c.h-1}`:c.flower?'Dig below the flowers':`Dig one layer · ${c.h} → ${c.h-1}`,description:!spot?'No helper can reach this tile. Build the path outward from HQ.':!safe?'This would create a cliff. Dig a neighboring step and keep a route home.':c.flower?'Flowers grow here. You can keep them and find another route.':'A helper will walk here and remove one layer to make a step.',confirmLabel:'Dig this tile'};
}
export function command(s,target,kind,minerId=null) {
  if(!s.started||s.paused||s.won||s.pendingBlast)return {valid:false,title:'Taking a break',description:'Resume before assigning a new job.'};
  const info=inspect(s,target,kind,minerId);if(!info.valid)return info;
  const actual=actionFor(s,target,kind);
  if(actual==='blast'){s.pendingBlast={target,timer:0};recall(s,true);return {...info,accepted:true};}
  s.queue.push({target,kind:actual,...(minerId===null?{}:{minerId})}); s.won=false;
  return {...info,accepted:true};
}
function dispatch(s,emit) {
  for(let i=0;i<s.queue.length;) {
    const task=s.queue[i];let best=null;
    const occupied=new Set(s.miners.filter(m=>m.task).map(m=>m.task.spot));
    for(const m of s.miners) {
      if(task.minerId!==undefined&&m.id!==task.minerId)continue;
      if(m.task||m.carrying||m.status==='returning'||m.status==='settling')continue;
      const spot=task.kind==='move'?{id:task.target,path:pathTo(s,m.cell,task.target)}:workSpot(s,m.cell,task.target,task.kind,occupied);
      if(spot?.path!==null&&spot?.path!==undefined&&(!best||(m.jobs||0)<(best.m.jobs||0)||((m.jobs||0)===(best.m.jobs||0)&&spot.path.length<best.spot.path.length)))best={m,spot};
    }
    if(!best){i++;continue;}
    const {m,spot}=best;m.jobs=(m.jobs||0)+1;m.task={...task,spot:spot.id};m.path=spot.path;m.moveT=0;m.timer=0;m.pumpDryFor=0;m.status=m.path.length?'walking':task.kind==='move'?'idle':statusFor(task.kind);
    if(task.kind==='move'&&!m.path.length)m.task=null;
    s.queue.splice(i,1);emit({type:'assign',miner:m.id,target:task.target});
  }
}
export function returnHome(s,m) {m.path=pathTo(s,m.cell,CAMP)||[];m.moveT=0;m.status='returning';m.timer=0;}
export function recall(s,keepBlast=false) {
  if(s.won)return;
  if(!keepBlast)s.pendingBlast=null;
  s.queue=[];
  for(const m of s.miners){m.task=null;returnHome(s,m);}
}
export function tick(s,dt,emit=()=>{}) {
  if(!s.started||s.paused||s.won)return;
  s.time+=dt;dispatch(s,emit);
  if(s.pendingBlast&&s.miners.every(m=>m.cell===CAMP&&!m.path.length)){s.pendingBlast.timer+=dt;if(s.pendingBlast.timer>=.6){const b=s.blasts.find(b=>b.id===s.pendingBlast.target);if(b&&s.tools.blast>0){for(const id of b.affected)if(s.cells[id].type==='rock'){Object.assign(s.cells[id],{type:'soil',h:b.h,dug:true,basin:b.h===0,hydraulic:b.h===0});}s.tools.blast--;emit({type:'blast',target:b.id,affected:b.affected});}s.pendingBlast=null;}}
  for(const m of s.miners) {
    if(m.path.length) {
      const next=m.path[0];
      if(!walkable(s,next)||Math.abs(walkHeight(s,next)-walkHeight(s,m.cell))>1){m.path=[];m.task=null;m.status='idle';emit({type:'blocked',miner:m.id});continue;}
      m.moveT+=dt*2.35;m.walkPhase+=dt*11;
      if(m.moveT>=1){m.moveT-=1;m.cell=m.path.shift();emit({type:'step',miner:m.id});if(!m.path.length)m.moveT=0;}
      if(m.path.length)continue;
      if(m.status==='walking'&&m.task){if(m.task.kind==='move'){m.task=null;m.status='idle';}else {m.status=statusFor(m.task.kind);m.timer=0;}}
    }
    if(m.status==='returning'&&!m.path.length) {
      if(m.cell!==CAMP){m.path=pathTo(s,m.cell,CAMP)||[];if(!m.path.length)m.status='idle';continue;}
      if(m.carrying){m.status='settling';m.timer=0;}else{m.status='idle';m.evacuating=false;m.task=null;emit({type:'home',miner:m.id});}
    }
    if(m.status==='settling'){
      m.timer+=dt;
      if(m.timer>=PLACE_SECONDS){
        const ore=s.ores.find(o=>o.state===`carried:${m.id}`);
        if(ore){ore.state='delivered';s.delivered++;emit({type:'delivery',miner:m.id,target:ore.id});}
        m.carrying=false;m.status='idle';m.task=null;m.timer=0;emit({type:'home',miner:m.id});
      }
    }
    if(['digging','filling','collecting','building','gating','pumping'].includes(m.status)&&m.task) {
      const previous=m.timer;m.timer+=dt;
      const duration=['digging','filling'].includes(m.status)?2.4:m.status==='building'?2.6:m.status==='gating'?1.2:m.status==='pumping'?40:1.6;
      if(m.status==='pumping'){const pump=s.pumps.find(p=>p.id===m.task.target),goal=pumpGoal(s,pump);pumpWater(s,pump,dt);m.pumpDryFor=(goal?waterVolume(s,pump.from)<=.05:pump.from.every(id=>s.water[id]<=.45))?(m.pumpDryFor||0)+dt:0;if(m.pumpDryFor>=2||goal?.done)m.timer=duration;}
      if(m.status==='digging'&&Math.floor((previous-.585)/.9)!==Math.floor((m.timer-.585)/.9))emit({type:'strike',miner:m.id,target:m.task.target});
      if(m.timer>=duration) {
        const t=m.task,c=s.cells[t.target];
        if(t.kind==='fill'){
          if(fillSafety(s,t.target)){c.h++;c.dug=c.h<c.initialH;emit({type:'fill',miner:m.id,target:t.target});}else emit({type:'blocked',miner:m.id});
          m.task=null;m.status='idle';m.timer=0;
        } else if(t.kind==='dig') {
          if(c.h>0&&digSafety(s,t.target)){c.h--;c.dug=true;s.dugCount++;if(c.flower)s.flowersIntact=false;c.flower=false;emit({type:'dig',miner:m.id,target:t.target});}
          else emit({type:'blocked',miner:m.id});
          m.task=null;m.status='idle';m.timer=0;
        } else if(['bridge','gate','pump'].includes(t.kind)){
          if(t.kind==='bridge'){const i=s.bridges.indexOf(t.target);if(i>=0){s.bridges.splice(i,1);s.tools.bridge++;}else{s.bridges.push(t.target);s.tools.bridge--;}emit({type:'facility',target:t.target});}
          if(t.kind==='gate'){const gate=s.gates.find(g=>g.id===t.target);gate.open=!gate.open;emit({type:'facility',target:t.target});}
          m.task=null;m.status='idle';m.timer=0;
        } else {
          const ore=s.ores.find(o=>o.id===t.target);
          if(ore?.state==='raw'){ore.state=`carried:${m.id}`;m.carrying=true;emit({type:'collect',miner:m.id,target:t.target});}
          m.task=null;returnHome(s,m);
        }
      }
    }
  }
  const rising=stepWater(s,dt);
  for(const m of s.miners)if(!m.evacuating&&!m.path.length&&rising.has(m.cell)){m.task=null;m.evacuating=true;returnHome(s,m);emit({type:'rising',miner:m.id});}
  updateWaterGoals(s,dt,emit);
  if(goalsComplete(s)&&!s.pendingBlast&&s.miners.every(m=>m.cell===CAMP&&!m.path.length&&!m.task&&!m.carrying)&&!s.queue.length){s.won=true;emit({type:'win'});}
}
export function pose(s,m) {
  const a=xy(m.cell),b=m.path.length?xy(m.path[0]):a,t=m.path.length?m.moveT:0;
  return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,y:0.15+(walkHeight(s,m.cell)+(walkHeight(s,m.path[0])-walkHeight(s,m.cell)||0)*t)*STEP};
}
const taskKinds=['dig','fill','collect','move','bridge','gate','pump'];
function statusFor(kind){return {dig:'digging',fill:'filling',collect:'collecting',bridge:'building',gate:'gating',pump:'pumping'}[kind]||'idle';}
function inspectFacility(s,target,kind,candidates){
 const queued=s.queue.some(t=>t.target===target)||s.miners.some(m=>m.task?.target===target);
 if(queued)return {valid:false,title:'Job in progress',description:'A helper is on this equipment job.',kind};
 const reachable=kind==='blast'||candidates.some(m=>workSpot(s,m.cell,target,kind));
 if(!reachable)return {valid:false,title:'Make a route first',description:'Your helper cannot reach this spot yet. Dig steps or build a bridge.',kind};
 if(kind==='bridge'){
  const b=s.bridgeSlots.find(b=>b.id===target),built=s.bridges.includes(target);
  if(built){if(s.miners.some(m=>b.cells.includes(m.cell)||m.path.some(n=>b.cells.includes(n))))return {valid:false,title:'Crew on the bridge',description:'Clear the bridge or call everyone home before reclaiming it.',kind};
   const rest=s.bridges.filter(id=>id!==target),old=s.bridges;s.bridges=rest;const safe=s.miners.every(m=>pathTo(s,m.cell,CAMP)!==null);s.bridges=old;
   return {valid:safe,title:'Reclaim bridge',description:safe?'Recover the bridge kit and use it at another crossing.':'Someone would be stranded. Call everyone home first.',confirmLabel:'Reclaim bridge',kind};}
  const level=b.banks.every(id=>s.cells[id].h===b.h),valid=s.tools.bridge>0&&level;
  return {valid,title:`Build · ${b.name}`,description:!level?'The bridge banks are too low. Use Fill to restore their original height.':s.tools.bridge<1?'No spare bridge kit. Safely reclaim an existing bridge first.':'Use one kit to cross deep water safely.',confirmLabel:'Build bridge',kind};
 }
 if(kind==='gate'){const g=s.gates.find(g=>g.id===target);return {valid:true,title:`${g.open?'Close ':'Open '}${g.name}`,description:'Open and close gates freely. Garden targets stay complete once achieved.',confirmLabel:g.open?'Close gate':'Open gate',kind};}
 if(kind==='pump'){const pump=s.pumps.find(p=>p.id===target),goal=pumpGoal(s,pump),valid=goal?!goal.done&&waterVolume(s,pump.from)>.05:pump.from.some(id=>s.water[id]>.85);return {valid,title:`Start ${pump.name}`,description:goal?(goal.done?'This pond is already complete.':valid?'Pump shallow water into the target pond. Fill over-dug banks to reduce leaks.':'The source is empty. Connect water or repair the banks first.'):valid?'One helper pumps into the marked drain pool. The other two can keep working.':'The water is shallow enough to walk through. No more pumping needed.',confirmLabel:goal?'Fill pond':'Drain water',kind};}
 const b=s.blasts.find(b=>b.id===target),valid=!!b&&s.tools.blast>0&&b.affected.some(id=>s.cells[id].type==='rock');
 return {valid,title:`Safe blast · ${b?.name||'Rock gate'}`,description:valid?`Affects ${b.affected.length} tiles. The crew returns before one remote blast opens the rocks. Digging around is also possible.`:'No blast kits remain. Dig an outer route instead.',confirmLabel:'Evacuate & blast',affected:b?.affected,kind};
}
export function validSave(s){
 const validId=id=>Number.isInteger(id)&&id>=0&&id<W*D;
 const task=t=>t&&validId(t.target)&&taskKinds.includes(t.kind)&&(t.minerId===undefined||Number.isInteger(t.minerId)&&t.minerId>=0&&t.minerId<3);
 if(!s||s.version!==1||!LEVELS.some(l=>l.id===(s.level??1)))return false;
 if(!Array.isArray(s.cells)||s.cells.length!==W*D||!s.cells.every((c,i)=>c.id===i&&Number.isInteger(c.h)&&c.h>=0&&c.h<=3&&['soil','rock','ore','camp'].includes(c.type)))return false;
 if(!Array.isArray(s.miners)||s.miners.length!==3||!s.miners.every((m,i)=>m.id===i&&(m.jobs===undefined||Number.isInteger(m.jobs)&&m.jobs>=0)&&validId(m.cell)&&Array.isArray(m.path)&&m.path.every(validId)&&Number.isFinite(m.moveT)&&m.moveT>=0&&m.moveT<1&&Number.isFinite(m.timer)&&m.timer>=0&&['idle','walking','digging','filling','collecting','returning','settling','building','gating','pumping'].includes(m.status)&&(!m.task||task(m.task))))return false;
 const animals=levelInfo(s).animals;
 if(!Array.isArray(s.ores)||s.ores.length!==animals.length||!s.ores.every((o,i)=>o.id===animals[i].id&&['raw','delivered','carried:0','carried:1','carried:2'].includes(o.state))||!Number.isInteger(s.delivered)||s.delivered<0||s.delivered>animals.length||s.ores.filter(o=>o.state==='delivered').length!==s.delivered)return false;
 if(!Array.isArray(s.queue)||!s.queue.every(task)||!Number.isFinite(s.time)||s.time<0)return false;
 if((s.level||1)>=3){
  const base=freshGame(s.level),sameIds=(a,b)=>Array.isArray(a)&&a.length===b.length&&a.every((v,i)=>v.id===b[i].id);
  if(!Array.isArray(s.water)||s.water.length!==99||!s.water.every(v=>Number.isFinite(v)&&v>=-1e-8)||Math.abs(s.water.reduce((a,b)=>a+b,0)-base.waterInitial)>.01)return false;
  if(!sameIds(s.gates,base.gates)||!s.gates.every(g=>typeof g.open==='boolean')||!sameIds(s.waterGoals,base.waterGoals)||!s.waterGoals.every(g=>typeof g.done==='boolean'&&Number.isFinite(g.hold)))return false;
  if(!Array.isArray(s.bridges)||new Set(s.bridges).size!==s.bridges.length||!s.bridges.every(id=>base.bridgeSlots.some(b=>b.id===id)))return false;
  if(!s.tools||!Object.entries(base.tools).every(([k,max])=>Number.isInteger(s.tools[k])&&s.tools[k]>=0&&s.tools[k]<=max)||s.tools.bridge+s.bridges.length!==base.tools.bridge)return false;
  if(s.pendingBlast&&(!base.blasts.some(b=>b.id===s.pendingBlast.target)||!Number.isFinite(s.pendingBlast.timer)))return false;
 }
 return true;
}
