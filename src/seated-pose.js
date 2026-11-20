import * as THREE from '../vendor/three.module.js';

export function prepareSeatedPose(root,modelScale){
 const joints=new Map();
 root.traverse(bone=>{if(bone.isBone&&!bone.name.includes('__skin'))joints.set(bone.name.replace(/^mixamorig\d*/,''),bone);});
 root.updateWorldMatrix(true,true);
 const rootRotation=new THREE.Quaternion(),inverse=root.getWorldQuaternion(new THREE.Quaternion()).invert();
 const origin=new THREE.Vector3(),end=new THREE.Vector3();
 const legs=['Left','Right'].map((side,index)=>{
  const thigh=joints.get(side+'UpLeg'),shin=joints.get(side+'Leg'),foot=joints.get(side+'Foot'),toes=joints.get(side+'ToeBase');
  if(!thigh||!shin||!foot)return null;
  const hip=thigh.getWorldPosition(new THREE.Vector3()),knee=shin.getWorldPosition(new THREE.Vector3());
  foot.getWorldPosition(end);
  return {thigh,shin,foot,toes,upper:hip.distanceTo(knee),lower:knee.distanceTo(end),
   ankleHeight:end.y-root.position.y,stance:foot.getWorldQuaternion(new THREE.Quaternion()).premultiply(inverse),
   toeRotation:toes?.quaternion.clone(),side:index===0?1:-1};
 }).filter(Boolean);
 const hip=joints.get('Hips');
 const arms=['Left','Right'].map((side,index)=>({
  upper:joints.get(side+'Arm'),elbow:joints.get(side+'ForeArm'),hand:joints.get(side+'Hand'),
  upperDirection:new THREE.Vector3(index===0?.18:-.18,-1,.15),lowerDirection:new THREE.Vector3(0,-.7,1)
 }));
 const q=new THREE.Quaternion(),parent=new THREE.Quaternion(),swing=new THREE.Quaternion();
 const from=new THREE.Vector3(),direction=new THREE.Vector3(),target=new THREE.Vector3();
 const forward=new THREE.Vector3(),ankle=new THREE.Vector3(),axis=new THREE.Vector3(),bend=new THREE.Vector3(),knee=new THREE.Vector3();
 function aim(bone,child,worldDirection,weight){
  if(!bone||!child)return;
  bone.getWorldPosition(from);child.getWorldPosition(end);
  direction.subVectors(end,from).normalize();
  target.copy(worldDirection).normalize().lerpVectors(direction,target,weight).normalize();
  bone.getWorldQuaternion(q).premultiply(swing.setFromUnitVectors(direction,target));
  bone.parent.getWorldQuaternion(parent);bone.quaternion.copy(parent.invert().multiply(q));
 }
 return weight=>{
  if(weight<=0||!hip)return;
  weight=Math.min(1,weight);
  hip.getWorldPosition(origin);hip.position.y+=(root.position.y+.55-origin.y)*weight/modelScale;
  root.getWorldQuaternion(rootRotation);
  forward.set(0,0,1).applyQuaternion(rootRotation);
  for(const leg of legs){
   leg.thigh.getWorldPosition(origin);
   ankle.set(leg.side*.035,0,.42).applyQuaternion(rootRotation).add(origin);
   ankle.y=root.position.y+leg.ankleHeight+.004;
   axis.subVectors(ankle,origin);
   const distance=Math.min(axis.length(),leg.upper+leg.lower-.0001);
   axis.normalize();
   // The knee bends forward while ankle height comes from the model's flat standing sole.
   const along=(leg.upper**2-leg.lower**2+distance**2)/(2*distance);
   bend.copy(forward).addScaledVector(axis,-forward.dot(axis)).normalize();
   knee.copy(origin).addScaledVector(axis,along).addScaledVector(bend,Math.sqrt(Math.max(0,leg.upper**2-along**2)));
   ankle.copy(origin).addScaledVector(axis,distance);
   aim(leg.thigh,leg.shin,knee.sub(origin),weight);
   leg.shin.getWorldPosition(origin);
   aim(leg.shin,leg.foot,ankle.sub(origin),weight);
   leg.foot.parent.getWorldQuaternion(parent);
   q.copy(rootRotation).multiply(leg.stance).premultiply(parent.invert());
   leg.foot.quaternion.slerp(q,weight);
   leg.toes?.quaternion.slerp(leg.toeRotation,weight);
  }
  for(const arm of arms){
   aim(arm.upper,arm.elbow,target.copy(arm.upperDirection).applyQuaternion(rootRotation),weight);
   aim(arm.elbow,arm.hand,target.copy(arm.lowerDirection).applyQuaternion(rootRotation),weight);
  }
  root.userData.animation.gesture=weight>.98?'seated':'sit-transition';root.userData.animation.speed=0;
 };
}
