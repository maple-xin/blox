import * as THREE from 'three';
import {RoundedBoxGeometry} from '../vendor/RoundedBoxGeometry.js';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';
import {createAnimal,animateAnimal} from './animals.js';
export {createAnimal,animateAnimal} from './animals.js';
export {createGardenCamp as createCamp} from './garden.js';

// Authored toy parts: one vertex-colour draw for each independently moving part.
const paint=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.66,metalness:.025});
const metal=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.42,metalness:.2});
export const CARRY_SCALE=.48;
const leftPalm=new THREE.Vector3(),rightPalm=new THREE.Vector3();
const colors={blue:'#3c6f9a',blueLight:'#6598b9',navy:'#283a54',skin:'#efc29a',ivory:'#f4e8c9',ink:'#293449',boots:'#34445a',sole:'#223049',brass:'#efbd52',wood:'#ba7958',woodLight:'#d39b71',woodDark:'#8c5a49',steel:'#83a6a9',steelLight:'#d4e5d4'};
function part(name){const group=new THREE.Group();group.name=name;group.userData.geometryParts=[];return group;}
function add(group,geometry,color,xyz=[0,0,0],rotation=[0,0,0]){
 const g=geometry.index?geometry.toNonIndexed():geometry;
 g.deleteAttribute('uv');g.deleteAttribute('uv1');g.deleteAttribute('tangent');
 const matrix=new THREE.Matrix4().compose(new THREE.Vector3(...xyz),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(1,1,1));g.applyMatrix4(matrix);
 const c=new THREE.Color(color),rgb=new Float32Array(g.attributes.position.count*3);for(let i=0;i<rgb.length;i+=3){rgb[i]=c.r;rgb[i+1]=c.g;rgb[i+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(rgb,3));group.userData.geometryParts.push(g);if(g!==geometry)geometry.dispose();
}
function box(group,d,color,xyz,rotation=[0,0,0],radius=.008){add(group,new RoundedBoxGeometry(...d,1,Math.min(radius,...d.map(n=>n*.45))),color,xyz,rotation);}
function finish(group,material=paint){const parts=group.userData.geometryParts;if(parts.length){const g=mergeGeometries(parts,false);g.computeBoundingSphere();const m=new THREE.Mesh(g,material);m.name=group.name+'Surface';m.castShadow=true;m.receiveShadow=true;group.add(m);parts.forEach(p=>p.dispose());}delete group.userData.geometryParts;return group;}
function pickaxe(){
 const g=part('toyPickaxe');
 box(g,[.029,.30,.029],colors.woodLight,[0,-.115,0],[0,0,0],.004);
 box(g,[.037,.06,.037],colors.woodDark,[0,-.225,0],[0,0,0],.004);
 box(g,[.245,.048,.045],colors.steel,[-.006,.018,0],[0,0,-.14],.009);
 box(g,[.075,.035,.043],colors.steelLight,[-.153,-.002,0],[0,0,-.35],.004);
 box(g,[.065,.035,.043],colors.steelLight,[.133,-.015,0],[0,0,-.55],.004);
 box(g,[.045,.061,.055],colors.navy,[0,.014,0],[0,0,0],.006);
 finish(g,metal);g.children[0].position.y=.25;return g;
}

export function createMiner(helmetColor='#efbd52',variant=0){
 const root=new THREE.Group();root.name=['Pip','Rusty','Sprout'][variant%3];root.userData.variant=variant;
 const accent=new THREE.Color(helmetColor),dark=accent.clone().multiplyScalar(.72),light=accent.clone().lerp(new THREE.Color('#fff1d0'),.25);
 const uniform=['#407da2','#3b658e','#4f8986'][variant%3];
 const torso=part('blockOveralls');torso.position.y=.36;
 box(torso,[.255,.275,.187],uniform,[0,.028,0],[0,0,0],.018);
 box(torso,[.235,.073,.184],colors.ivory,[0,.137,-.003],[0,0,0],.013);
 box(torso,[.165,.12,.026],colors.blueLight,[0,.058,.103],[0,0,0],.009);
 for(const side of [-1,1]){
  box(torso,[.032,.177,.026],colors.blueLight,[side*.086,.088,.098],[0,0,side*-.05],.005);
  box(torso,[.036,.028,.018],colors.brass,[side*.085,.073,.119],[0,0,0],.004);
 }
 box(torso,[.086,.06,.014],colors.navy,[0,.035,.124],[0,0,0],.006);
 box(torso,[.047,.009,.005],colors.ivory,[0,.051,.134],[0,0,0],.001);
 box(torso,[.267,.026,.198],colors.navy,[0,-.061,0],[0,0,0],.005);
 box(torso,[.045,.032,.013],colors.brass,[0,-.061,.107],[0,0,0],.004);
 // A recognisable canvas backpack with a separate flap and square clasp.
 box(torso,[.176,.166,.074],dark,[0,.021,-.124],[0,0,0],.012);
 box(torso,[.183,.054,.081],accent,[0,.083,-.127],[0,0,0],.009);
 box(torso,[.026,.064,.012],colors.ivory,[0,.025,-.167],[0,0,0],.003);
 box(torso,[.18,.023,.16],accent,[0,.164,.001],[0,0,0],.006);
 box(torso,[.051,.065,.023],accent,[.056,.132,.094],[0,0,-.27],.004);
 finish(torso);root.add(torso);

 const head=part('blockHead');head.position.y=.635;
 const skin=['#efc29a','#cb926f','#dfb89a'][variant%3];
 box(head,[.291,.254,.249],skin,[0,.008,.003],[0,0,0],.025);
 for(const side of [-1,1]){
  box(head,[.032,.055,.056],skin,[side*.154,.008,.006],[0,0,0],.007);
  box(head,[.031,.012,.006],dark,[side*.063,.067,.132],[0,0,side*-.08],.002);
  box(head,[.028,.013,.007],'#da987e',[side*.097,-.031,.129],[0,0,0],.003);
 }
 box(head,[.032,.03,.029],skin,[0,-.005,.137],[0,0,0],.006);
 box(head,[.046,.008,.006],colors.ink,[0,-.052,.133],[0,0,0],.002);
 const eyes=part('eyes');head.add(eyes);
 for(const side of [-1,1]){
  box(eyes,[.019,.030,.009],colors.ink,[side*.06,.025,.133],[0,0,0],.004);
  box(eyes,[.006,.008,.005],colors.ivory,[side*.06-.003,.032,.14],[0,0,0],.001);
 }
 finish(eyes);
 if(variant===1){ // Rusty's dark square glasses remain readable at play distance.
  for(const side of [-1,1]){const x=side*.06;for(const y of [-.002,.052])box(head,[.062,.007,.008],colors.navy,[x,y,.141],[0,0,0],.001);for(const dx of [-.028,.028])box(head,[.007,.05,.008],colors.navy,[x+dx,.025,.141],[0,0,0],.001);}
  box(head,[.027,.007,.008],colors.navy,[0,.029,.141],[0,0,0],.001);
 }
 if(variant===0)for(const side of [-1,1])for(let i=0;i<2;i++)box(head,[.006,.006,.004],'#b47f5f',[side*(.083+i*.016),-.011,.133],[0,0,0],.001);
 // A bevelled block helmet and rim, rather than a spherical hardhat.
 box(head,[.318,.122,.278],accent,[0,.132,-.002],[0,0,0],.023);
 box(head,[.361,.029,.319],accent,[0,.088,.012],[0,0,0],.009);
 box(head,[.040,.012,.233],light,[0,.198,-.004],[0,0,0],.004);
 box(head,[.286,.015,.016],dark,[0,.097,-.148],[0,0,0],.004);
 for(const side of [-1,1])for(let i=0;i<2;i++)box(head,[.008,.015,.042],dark,[side*.161,.132,-.044+i*.067],[0,0,0],.002);
 box(head,[.074,.069,.027],colors.navy,[0,.124,.167],[0,0,0],.009);
 box(head,[.052,.047,.014],colors.ivory,[0,.124,.186],[0,0,0],.007);
 box(head,[.027,.024,.006],'#fff8de',[-.007,.133,.196],[0,0,0],.003);
 finish(head);root.add(head);

 const arms=[],legs=[];
 for(const side of [-1,1]){
  const arm=part(side<0?'leftShoulder':'rightShoulder');arm.position.set(side*.169,.482-torso.position.y,0);
  box(arm,[.084,.116,.099],colors.ivory,[side*.004,-.040,.003],[0,0,0],.012);
  box(arm,[.086,.038,.104],uniform,[side*.006,-.107,.007],[0,0,0],.006);
  box(arm,[.091,.077,.095],light,[side*.008,-.162,.012],[0,0,0],.012);
  box(arm,[.061,.016,.009],dark,[side*.008,-.145,.063],[0,0,0],.003);
  finish(arm);torso.add(arm);arms.push(arm);
  const leg=part(side<0?'leftHip':'rightHip');leg.position.set(side*.073,.2365,0);
  box(leg,[.109,.158,.133],uniform,[0,-.064,0],[0,0,0],.012);
  box(leg,[.115,.028,.139],colors.blueLight,[0,-.124,0],[0,0,0],.005);
  box(leg,[.134,.096,.195],colors.boots,[0,-.181,.027],[0,0,0],.014);
  box(leg,[.138,.023,.202],colors.sole,[0,-.225,.03],[0,0,0],.005);
  box(leg,[.082,.012,.014],colors.ivory,[0,-.166,.125],[0,0,0],.002);
  finish(leg);root.add(leg);legs.push(leg);
 }
 const tool=pickaxe();tool.position.set(.01,-.14,.055);tool.rotation.z=-.28;arms[1].add(tool);
 const carrying=new THREE.Group();carrying.name='carriedFind';carrying.add(createAnimal('mole'),createAnimal('groundhog'));carrying.scale.setScalar(CARRY_SCALE);carrying.position.set(0,.29,.30);carrying.visible=false;root.add(carrying);
 root.userData.rig={torso,head,eyes,arms,legs,tool,carrying};root.userData.forward='+z';root.userData.height=.86;return root;
}

export function animateMiner(root, { action = 'idle', time = 0, walkPhase = 0, progress = 0, carrying = false, carryingKind = 'mole', lowerBy = 0, release = 0 } = {}) {
  const { torso, head, eyes, arms, legs, tool, carrying: load } = root.userData.rig;
  const blink=(time+(root.userData.variant||0)*1.13)%4.8;eyes.scale.y=blink<.13?.15:1;
  const walking = action === 'walking' || action === 'returning';
  const working = action === 'digging' || action === 'collecting';
  const phase = walkPhase || time * 8;
  const breathe = Math.sin(time * 2.1) * 0.003;
  torso.position.y = 0.36 + breathe + (walking ? Math.abs(Math.sin(phase)) * 0.014 : 0) - lowerBy;
  torso.rotation.set(working ? 0.13 : carrying ? -0.04 : 0, 0, walking ? Math.sin(phase) * 0.022 : 0);
  head.position.y = 0.635 + breathe + (walking ? Math.abs(Math.sin(phase)) * 0.009 : 0) - lowerBy;
  head.rotation.set(working ? 0.13 : 0, Math.sin(time * 0.6) * (walking || working ? 0 : 0.075), 0);
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? -1 : 1;
    legs[i].rotation.x = walking ? Math.sin(phase + i * Math.PI) * 0.48 : 0;
    legs[i].position.y = 0.2365;
    arms[i].rotation.set(walking ? Math.sin(phase + i * Math.PI + Math.PI) * 0.36 : -0.03, 0, side * -0.08);
  }
  tool.visible = !carrying;
  tool.rotation.set(0, 0, -0.28);
  load.visible = !!carrying;
  load.scale.setScalar(CARRY_SCALE);
  load.rotation.set(0,0,0);
  for (const item of load.children) {
    item.visible = item.userData.kind === carryingKind;
    if (item.visible && carrying) animateAnimal(item, {time, carried:true});
  }
  if (carrying) {
    arms[0].rotation.set(-1.15*(1-release)-.03*release, 0, .46*(1-release)+.08*release);
    arms[1].rotation.set(-1.15*(1-release)-.03*release, 0, -.46*(1-release)-.08*release);
  } else if (action === 'collecting') {
    // Crouch and scoop up the little animal with empty hands.
    tool.visible = false;
    const reach = Math.sin(Math.min(1, Math.max(0, time / 1.6)) * Math.PI);
    const cradle = Math.max(0, Math.min(1, (time-.5)/1.1));
    torso.rotation.x = (0.12 + reach * 0.19)*(1-cradle)-.04*cradle;
    head.rotation.x = (0.12 + reach * 0.13)*(1-cradle);
    arms[0].rotation.set((-0.65 - reach * 0.28)*(1-cradle)-1.15*cradle, 0, .20+.26*cradle);
    arms[1].rotation.set((-0.65 - reach * 0.28)*(1-cradle)-1.15*cradle, 0, -.20-.26*cradle);
  } else if (working) {
    // Wind-up → fast downstroke → short contact hold. Contact is at phase 0.65.
    const cycle = ((time % 0.9) + 0.9) % 0.9 / 0.9;
    const angle = cycle < 0.5 ? -0.35 - Math.sin(cycle * Math.PI) * 1.7 : cycle < 0.68 ? -2.05 + (cycle - 0.5) / 0.18 * 1.5 : -0.55 + (cycle - 0.68) / 0.32 * 0.20;
    arms[1].rotation.set(angle, 0, -0.12);
    arms[0].rotation.set(-0.55 + Math.sin(time * 7) * 0.08, 0.1, 0.15);
    tool.rotation.z = -0.30;
    tool.rotation.x = cycle < 0.5 ? 1.7 : cycle < 0.68 ? 1.7 + (cycle - 0.5) / 0.18 * 1.6 : 3.3 - (cycle - 0.68) / 0.32 * 1.6;
    torso.rotation.x = 0.07 + Math.max(0, Math.sin((cycle - 0.45) * Math.PI * 2)) * 0.12;
  } else if (action === 'celebrate') {
    const bounce = Math.max(0, Math.sin(time * 8)) * 0.055;
    torso.position.y += bounce;
    head.position.y += bounce;
    arms[0].rotation.z = -2.35 + Math.sin(time * 7) * 0.17;
    arms[1].rotation.z = 2.35 - Math.sin(time * 7) * 0.17;
    legs[0].position.y += bounce;
    legs[1].position.y += bounce;
    tool.visible = false;
  }
  // Both palms support the lower belly. Recompute all coordinates every frame:
  // placement must never leave an old lateral offset in the next pickup.
  root.updateMatrixWorld(true);
  leftPalm.set(-.008,-.164,.012);rightPalm.set(.008,-.164,.012);
  arms[0].localToWorld(leftPalm);arms[1].localToWorld(rightPalm);
  root.worldToLocal(leftPalm);root.worldToLocal(rightPalm);
  load.position.copy(leftPalm).add(rightPalm).multiplyScalar(.5);
  load.position.y-=.075;load.position.z+=.08;
  root.userData.workContact = action === 'digging' && ((time / 0.9) % 1) > 0.63 && ((time / 0.9) % 1) < 0.73;
  root.userData.progress = progress;
}


export function createRock(seed=1,size=1){
 const root=part('blockSlateCluster'),family=Math.abs(seed)%3;
 const layouts=[
  [[[-.08,.23,0],[.66,.46,.57]],[[.28,.11,.18],[.27,.22,.31]],[[-.28,.075,.26],[.23,.15,.22]]],
  [[[-.17,.15,.04],[.42,.30,.58]],[[.14,.30,-.08],[.39,.60,.41]],[[.30,.095,.22],[.23,.19,.23]]],
  [[[.02,.21,.02],[.63,.42,.61]],[[-.30,.14,-.20],[.28,.28,.30]],[[.27,.12,.27],[.30,.24,.29]]]
 ];
 const tints=['#435875','#5d7290','#7c91a6'];
 for(const [i,[pos,d]] of layouts[family].entries()){
  box(root,d.map(v=>v*size),tints[(i+family)%3],pos.map(v=>v*size),[0,(i?-.12:.06)*(family-1),0],.035*size);
  if(i===0){box(root,[d[0]*.62,.018,d[2]*.78].map(v=>v*size),'#91a4b4',[pos[0]*size,(pos[1]+d[1]/2+.004)*size,pos[2]*size],[0,(family-1)*.06,0],.006*size);box(root,[d[0]*.53,.012,.016].map(v=>v*size),'#34485f',[(pos[0]+.045)*size,(pos[1]-.01)*size,(pos[2]+d[2]/2+.002)*size],[0,0,.07],.002*size);}
 }
 const g=finish(root);g.rotation.y=((Math.abs(seed)*13)%7-3)*.035;return g;
}
