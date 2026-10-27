import * as THREE from 'three';
import {RoundedBoxGeometry} from '../vendor/RoundedBoxGeometry.js';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';
// New local block-toy kit. Preserve the gameplay camp and animal-pad socket.
export async function preloadGarden(){}
export function setGardenTime(){}
export function createGardenCamp(){
 const root=new THREE.Group();root.name='RescueCrewFieldStation';
 const colors={cream:'#fff1d3',ink:'#29495c',coral:'#e88065',light:'#f9b68c',mint:'#5aa493',teal:'#337f80',sand:'#dbb48a'},pieces=[];
 function box(size,key,pos,rot=[0,0,0],r=.025){
  const source=new RoundedBoxGeometry(...size,2,Math.min(r,...size.map(v=>v*.24))),g=source.index?source.toNonIndexed():source;if(g!==source)source.dispose();g.deleteAttribute('uv');
  const mat=new THREE.Matrix4().compose(new THREE.Vector3(...pos),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),new THREE.Vector3(1,1,1));g.applyMatrix4(mat);
  const color=new THREE.Color(colors[key]||key),rgb=new Float32Array(g.attributes.position.count*3);for(let i=0;i<rgb.length;i+=3){rgb[i]=color.r;rgb[i+1]=color.g;rgb[i+2]=color.b;}
  g.setAttribute('color',new THREE.BufferAttribute(rgb,3));pieces.push(g);
 }
 box([1.85,.12,1.70],'sand',[-.20,.02,-.18]);
 for(const x of [-.91,.47])for(const z of [-.82,.26]){box([.07,.99,.07],'teal',[x,.52,z]);box([.12,.06,.12],'cream',[x,.12,z]);}
 for(let i=0;i<6;i++){const x=-.95+i*.30;box([.30,.08,1.36],i%2?'cream':'coral',[x,.99+Math.sin((i+.5)/6*Math.PI)*.16,-.29],[0,0,i<3?.20:-.20]);}
 box([1.64,.18,.08],'teal',[-.20,.97,.45]);
 for(let i=0;i<5;i++)box([.07,.07,.015],'cream',[-.51+i*.15,.98,.498]);
 box([.75,.18,.43],'cream',[-.40,.17,-.65]);box([.25,.22,.25],'mint',[-.79,.28,-.63]);
 box([.86,.19,.72],'teal',[.66,.13,.30]);box([.78,.09,.65],'cream',[.66,.265,.30]);
 for(const x of [.32,1.0])box([.035,.14,.67],'coral',[x,.27,.30]);
 for(const z of [-.02,.62])box([.73,.14,.035],'coral',[.66,.27,z]);
 box([.04,1.50,.04],'ink',[-.99,.77,-.80]);box([.37,.24,.035],'coral',[-.82,1.39,-.80]);box([.16,.07,.04],'cream',[-.83,1.40,-.78]);
 box([.32,.27,.31],'mint',[-.95,.18,.63]);box([.35,.05,.33],'cream',[-.95,.33,.63]);box([.35,.08,.06],'teal',[-.95,.20,.80]);
 box([.20,.32,.20],'coral',[.50,.24,-.78]);box([.11,.07,.11],'cream',[.50,.43,-.78]);
 const geometry=mergeGeometries(pieces,false);pieces.forEach(g=>g.dispose());
 const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.75,metalness:.015}));mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
 const unit=1.08;root.scale.setScalar(unit);root.userData.cratePosition=new THREE.Vector3(.66*unit,.31*unit-.17,.30*unit);return root;
}
