// Authored, finite maps. Coordinates are x/z on the existing 11 × 9 island.
const at=(x,z)=>z*11+x;
const rect=(x,z,w,d)=>Array.from({length:w*d},(_,i)=>at(x+i%w,z+Math.floor(i/w)));
const pet=(x,z,kind='mole',name=kind==='mole'?'Mole':'Groundhog')=>({id:at(x,z),kind,name});
export const ANIMALS=[pet(8,2),pet(8,6,'groundhog')];
const meta=(id,name,objective,hint,description,animals,tools={})=>({id,name,objective,hint,description,animals,tools:{bridge:0,gate:0,blast:0,pump:0,...tools}});
export const LEVELS=[
 meta(1,'First Shift','Bring the neighbors home','Pick the raised soil beside HQ and dig the first step.','Make a gentle path, rescue both animals, and call the crew home.',ANIMALS),
 meta(2,'Rocky Detour','Rescue the neighbors beyond the rocks','Both ends are open: the upper path is shorter; the lower needs less digging.','Choose a short carrying route or a long route with less digging.',[pet(8,2),pet(8,3,'groundhog')]),
 meta(3,'A Little Canal','Give the garden a drink','Dig the marked plugs to the canal bed so water can flow.','Guide 3–5 m³ into the pond, hold for 2 seconds, then call everyone home.',[]),
 meta(4,'Pocket Reservoir','A rescue and a garden refill','Rescue first or dig the main canal first. Pick your order.','Rescue one neighbor and fill the garden with 3–5 m³ of water.',[pet(9,3)]),
 meta(5,'Across the Blue','One bridge, three neighbors','Build on a dashed bridge plan. Deep water needs a bridge.','Rescue one animal on the left and two on the right. Reuse your bridge.',[pet(3,2),pet(9,2,'groundhog'),pet(9,6,'mole','Pebble')],{bridge:1}),
 meta(6,'Water Works','Water the flowers, then head home','Dig the canal, then open the gate. A bridge keeps a crossing open.','Rescue one animal and deliver 2–3.5 m³. Gates can be opened and closed.',[pet(9,3,'groundhog')],{bridge:1,gate:1}),
 meta(7,'Open Sesame','Find a way through the rock belt','Blast the marked rocks after evacuation, or dig around either end.','Rescue both animals. Use one blast or keep the tool and take a detour.',[pet(8,3),pet(8,5,'groundhog')],{bridge:1,blast:1}),
 meta(8,'Puddle Patrol','Drain the puddle, rescue the neighbors','Close the inlet, then pump. Or blast the drainage plug.','Two animals wait on dry perches. Pump water away or open a gravity drain.',[pet(8,3),pet(8,5,'groundhog')],{bridge:1,gate:1,blast:1,pump:1}),
 meta(9,'Teamwork Garden','Three helpers, one happy garden','Send two helpers to rescue and one to dig, or take your time.','Rescue three animals and store 2.5–4.5 m³. Work in any order, with no timer.',[pet(3,2),pet(9,3,'groundhog'),pet(4,7,'mole','Pebble')],{bridge:1,gate:1,pump:1}),
 meta(10,'Travel Light','A bridge for the long way home','After crossing, blast a shortcut or dig around the outer rocks.','Rescue three neighbors. Reuse one bridge, with an optional blast.',[pet(3,2),pet(9,3,'groundhog'),pet(9,6,'mole','Pebble')],{bridge:1,blast:1}),
 meta(11,'Split the Stream','A drink for both gardens','Control the gates separately. Each garden keeps its completed record.','Deliver 2–3.5 m³ to each garden. Open either gate first, or both.',[],{bridge:1,gate:2}),
 meta(12,'Bloom Workshop','Bring the whole workshop to life','Rescue first or route the water first. The wheel needs real flowing water.','Rescue four neighbors, store 3–5 m³ and run the wheel for 2 seconds. Bring the crew home.',[pet(3,2),pet(3,7,'groundhog'),pet(8,3,'mole','Pebble'),pet(8,5,'groundhog','Walnut')],{bridge:2,gate:2,blast:2,pump:1})
];
export function engineerLayout(level,cells){
 const water=Array(99).fill(0),gates=[],bridgeSlots=[],blasts=[],pumps=[],waterGoals=[];
 const info=LEVELS[level-1];let wheel=null;
 for(const c of cells){const x=c.id%11,z=Math.floor(c.id/11);c.h=x<=2?1:2;c.type=x<=2&&z>=4&&z<=6?'camp':'soil';c.initialH=c.h;c.dug=false;c.basin=false;c.hydraulic=false;c.flower=(x===3&&z===7)||(x===4&&z===1);}
 const bed=(ids,h=0)=>{for(const id of ids){Object.assign(cells[id],{h,initialH:h,basin:true,hydraulic:true,flower:false});}return ids;};
 const pool=(ids,volume)=>{bed(ids);for(const id of ids)water[id]=volume/ids.length;if(volume/ids.length/4>.47)for(const id of ids){const x=id%11,z=Math.floor(id/11);for(const n of [x? id-1:-1,x<10?id+1:-1,z?id-11:-1,z<8?id+11:-1])if(n>=0&&!ids.includes(n))cells[n].h=cells[n].initialH=3;}return ids;};
 const soil=(id,h=2)=>Object.assign(cells[id],{type:'soil',h,initialH:h,basin:false,hydraulic:false});
 const rock=(ids,h=2)=>ids.forEach(id=>Object.assign(cells[id],{type:'rock',h,initialH:h,basin:false,hydraulic:false,flower:false}));
 const channel=(ids,plugs=[])=>{bed(ids);for(const id of plugs)Object.assign(cells[id],{h:2,initialH:2});};
 const goal=(id,name,ids,min,max)=>{bed(ids);waterGoals.push({id,name,cells:ids,min,max});};
 const gate=(id,a,b,open=false)=>gates.push({id,a,b,open,name:gates.length?'Right gate':'Inlet gate'});
 const bridge=(z)=>{const ids=[at(5,z),at(6,z)];bridgeSlots.push({id:at(4,z),name:`${z<4?'Upper':'Lower'} bridge`,cells:ids,banks:[at(4,z),at(7,z)],h:2});};
 const river=()=>{pool(rect(5,0,2,9),28.8);for(let z=0;z<9;z++){soil(at(4,z));soil(at(7,z));}bridge(2);bridge(6);};
 const basicWater=(volume=6,min=3,max=5)=>{pool(rect(5,1,2,2),volume);channel([at(6,3),at(6,4),at(6,5)],[at(6,3),at(6,4)]);goal('pond','Garden pond',rect(7,5,4,2),min,max);};
 if([3,4,6,9].includes(level)){
  basicWater(level===4?8:6,level===6?2:level===9?2.5:3,level===6?3.5:level===9?4.5:5);
  if(level===4){bed([at(7,3),at(8,3)]);}
  if([6,9].includes(level))gate(at(5,3),at(6,2),at(6,3));
  if([6,9].includes(level)){bridgeSlots.push({id:at(5,4),name:'Garden bridge',cells:[at(6,4)],banks:[at(5,4),at(7,4)],h:2});}
  if(level===9)pumps.push({id:at(9,7),name:'Garden pump',from:rect(5,1,2,2),to:rect(7,5,4,2)});
 }
 if([5,10,12].includes(level))river();
 if([7,10].includes(level)){
  const x=level===7?6:8;
  rock(Array.from({length:7},(_,i)=>at(x,i+1)));
  rock([at(x-1,4),at(x+1,4)]);
  const affected=[at(x,4),at(x-1,4),at(x+1,4),at(x,3),at(x,5)];
  blasts.push({id:at(x,4),name:'Rock gate',affected,h:1});
  for(const z of [0,8])soil(at(x,z),3);
  if(level===7)for(let z=0;z<9;z++)for(let xx=7;xx<11;xx++)soil(at(xx,z),1);
  if(level===7){pool([at(9,0),at(10,0)],2.8);bridgeSlots.push({id:at(8,0),name:'Pond bridge',cells:[at(9,0)],banks:[at(8,0),at(10,0)],h:1});}
 }
 if(level===8){
  const pit=rect(7,3,3,3),catchment=rect(7,7,3,2);
  pool(pit,12);pool(rect(7,0,2,2),4);channel([at(8,2)]);gate(at(6,1),at(8,1),at(8,2),true);
  goal('drain','Drain pool',catchment,0,99);waterGoals.pop();
  rock([at(9,6)]);blasts.push({id:at(9,6),name:'Drain plug',affected:[at(9,6)],h:0});
  pumps.push({id:at(6,4),name:'Drain pump',from:pit,to:catchment});
  soil(at(6,3),1);bridgeSlots.push({id:at(6,3),name:'Rescue bridge',cells:[at(7,3)],banks:[at(6,3),at(8,3)],h:1});
 }
 if(level===11){
  pool(rect(6,0,3,2),12);
  channel([at(6,2),at(6,3),at(5,3),at(8,2),at(8,3)]);
  goal('gardenA','Garden A',rect(4,4,2,2),2,3.5);goal('gardenB','Garden B',rect(8,4,2,2),2,3.5);
  gate(at(5,2),at(6,1),at(6,2));gate(at(9,2),at(8,1),at(8,2));gates[0].name='Left gate';
  bridgeSlots.push({id:at(7,3),name:'Canal bridge',cells:[at(8,3)],banks:[at(7,3),at(9,3)],h:2});
 }
 if(level===12){
  pool([at(8,0),at(9,0),at(10,0),at(8,1),at(9,1)],8);channel([at(9,2),at(9,3),at(9,4),at(9,5)],[at(9,2)]);
  goal('workshop','Workshop pond',rect(8,6,3,2),3,5);
  pool([at(8,3),at(8,4),at(8,5)],2);gate(at(7,1),at(9,1),at(9,2));gate(at(8,2),at(9,3),at(8,3));
  wheel={id:at(10,3),edge:[at(9,2),at(9,3)],name:'Workshop wheel'};
  soil(at(7,3),2);soil(at(7,5),2);pumps.push({id:at(7,2),name:'Side-pool pump',from:[at(8,3),at(8,4),at(8,5)],to:rect(8,6,3,2)});
  rock([at(8,8)]);blasts.push({id:at(8,8),name:'Bank rocks',affected:[at(8,8)],h:1});
  rock([at(10,4)]);blasts.push({id:at(10,4),name:'Shore rocks',affected:[at(10,4)],h:1});
 }
 for(const a of info.animals){
  const c=cells[a.id];c.type='ore';c.h=c.initialH=[8,12].includes(level)&&a.id%11>6?1:0;c.flower=false;c.basin=true;
  // Dry-bank access for the non-flooded burrows; flooded level 8 keeps water
  // work spots around the raised animal perches until drainage succeeds.
  if(level!==8&&!(level===12&&a.id%11>6))for(const n of [a.id-1,a.id+1,a.id-11,a.id+11])if(n>=0&&n<99&&cells[n].type==='soil'&&!cells[n].hydraulic)soil(n,1);
 }
 for(const b of bridgeSlots)for(const id of b.banks){cells[id].h=cells[id].initialH=b.h;}
 // The left animal's access ramp must not open the source pool's bank.
 if(level===9)soil(at(4,2),2);
 // The lower left burrow must not lower the riverbank while making its ramp.
 if(level===12)soil(at(4,7),2);
 // Keep camp and its approach stable; no source can inject water here.
 for(const id of rect(0,4,3,3))Object.assign(cells[id],{type:'camp',h:1,initialH:1,basin:false,hydraulic:false,flower:false});
 return {water,gates,bridgeSlots,blasts,pumps,waterGoals,wheel};
}
