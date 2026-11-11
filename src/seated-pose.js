import * as THREE from '../vendor/three.module.js';
const rigs=new WeakMap();
export function applySeatedPose(root,weight=1){
 if(weight<=0)return;weight=Math.min(1,weight);
 let rig=rigs.get(root);if(!rig){const bones=[];root.traverse(o=>{if(o.isBone&&!o.name.includes('__skin'))bones.push(o);});rig={joint:name=>bones.find(b=>b.name.replace(/^mixamorig\d*/,'')===name),q:new THREE.Quaternion(),parent:new THREE.Quaternion(),swing:new THREE.Quaternion(),origin:new THREE.Vector3(),direction:new THREE.Vector3(),target:new THREE.Vector3(),up:new THREE.Vector3(0,1,0)};rigs.set(root,rig);}
 const {joint,q,parent,swing,origin,direction,target,up}=rig,hip=joint('Hips');if(!hip)return;
 root.updateWorldMatrix(true,true);const scale=root.children[0].scale.x;hip.getWorldPosition(origin);hip.position.y+=(root.position.y+.55-origin.y)*weight/scale;
 function aim(name,child,vector){const bone=joint(name),end=joint(child);if(!bone||!end)return;root.updateMatrixWorld(true);bone.getWorldPosition(origin);end.getWorldPosition(direction).sub(origin).normalize();target.copy(vector).applyAxisAngle(up,root.rotation.y);target.lerpVectors(direction,target.normalize(),weight).normalize();swing.setFromUnitVectors(direction,target);bone.getWorldQuaternion(q).premultiply(swing);bone.parent.getWorldQuaternion(parent);bone.quaternion.copy(parent.invert().multiply(q));bone.updateWorldMatrix(false,true);}
 for(const side of ['Left','Right']){aim(side+'UpLeg',side+'Leg',new THREE.Vector3(side==='Left'?.05:-.05,-.10,1));aim(side+'Leg',side+'Foot',new THREE.Vector3(0,-1,.03));aim(side+'Foot',side+'ToeBase',new THREE.Vector3(0,0,1));aim(side+'Arm',side+'ForeArm',new THREE.Vector3(side==='Left'?.18:-.18,-1,.15));aim(side+'ForeArm',side+'Hand',new THREE.Vector3(0,-.7,1));}
 root.userData.animation.gesture=weight>.98?'seated':'sit-transition';root.userData.animation.speed=0;
}
