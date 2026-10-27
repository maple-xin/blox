import * as THREE from 'three';
import {RoundedBoxGeometry} from '../vendor/RoundedBoxGeometry.js';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';
import {W,D,STEP,xy} from './logic.js';
export const MEADOW={grass:'#72ad83',light:'#b1cf93',dark:'#3d8069',earth:'#ba8060'};
const surface=c=>.15+c.h*STEP;
const palette=['#78ad83','#8db78d','#70a780','#9abe8d','#7aad86'];
function coloredBox(size,color,pos=[0,0,0],rot=0){
 const source=new RoundedBoxGeometry(...size,1,Math.min(.018,...size.map(v=>v*.18))),g=source.index?source.toNonIndexed():source;
 if(g!==source)source.dispose();g.rotateY(rot);g.translate(...pos);g.deleteAttribute('uv');
 const c=new THREE.Color(color),rgb=new Float32Array(g.attributes.position.count*3);
 for(let i=0;i<rgb.length;i+=3){rgb[i]=c.r;rgb[i+1]=c.g;rgb[i+2]=c.b;}
 g.setAttribute('color',new THREE.BufferAttribute(rgb,3));return g;
}
function botanical(kind){
 const bits=[];
 if(kind==='sprout'){
  bits.push(coloredBox([.035,.15,.035],'#3f896b',[0,.06,0]));
  bits.push(coloredBox([.16,.04,.075],'#92c885',[-.065,.10,0],-.3));
  bits.push(coloredBox([.15,.04,.075],'#b8d893',[.055,.15,0],.35));
 }else{
  bits.push(coloredBox([.025,.15,.025],'#418e71',[0,.075,0]));
  const tint=kind==='coral'?'#ef967f':'#fff7da';
  for(const[x,z]of[[-.068,0],[.068,0],[0,-.068],[0,.068]])bits.push(coloredBox([.075,.038,.075],tint,[x,.17,z]));
  bits.push(coloredBox([.063,.048,.063],'#f6bc55',[0,.18,0]));
 }
 const g=mergeGeometries(bits,false);bits.forEach(g=>g.dispose());return g;
}
// The fitted block kit exposes the mutable height grid. Separate pick geometry
// keeps decorative seams from changing paths, work sites, or water volume.
export function createTerrain(state,seed=42){
 const group=new THREE.Group();group.name='fittedMeadowBlocks';
 const mats=[],geos=[],pools=[];
 const material=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.78,metalness:.015,...extra});mats.push(m);return m;};
 const green=material('#ffffff'),earth=material('#ffffff'),sand=material('#c99b75'),trim=material('#e0b08a'),flora=material('#ffffff',{vertexColors:true});
 const temp=new THREE.Object3D();
 function pool(geometry,mat,count,name,shadow=true){geos.push(geometry);const m=new THREE.InstancedMesh(geometry,mat,Math.max(count,1));m.name=name;m.count=0;m.castShadow=shadow;m.receiveShadow=true;group.add(m);pools.push(m);return m;}
 function put(m,x,y,z,sx=1,sy=1,sz=1,angle=0,color=null){temp.position.set(x,y,z);temp.rotation.set(0,angle,0);temp.scale.set(sx,sy,sz);temp.updateMatrix();m.setMatrixAt(m.count,temp.matrix);if(color)m.setColorAt(m.count,new THREE.Color(color));m.count++;}
 const soil=pool(new RoundedBoxGeometry(.982,1,.982,1,.018),earth,99,'clay-building-blocks');
 const caps=pool(new RoundedBoxGeometry(.978,.075,.978,2,.025),green,99,'meadow-cap-tiles');
 const inner=pool(new RoundedBoxGeometry(.978,.055,.978,1,.014),sand,99,'excavated-sand-tiles');
 const seams=pool(new RoundedBoxGeometry(.951,.016,.951,1,.007),trim,297,'soil-layer-seams',false);
 const stud=pool(new RoundedBoxGeometry(.054,.054,.026,1,.008),material('#edcdaa'),750,'embedded-clay-chips',false);
 const pebbles=pool(new RoundedBoxGeometry(.055,.026,.055,1,.008),material('#efcfaa'),800,'square-sand-grains',false);
 const sprouts=pool(botanical('sprout'),flora,300,'block-leaf-sprouts',false);
 const flowers=pool(botanical('ivory'),flora,130,'ivory-cross-flowers',false);
 const coral=pool(botanical('coral'),flora,80,'coral-cross-flowers',false);
 let value=seed>>>0;const rand=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
 for(const c of state.cells){
  const{x,z}=xy(c.id),px=x-(W-1)/2,pz=z-(D-1)/2,y=surface(c),h=.25+c.h*STEP;
  value=(seed^Math.imul(c.id+1,2654435761))>>>0;
  put(soil,px,-.15+h/2,pz,1,h,1,0,new THREE.Color(MEADOW.earth).multiplyScalar(.94+rand()*.09));
  const grassy=c.type!=='ore'&&c.type!=='camp'&&!c.basin&&!c.dug;
  if(grassy)put(caps,px,y-.0375,pz,1,1,1,0,palette[(c.id+Math.floor(rand()*3))%palette.length]);
  else put(inner,px,y-.0275,pz);
  for(let layer=0;layer<c.h;layer++)put(seams,px,.10+layer*STEP,pz);
  for(const[dx,dz]of[[1,0],[0,1],[-1,0],[0,-1]]){
   const nx=x+dx,nz=z+dz,n=nx>=0&&nx<W&&nz>=0&&nz<D?state.cells[nz*W+nx]:null,ny=n?surface(n):-.15;
   if(ny>=y-.08)continue;const angle=dx?Math.PI/2:0;
   for(let j=0;j<2;j++){const along=(j-.5)*.36+(rand()-.5)*.08;put(stud,px+dx*.493+dz*along,ny+.06+rand()*Math.max(.02,y-ny-.16),pz+dz*.493+dx*along,1+(c.id%3)*.3,1,1,angle);}
  }
  if(!grassy){if(c.type==='camp')continue;for(let j=0;j<4;j++)put(pebbles,px+(rand()-.5)*.76,y+.012,pz+(rand()-.5)*.76,.6+rand(),.6+rand(),.6+rand(),rand()*1.5);continue;}
  if(c.type==='rock')continue;
  const edge=x===0||z===0||x===W-1||z===D-1,count=edge?3:(c.id%3===0?2:1);
  for(let j=0;j<count;j++){const a=(rand()-.5)*.75,b=(rand()-.5)*.75,s=.65+rand()*.4;put(sprouts,px+a,y,pz+b,s,s,s,rand()*Math.PI*2);}
  if(c.flower||c.id%7===0||edge&&c.id%3===0){const p=c.id%2?flowers:coral;for(let j=0;j<(c.flower?4:1);j++){const s=.75+rand()*.25;put(p,px+(rand()-.5)*.68,y,pz+(rand()-.5)*.68,s,s,s,rand()*Math.PI);}}
 }
 const pickTop=pool(new THREE.BoxGeometry(.999,.02,.999),new THREE.MeshBasicMaterial(),W*D,'invisible-rule-grid',false);mats.push(pickTop.material);
 for(const c of state.cells){const{x,z}=xy(c.id);put(pickTop,x-(W-1)/2,surface(c)-.01,z-(D-1)/2);}pickTop.visible=false;
 for(const m of pools){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.computeBoundingSphere();}
 group.userData.visual={style:'authored-beveled-block-world',tiles:99,sprouts:sprouts.count,flowers:flowers.count+coral.count,drawPools:pools.length};group.updateMatrixWorld(true);
 return {group,pickTop,setFoliageVisible(visible){sprouts.visible=flowers.visible=coral.visible=visible;},dispose(){for(const p of pools)p.dispose();for(const g of new Set(geos))g.dispose();for(const m of new Set(mats))m.dispose();}};
}
