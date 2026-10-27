// Pointer intent reducer. Multi-touch stays latched until the session ends:
// releasing a pinch must never turn the remaining finger into a terrain tap.
export function createMapGesture(){
 const points=new Map();let origin=null,mode='pending',multi=false;
 const center=()=>{const p=[...points.values()].slice(0,2);return{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2,distance:Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)};};
 function down(p){
  points.set(p.id,{...p});
  if(points.size===1){origin={...p};mode='pending';multi=false;return{type:'down',...p};}
  mode='pinch';multi=true;return{type:'pinch-start'};
 }
 function move(p){
  const old=points.get(p.id);if(!old)return null;
  const before=points.size>=2?center():null;points.set(p.id,{...p});
  if(points.size>=2){const after=center();return{type:'pinch',factor:before.distance>8?after.distance/before.distance:1,dx:after.x-before.x,dy:after.y-before.y,x:after.x,y:after.y};}
  if(mode==='inspect')return{type:'inspect-move',...p};
  if(mode==='pending'){
   if(Math.hypot(p.x-origin.x,p.y-origin.y)<8)return null;
   mode='pan';return{type:'pan',dx:p.x-origin.x,dy:p.y-origin.y};
  }
  return{type:'pan',dx:p.x-old.x,dy:p.y-old.y};
 }
 function inspect(){if(points.size!==1||mode!=='pending')return null;mode='inspect';return{type:'inspect-start',...[...points.values()][0]};}
 function up(p){
  if(!points.has(p.id))return null;
  const was=mode;points.delete(p.id);
  const tap=was==='pending'&&!multi,inspection=was==='inspect'&&!multi;
  if(points.size){mode='pan';return{type:'end'};}
  mode='pending';origin=null;multi=false;
  return tap?{type:'tap',...p}:inspection?{type:'inspect-end',...p}:{type:'end'};
 }
 function cancel(){points.clear();origin=null;mode='pending';multi=false;return{type:'cancel'};}
 return{down,move,hold:inspect,up,cancel,has:id=>points.has(id),get size(){return points.size;},get mode(){return mode;}};
}
