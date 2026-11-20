import * as THREE from '../vendor/three.module.js';
export const socialGestures=Object.freeze({thumbsUp:2.6,point:3.2,no:2.4});
export function validSocialGesture(kind,point){return Object.hasOwn(socialGestures,kind)&&(kind!=='point'||point&&[point.x,point.y,point.z].every(Number.isFinite)&&Math.abs(point.x)<=100&&Math.abs(point.z)<=100&&point.y>=-.2&&point.y<=6);}
const pointTurnDuration=.58,pointRelease=.4;
const smooth=t=>t*t*(3-2*t);
export function isPointing(gesture,now){
 return gesture?.kind==='point'&&now>=gesture.started&&now-gesture.started<socialGestures.point*1000;
}
export function pointTurnAngle(gesture,position,heading,now,limit=Infinity){
 if(!isPointing(gesture,now))return 0;
 const dx=gesture.point.x-position.x,dz=gesture.point.z-position.z;
 if(Math.hypot(dx,dz)<.01)return 0;
 const time=(now-gesture.started)/1000,start=gesture.heading??heading;
 const delta=Math.atan2(dx,dz)-start,offset=start-heading;
 const angle=Math.atan2(Math.sin(delta),Math.cos(delta));
 const initial=Math.atan2(Math.sin(offset),Math.cos(offset));
 const turn=smooth(Math.min(1,time/pointTurnDuration));
 const release=smooth(Math.min(1,(socialGestures.point-time)/pointRelease));
 return Math.max(-limit,Math.min(limit,initial+angle*turn))*release;
}
const rigs=new WeakMap();
export function applySocialGesture(root,gesture,now=performance.now(),seatedTurn=0){
 if(!gesture||!validSocialGesture(gesture.kind,gesture.point))return;
 const time=(now-gesture.started)/1000,duration=socialGestures[gesture.kind];if(time<0||time>=duration)return;
 const point=gesture.kind==='point',armTime=point?time-pointTurnDuration:time;
 const weight=Math.max(0,Math.min(1,armTime/.3,(duration-time)/.4));
 let rig=rigs.get(root);if(!rig){const joints=new Map();root.traverse(b=>{if(b.isBone&&!b.name.includes('__skin'))joints.set(b.name.replace(/^mixamorig\d*/,''),b);});rig={joints,origin:new THREE.Vector3(),end:new THREE.Vector3(),direction:new THREE.Vector3(),target:new THREE.Vector3(),q:new THREE.Quaternion(),parent:new THREE.Quaternion(),swing:new THREE.Quaternion(),up:new THREE.Vector3(0,1,0)};rigs.set(root,rig);}
 const {joints,origin,end,direction,target,q,parent,swing,up}=rig;
 if(point){
  const spine=joints.get('Spine');
  if(seatedTurn&&spine){
   root.updateWorldMatrix(true,true);
   spine.getWorldQuaternion(q).premultiply(swing.setFromAxisAngle(up,seatedTurn));
   spine.parent.getWorldQuaternion(parent);spine.quaternion.copy(parent.invert().multiply(q));
  }
  if(armTime<=0){root.userData.animation.gesture='turn';return;}
 }
 function aim(name,child,worldDirection){const bone=joints.get(name),tip=joints.get(child);if(!bone||!tip)return;root.updateWorldMatrix(true,true);bone.getWorldPosition(origin);tip.getWorldPosition(end);direction.subVectors(end,origin).normalize();target.copy(worldDirection).normalize().lerpVectors(direction,target,weight).normalize();swing.setFromUnitVectors(direction,target);bone.getWorldQuaternion(q).premultiply(swing);bone.parent.getWorldQuaternion(parent);bone.quaternion.copy(parent.invert().multiply(q));}
 const world=(x,y,z)=>new THREE.Vector3(x,y,z).applyAxisAngle(up,root.rotation.y);
 function curl(fingers){for(const finger of fingers)for(let joint=1;joint<=3;joint++){const bone=joints.get('RightHand'+finger+joint);bone?.rotateX((joint===1?1.6:joint===2?1.5:1)*weight);}}
 if(gesture.kind==='no'){
  joints.get('Head')?.rotateY(Math.sin(time*9)*.24*weight);
 }else if(gesture.kind==='thumbsUp'){
  aim('RightArm','RightForeArm',world(-.3,-.4,.7));aim('RightForeArm','RightHand',world(0,.9,.35));
  const hand=joints.get('RightHand'),index=joints.get('RightHandIndex1'),pinky=joints.get('RightHandPinky1'),middle=joints.get('RightHandMiddle1');
  if(hand&&index&&pinky&&middle){root.updateWorldMatrix(true,true);hand.getWorldPosition(origin);const radial=index.getWorldPosition(new THREE.Vector3()).sub(pinky.getWorldPosition(new THREE.Vector3())).normalize(),forward=middle.getWorldPosition(new THREE.Vector3()).sub(origin);forward.addScaledVector(radial,-forward.dot(radial)).normalize();const normal=new THREE.Vector3().crossVectors(radial,forward).normalize(),current=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(radial,forward,normal)),desiredForward=world(0,0,1),desiredNormal=new THREE.Vector3().crossVectors(up,desiredForward);const desired=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(up,desiredForward,desiredNormal));swing.copy(desired).multiply(current.invert());hand.getWorldQuaternion(q).premultiply(swing);hand.parent.getWorldQuaternion(parent);hand.quaternion.slerp(parent.invert().multiply(q),weight);}
  curl(['Index','Middle','Ring','Pinky']);for(const [a,b] of [['RightHandThumb1','RightHandThumb2'],['RightHandThumb2','RightHandThumb3'],['RightHandThumb3','RightHandThumb4']])aim(a,b,new THREE.Vector3(0,1,0));
 }else{
  const arm=joints.get('RightArm');if(arm){root.updateWorldMatrix(true,true);arm.getWorldPosition(origin);const toward=new THREE.Vector3(gesture.point.x,gesture.point.y,gesture.point.z).sub(origin).normalize();aim('RightArm','RightForeArm',toward);aim('RightForeArm','RightHand',toward);aim('RightHand','RightHandIndex1',toward);}
  curl(['Middle','Ring','Pinky']);
 }
 root.userData.animation.gesture=gesture.kind;
}
