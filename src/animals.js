import * as THREE from 'three';
import {RoundedBoxGeometry} from '../vendor/RoundedBoxGeometry.js';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';

const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.73,metalness:0});
const templates=new Map();
function part(name){const g=new THREE.Group();g.name=name;g.userData.parts=[];return g;}
function block(group,d,color,p,rotation=[0,0,0],bevel=.015){
 const indexed=new RoundedBoxGeometry(...d,1,Math.min(bevel,...d.map(v=>v*.4))),g=indexed.index?indexed.toNonIndexed():indexed;if(g!==indexed)indexed.dispose();g.deleteAttribute('uv');
 g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(1,1,1)));
 const c=new THREE.Color(color),rgb=new Float32Array(g.attributes.position.count*3);for(let i=0;i<rgb.length;i+=3){rgb[i]=c.r;rgb[i+1]=c.g;rgb[i+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(rgb,3));group.userData.parts.push(g);
}
function finish(group){const parts=group.userData.parts,g=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());g.computeBoundingSphere();const mesh=new THREE.Mesh(g,material);mesh.name=group.name+'Surface';mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);delete group.userData.parts;return group;}
function template(kind){
 if(templates.has(kind))return templates.get(kind);
 const mole=kind==='mole',model=new THREE.Group(),body=part(mole?'moleBody':'groundhogBody'),head=part(mole?'moleHead':'groundhogHead'),eyes=part('blockEyes');
 const fur=mole?'#737e8b':'#ad7857',shade=mole?'#566573':'#79553f',light=mole?'#a1abb4':'#cda17a',cream='#f3dfbc',pink='#d58c83',ink='#293449';
 // Squared silhouettes, broad paws and stepped contours read as carved toy blocks.
 block(body,mole?[.43,.40,.35]:[.44,.43,.34],fur,[0,.25,-.015],[0,0,0],.035);
 block(body,mole?[.235,.25,.025]:[.27,.29,.027],mole?light:cream,[0,.235,.169],[0,0,0],.018);
 for(const side of [-1,1]){
  block(body,[.145,.085,.18],shade,[side*.13,.043,.05],[0,side*-.08,0],.012);
  block(body,mole?[.18,.106,.18]:[.115,.17,.11],mole?light:fur,[side*(mole?.258:.246),mole?.17:.255,.085],[0,0,side*(mole?-.12:-.22)],.014);
  if(mole)for(let i=0;i<3;i++)block(body,[.021,.025,.036],cream,[side*.258+(i-1)*.044,.155,.184],[0,0,0],.003);
 }
 block(body,mole?[.08,.065,.14]:[.14,.105,.22],shade,[0,.115,mole?-.22:-.245],[mole?-.18:-.35,0,0],.012);
 finish(body);model.add(body);
 head.position.y=mole?.455:.49;
 block(head,mole?[.395,.27,.325]:[.37,.30,.305],fur,[0,0,0],[0,0,0],.031);
 if(mole){
  // Long pale shovel nose and low brow distinguish the mole from the upright hog.
  block(head,[.23,.12,.14],light,[0,-.061,.19],[0,0,0],.018);
  block(head,[.082,.059,.032],pink,[0,-.052,.269],[0,0,0],.009);
  for(const side of [-1,1])block(head,[.043,.028,.013],shade,[side*.103,.075,.163],[0,0,side*-.12],.003);
 }else{
  for(const side of [-1,1]){
   block(head,[.105,.095,.10],fur,[side*.145,.146,-.012],[0,0,side*-.12],.013);
   block(head,[.052,.048,.012],pink,[side*.145,.153,.045],[0,0,side*-.12],.005);
   block(head,[.104,.09,.045],cream,[side*.051,-.063,.158],[0,0,0],.012);
  }
  block(head,[.064,.042,.027],shade,[0,-.031,.189],[0,0,0],.006);
  for(const side of [-1,1])block(head,[.025,.037,.014],'#fff4dd',[side*.015,-.118,.185],[0,0,0],.003);
 }
 for(const side of [-1,1]){
  const x=side*(mole?.108:.092),y=mole?.024:.026,z=mole?.17:.16;
  block(eyes,[.039,.047,.014],ink,[x,y,z],[0,0,0],.008);
  block(eyes,[.012,.014,.005],'#fff7dc',[x-.006,y+.009,z+.01],[0,0,0],.002);
  if(!mole)block(head,[.026,.012,.007],pink,[side*.128,-.028,.159],[0,0,0],.003);
 }
 finish(eyes);head.add(eyes);finish(head);model.add(head);
 templates.set(kind,model);return model;
}

// Local authored geometry; signature stays async for the existing startup flow.
export async function preloadAnimals(){template('mole');template('groundhog');}
export function createAnimal(kind='mole'){
 kind=kind==='groundhog'?'groundhog':'mole';
 const root=new THREE.Group(),visual=new THREE.Group(),model=template(kind).clone(true);
 root.name=kind==='mole'?'BlockMole':'BlockGroundhog';visual.name='blockAnimalVisual';visual.add(model);root.add(visual);
 const head=model.getObjectByName(kind==='mole'?'moleHead':'groundhogHead'),eyes=model.getObjectByName('blockEyes');
 root.userData.kind=kind;root.userData.rig={visual,model,head,eyes,headRest:head.quaternion.clone(),unit:1};root.userData.source='BLOCK & BLOOM original authored toy geometry';
 return root;
}
export function animateAnimal(root,{time=0,carried=false,resting=false}={}){
 const {visual,head,headRest,eyes}=root.userData.rig,phase=time+(root.userData.kind==='mole'?1.4:3);
 const breathe=Math.sin(phase*(carried?2.2:1.8));visual.scale.set(1,1+breathe*.012,1);visual.rotation.z=carried?Math.sin(phase*1.5)*.018:0;
 head.quaternion.copy(headRest);head.rotation.x=Math.sin(phase*.8)*.028+(carried?-.025:0);head.rotation.y=Math.sin(phase*.61)*(resting?.06:.09);head.rotation.z=Math.sin(phase*.9)*.018;
 eyes.scale.y=(phase%4.6)<.13?.12:1;
}
