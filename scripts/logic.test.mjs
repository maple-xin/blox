import {test} from 'node:test';
import assert from 'node:assert/strict';
import {freshGame,command,tick,inspect,recall,clone,validSave,CAMP,pathTo,workSpot,advanceLevel} from '../src/logic.js';
function settle(s,emit){for(let i=0;i<12000;i++){tick(s,1/60,emit);if(!s.queue.length&&s.miners.every(m=>!m.task&&!m.path.length&&m.status==='idle'))return;}assert.fail('Tasks did not settle');}
function doTask(s,id,kind='dig'){const c=command(s,id,kind);assert.equal(c.accepted,true,`${id}: ${c.description}`);settle(s);}
test('L01: carve a viable route, collect, deliver, recall all three; save and undo restore authoritative state',()=>{
 const s=freshGame();s.started=true;
 assert.equal(pathTo(s,CAMP,48),null,'the high ridge must require an excavated approach');
 assert.equal(inspect(s,30,'collect').valid,false,'an animal in an unreachable burrow cannot be collected');
 const before=clone(s);doTask(s,48);assert.equal(s.cells[48].h,2);assert.equal(before.cells[48].h,3);assert.equal(validSave(before),true);
 for(const id of [40,41,41,62,63,63])doTask(s,id);
 assert.equal(inspect(s,30,'collect').valid,true);assert.equal(inspect(s,74,'collect').valid,true);
 for(const id of [47,48,59])assert.equal(command(s,id,'move').accepted,true);settle(s);
 assert.equal(command(s,30,'collect').accepted,true);assert.equal(command(s,74,'collect').accepted,true);
 assert.equal(s.delivered,0,'accepting a collection task does not count as delivery');
 tick(s,1/60);assert.equal(s.delivered,0);
 const animalEvents=[];settle(s,event=>animalEvents.push(event));
 assert.equal(animalEvents.filter(e=>e.type==='collect').length,2);
 assert.equal(animalEvents.some(e=>e.type==='strike'&&[30,74].includes(e.target)),false,'A miner must never strike an animal');
 assert.equal(s.delivered,2);assert.equal(s.won,false,'third miner is still away from camp');
 recall(s);settle(s);assert.equal(s.won,true);assert.equal(s.miners.every(m=>m.cell===CAMP),true);
 assert.equal(validSave(JSON.parse(JSON.stringify(s))),true);assert.equal(validSave({...s,delivered:1}),false);
});
test('pausing freezes tasks, unsafe cliffs and duplicate ore commands cannot be committed',()=>{
 const s=freshGame();s.started=true;command(s,48,'dig');s.paused=true;const before=JSON.stringify(s);tick(s,5);assert.equal(JSON.stringify(s),before);s.paused=false;settle(s);
 assert.equal(inspect(s,16,'dig').valid,false,'rock is immutable');
 assert.equal(command(s,48,'dig').accepted,true);assert.equal(command(s,48,'dig').accepted,undefined,'same target cannot queue twice');
});
test('save/resume during walking and work produces the same terrain, ore and crew state',()=>{
 const s=freshGame();s.started=true;command(s,48,'dig');for(let i=0;i<91;i++)tick(s,1/60);
 const restored=JSON.parse(JSON.stringify(s));assert.equal(validSave(restored),true);
 for(let i=0;i<1800;i++){tick(s,1/60);tick(restored,1/60);}assert.deepEqual(restored,s);
 assert.equal(s.cells[48].h,2);assert.equal(s.miners[0].status,'idle');
});
test('the long perimeter route is a second complete solution with fewer excavations',()=>{
 const s=freshGame();s.started=true;for(const id of [4,8,96])doTask(s,id);
 doTask(s,30,'collect');doTask(s,74,'collect');recall(s);settle(s);
 assert.equal(s.won,true);assert.equal(s.dugCount,3);assert.equal(s.flowersIntact,true);
});
test('L02 has two complete routes: near steps cost more work but shorten carrying',()=>{
 const outcomes=[];
 for(const digs of [[4,28,29,29],[92]]){
  const s=freshGame(2);s.started=true;
  assert.equal(inspect(s,30,'collect').valid,false);
  assert.equal(inspect(s,41,'collect').valid,false);
  assert.equal(inspect(s,49,'dig').valid,false,'the middle rock belt cannot be excavated');
  for(const id of digs)doTask(s,id);
  const carryingDistance=s.ores.reduce((n,o)=>n+workSpot(s,CAMP,o.id,'collect').path.length,0);
  for(const o of s.ores)doTask(s,o.id,'collect');
  recall(s);settle(s);assert.equal(s.won,true);assert.equal(s.flowersIntact,true);assert.equal(validSave(s),true);
  outcomes.push({work:s.dugCount,carryingDistance});
 }
 assert.deepEqual(outcomes.map(o=>o.work),[4,1]);
 assert.ok(outcomes[0].carryingDistance<outcomes[1].carryingDistance);
});
test('putting an animal onto the camp pad completes before delivery; pause and save are deterministic',()=>{
 const s=freshGame(2);s.started=true;doTask(s,92);command(s,30,'collect');
 for(let i=0;i<10000&&!s.miners.some(m=>m.status==='settling');i++)tick(s,1/60);
 const m=s.miners.find(m=>m.status==='settling');assert.ok(m);assert.equal(m.carrying,true);assert.equal(s.delivered,0);
 s.paused=true;const paused=clone(s);tick(s,2);assert.deepEqual(s,paused);s.paused=false;
 const restored=clone(s);assert.equal(validSave(restored),true);
 for(let i=0;i<180;i++){tick(s,1/60);tick(restored,1/60);}
 assert.deepEqual(s,restored);assert.equal(s.delivered,1);assert.equal(m.carrying,false);
 recall(s);settle(s);assert.equal(s.delivered,1,'recall cannot count the same animal again');
});
test('level progression requires a complete round and legacy L01 saves still load',()=>{
 const first=freshGame();assert.equal(advanceLevel(first),null);
 const legacy=clone(first);delete legacy.level;assert.equal(validSave(legacy),true);
 first.started=true;for(const id of [4,8,96])doTask(first,id);
 doTask(first,30,'collect');doTask(first,74,'collect');recall(first);settle(first);
 const next=advanceLevel(first);assert.equal(next.level,2);assert.equal(next.started,true);assert.equal(next.delivered,0);assert.equal(next.won,false);assert.equal(validSave(next),true);
 assert.equal(validSave({...next,ores:first.ores}),false,'the two maps have different animals');
 assert.equal(validSave({...next,level:13}),false);assert.equal(advanceLevel({...freshGame(12),won:true}),null);
});
test('automatic work rotates across all three miners instead of always reusing the nearest',()=>{
 const s=freshGame();s.started=true;const assigned=[];
 for(const id of [4,8,96]){assert.equal(command(s,id,'dig').accepted,true);settle(s,e=>{if(e.type==='assign')assigned.push(e.miner);});}
 assert.deepEqual(new Set(assigned),new Set([0,1,2]));assert.deepEqual(s.miners.map(m=>m.jobs),[1,1,1]);
});
test('manual orders stay with the selected miner, including a queued job and save/resume',()=>{
 const s=freshGame();s.started=true;assert.equal(command(s,48,'dig',1).accepted,true);tick(s,1/60);
 assert.equal(s.miners[1].task.target,48);assert.equal(command(s,4,'dig',1).accepted,true);
 assert.equal(s.queue[0].minerId,1);assert.equal(s.miners[0].task,null);assert.equal(s.miners[2].task,null);
 const restored=clone(s);assert.equal(validSave(restored),true);
 settle(s);settle(restored);assert.deepEqual(restored,s);assert.equal(s.cells[48].h,2);assert.equal(s.cells[4].h,2);
 assert.deepEqual(s.miners.map(m=>m.jobs),[0,2,0]);
 assert.equal(command(s,92,'dig',2).accepted,true);tick(s,1/60);assert.equal(s.miners[2].task.target,92);
 assert.equal(command(s,30,'collect',0).valid,false);assert.equal(command(s,4,'dig',8).valid,false);
 assert.equal(validSave({...s,queue:[{target:8,kind:'dig',minerId:9}]}),false);
});
