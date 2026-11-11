import * as THREE from '../vendor/three.module.js';
const rigs=new WeakMap();
// Layer an unmistakable raised hand over standing, walking or seated animation.
export function applyAttentionGesture(root,time){
 if(!(time>=0&&time<3.2))return;
 let joints=rigs.get(root);if(!joints){joints=new Map();root.traverse(b=>{if(b.isBone&&!b.name.includes('__skin'))joints.set(b.name.replace(/^mixamorig\d*/,''),b);});rigs.set(root,joints);}
 const weight=Math.min(1,time/.35,(3.2-time)/.45),up=new THREE.Vector3(0,1,0);
 function aim(name,endName,target){
  const bone=joints.get(name),end=joints.get(endName);if(!bone||!end)return;
  root.updateWorldMatrix(true,true);
  const direction=end.getWorldPosition(new THREE.Vector3()).sub(bone.getWorldPosition(new THREE.Vector3())).normalize();
  target.applyAxisAngle(up,root.rotation.y).normalize().lerpVectors(direction,target,weight).normalize();
  const q=bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(new THREE.Quaternion().setFromUnitVectors(direction,target));
  bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));
 }
 aim('RightArm','RightForeArm',new THREE.Vector3(-.65,.78,.08));
 aim('RightForeArm','RightHand',new THREE.Vector3(.16+Math.sin(time*9)*.22,1,.08));
 root.userData.animation.gesture='attention';
}
