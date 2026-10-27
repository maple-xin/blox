import {test} from 'node:test';
import assert from 'node:assert/strict';
import {freshGame,command,tick,recall,inspect,clone,validSave,LEVELS,CAMP,goalsComplete,upgradeSave} from '../src/logic.js';
import {pumpWater,updateWaterGoals} from '../src/water.js';
import {SOLUTIONS} from './campaign-solutions.mjs';
const advance=(s,seconds,emit)=>{for(let i=0;i<seconds*60;i++)tick(s,1/60,emit);};
function settle(s,emit){for(let i=0;i<18000;i++){tick(s,1/60,emit);if(!s.pendingBlast&&!s.queue.length&&s.miners.every(m=>!m.task&&!m.path.length&&m.status==='idle'))return;}assert.fail('Tasks cannot settle');}
const mass=s=>s.water.reduce((a,b)=>a+b,0);
function order(s,kind,id,minerId=null){const r=command(s,id,kind,minerId);assert.equal(r.accepted,true,`${s.level} ${kind} ${id}: ${r.description}`);settle(s);assert.ok(Math.abs(mass(s)-s.waterInitial)<1e-7);assert.ok(validSave(s));}
for(const [level,solutions] of Object.entries(SOLUTIONS))for(const [variant,steps] of solutions.entries())test(`L${String(level).padStart(2,'0')} ${LEVELS[level-1].name}: complete solution ${variant+1}`,()=>{
 const s=freshGame(+level);s.started=true;assert.equal(s.won,false);assert.equal(goalsComplete(s),false);
 for(const[kind,target]of steps){
  if(kind==='wait'){advance(s,target);continue;}
  if(kind==='collect-all'){for(const o of s.ores)if(o.state==='raw')order(s,'collect',o.id);continue;}
  order(s,kind,target);
 }
 advance(s,45);recall(s);settle(s);advance(s,3);
 assert.equal(s.won,true);assert.equal(goalsComplete(s),true);assert.equal(s.delivered,s.ores.length);assert.ok(s.miners.every(m=>m.cell===CAMP&&!m.carrying&&!m.path.length));
 assert.ok(Math.abs(mass(s)-s.waterInitial)<1e-7);assert.equal(validSave(JSON.parse(JSON.stringify(s))),true);
 if(+level===7&&variant===1||+level===10&&variant===1)assert.equal(s.tools.blast,1,'the no-blast route preserves the tool');
});
test('bridge blocks deep-water walking until built, and safe reclamation refunds exactly once',()=>{
 const s=freshGame(5);s.started=true;assert.equal(inspect(s,31,'collect').valid,false);order(s,'bridge',26);assert.equal(s.tools.bridge,0);
 assert.equal(command(s,27,'move',0).accepted,true);settle(s);assert.equal(inspect(s,26,'bridge').valid,false,'occupied bridge cannot be reclaimed');
 recall(s);settle(s);assert.equal(command(s,26,'bridge').accepted,true);assert.equal(command(s,26,'bridge').accepted,undefined);settle(s);
 assert.equal(s.tools.bridge,1);assert.equal(s.bridges.length,0);assert.equal(inspect(s,31,'collect').valid,false);assert.equal(validSave({...s,tools:{...s.tools,bridge:2}}),false);
});
test('safe blast waits for crew, removes precisely the previewed rocks and charges once',()=>{
 const s=freshGame(7);s.started=true;order(s,'move',47);const preview=inspect(s,50,'blast').affected,original=clone(s.cells);
 assert.equal(command(s,50,'blast').accepted,true);assert.ok(validSave(s));assert.equal(s.tools.blast,1);settle(s);
 assert.equal(s.tools.blast,0);for(const c of s.cells)assert.equal(c.type,preview.includes(c.id)&&original[c.id].type==='rock'?'soil':original[c.id].type);
 assert.ok(s.miners.every(m=>m.cell===CAMP));assert.equal(command(s,50,'blast').accepted,undefined);
});
test('pump moves water into the receiving pool; pause/save resumes the identical simulation',()=>{
 const s=freshGame(8);s.started=true;order(s,'gate',17);assert.equal(command(s,50,'pump').accepted,true);
 for(let i=0;i<6000&&!s.miners.some(m=>m.status==='pumping');i++)tick(s,1/60);
 assert.ok(s.miners.some(m=>m.status==='pumping'));const before=s.pumps[0].to.reduce((n,id)=>n+s.water[id],0);
 const restored=clone(s);assert.ok(validSave(restored));s.paused=true;const paused=clone(s);advance(s,2);assert.deepEqual(s,paused);s.paused=false;
 advance(s,4);advance(restored,4);assert.deepEqual(s,restored);assert.ok(s.pumps[0].to.reduce((n,id)=>n+s.water[id],0)>before);assert.ok(Math.abs(mass(s)-16)<1e-7);
});
test('water achievements stay latched after water is transferred away',()=>{
 const s=freshGame(3);s.started=true;for(const id of [50,50,39,39])order(s,'dig',id);advance(s,30);assert.equal(s.waterGoals[0].done,true);
 const g=s.waterGoals[0];for(let i=0;i<300;i++)pumpWater(s,{from:g.cells,to:[16,17,27,28]},1/60);updateWaterGoals(s,1/60,()=>{});
 assert.equal(g.done,true);assert.ok(Math.abs(mass(s)-6)<1e-7);
});
test('workshop starts with a continuous riverbank beside the lower left burrow',()=>{
 const s=freshGame(12);s.started=true;advance(s,120);
 assert.equal(s.cells[81].h,2);
 assert.ok(s.cells.filter(c=>c.id%11<5).every(c=>s.water[c.id]<1e-8),'the river must not spill into the camp approach');
 assert.ok(Math.abs(mass(s)-s.waterInitial)<1e-7);
});
function legacyGarden(){const s=freshGame(9);s.cells[26].h=s.cells[26].initialH=1;return upgradeSave(s);}
test('L09 over-digging can be recovered by shallow-water pumping without undo',()=>{
 const s=legacyGarden();s.started=true;
 for(const o of s.ores)order(s,'collect',o.id);
 for(const id of [40,40,41,50,50,39,39])order(s,'dig',id);
 order(s,'gate',38);advance(s,200);
 assert.equal(s.waterGoals[0].done,false);assert.ok(s.waterGoals[0].volume<2.5);
 assert.ok(s.pumps[0].from.every(id=>s.water[id]<.85),'this used to incorrectly disable the pump');
 order(s,'gate',38);assert.equal(inspect(s,86,'pump').valid,true);order(s,'pump',86);
 advance(s,5);recall(s);settle(s);advance(s,3);
 assert.equal(s.won,true);assert.equal(s.delivered,3);assert.ok(Math.abs(mass(s)-6)<1e-7);
});
test('fill restores an over-dug bridge bank and preserves animals and all water',()=>{
 const s=legacyGarden();s.started=true;
 for(const o of s.ores)order(s,'collect',o.id);
 for(const id of [51,51,52,52])order(s,'dig',id);
 assert.equal(inspect(s,49,'bridge').valid,false);
 for(const id of [50,50,39,39])order(s,'dig',id);order(s,'gate',38);advance(s,200);
 assert.equal(s.waterGoals[0].done,false);
 recall(s);settle(s);for(const id of [51,51,52,52])order(s,'fill',id,0);
 assert.equal(s.cells[51].h,s.cells[51].initialH);assert.equal(s.cells[52].h,s.cells[52].initialH);
 assert.equal(inspect(s,51,'fill').valid,false);assert.equal(inspect(s,49,'bridge').valid,true);
 advance(s,200);recall(s);settle(s);advance(s,3);
 assert.equal(s.won,true);assert.equal(s.delivered,3);assert.ok(Math.abs(mass(s)-6)<1e-7);
});
test('fill cannot bury animals, camp, original terrain or a worker; in-progress saves resume',()=>{
 const s=freshGame(1);s.started=true;
 for(const id of [CAMP,30,48])assert.equal(inspect(s,id,'fill').valid,false);
 order(s,'dig',48);order(s,'move',48);assert.equal(inspect(s,48,'fill').valid,false);
 recall(s);settle(s);assert.equal(command(s,48,'fill').accepted,true);
 for(let i=0;i<6000&&!s.miners.some(m=>m.status==='filling');i++)tick(s,1/60);
 assert.ok(s.miners.some(m=>m.status==='filling'));assert.ok(validSave(s));const restored=clone(s);
 s.paused=true;const paused=clone(s);advance(s,2);assert.deepEqual(s,paused);s.paused=false;
 settle(s);settle(restored);assert.deepEqual(s,restored);assert.equal(s.cells[48].h,3);
});

test('L09 new pool bank retains water, and legacy saves can repair it without losing progress',()=>{
 const s=freshGame(9);s.started=true;advance(s,200);
 assert.equal(s.cells[26].h,2);assert.ok(s.water.slice(0,16).every(v=>v<1e-8));
 assert.ok(Math.abs(s.pumps[0].from.reduce((n,id)=>n+s.water[id],0)-6)<1e-7);
 const old=legacyGarden();assert.equal(old.cells[26].h,1);assert.equal(old.cells[26].initialH,2);assert.ok(validSave(old));
 old.started=true;order(old,'fill',26);assert.equal(old.cells[26].h,2);assert.ok(Math.abs(mass(old)-6)<1e-7);
});
