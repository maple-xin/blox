import * as THREE from 'three';
export const VIEW_ELEVATION=37*Math.PI/180;
export function createGameCamera(){return new THREE.PerspectiveCamera(24,1,.1,180);}
export function positionGameCamera(camera,{width,height,angle,zoom=1.1,started=true,sceneView=false,pan={x:0,z:0},playArea=null}){
 const aspect=width/height,distance=6.8/Math.tan(12*Math.PI/180);
 const halfHeight=Math.max(6.8,8.8/aspect),fov=2*Math.atan(halfHeight/distance)*180/Math.PI;
 const shift=started?(sceneView?0:Math.max(0,Math.min(.65,(aspect-.6)*.8))):(aspect<.9?0:1.2);
 const tx=-Math.cos(angle)*shift,tz=Math.sin(angle)*shift;
 const target=new THREE.Vector3(.15+tx+Math.sin(angle)*1.2+pan.x,.12,tz+Math.cos(angle)*1.2+pan.z),radius=distance*Math.cos(VIEW_ELEVATION);
 camera.position.set(target.x+Math.sin(angle)*radius,target.y+Math.sin(VIEW_ELEVATION)*distance,target.z+Math.cos(angle)*radius);
 camera.lookAt(target);
 const center=playArea?(playArea.top+playArea.bottom)/2:height/2;
 const offsetY=playArea?height/2-center:0,offsetX=playArea?width/2-(playArea.left+playArea.right)/2:0;
 if(camera.aspect!==aspect||camera.fov!==fov||camera.zoom!==zoom||camera.userData.viewOffsetY!==offsetY||camera.userData.viewOffsetX!==offsetX||camera.userData.viewportW!==width||camera.userData.viewportH!==height){
  camera.aspect=aspect;camera.fov=fov;camera.zoom=zoom;
  if(offsetX||offsetY)camera.setViewOffset(width,height,offsetX,offsetY,width,height);else camera.clearViewOffset();
  camera.userData.viewOffsetY=offsetY;camera.userData.viewOffsetX=offsetX;camera.userData.viewportW=width;camera.userData.viewportH=height;camera.updateProjectionMatrix();
 }
 camera.updateMatrixWorld();return{distance,elevation:VIEW_ELEVATION};
}
export function mapPanDelta(camera,angle,dx,dy,height){
 const units=2*(6.8/Math.tan(12*Math.PI/180))*Math.tan(camera.fov*Math.PI/360)/camera.zoom/height;
 return{x:-dx*units*Math.cos(angle)-dy*units*Math.sin(angle)/Math.sin(VIEW_ELEVATION),z:dx*units*Math.sin(angle)-dy*units*Math.cos(angle)/Math.sin(VIEW_ELEVATION)};
}
