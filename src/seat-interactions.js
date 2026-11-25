import * as THREE from '../vendor/three.module.js';
import {segmentOccluded} from './visibility-segment.js';
const sit={kind:'seat',label:'Sit here'};
const stand={kind:'seat',label:'Stand up'};
const sitting={kind:'seat',label:'Sitting down…',disabled:true};
const standing={kind:'seat',label:'Standing up…',disabled:true};
export function setupSeatInteractions({camera,seats,isActive,getMotion,getPosition,onSit,onStand,solids=[],extraOcclusion=()=>false}){
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(0,0),box=new THREE.Box3(),point=new THREE.Vector3();let selected=null;
 let action=null;
 function use(){
  if(!action||action.disabled||!isActive())return false;
  if(getMotion().active){onStand();return true;}
  if(selected&&getMotion().canSit(selected,getPosition())){onSit(selected);return true;}
  return false;
 }
 function occluded(to,id){return extraOcclusion(camera.position,to)||segmentOccluded(camera.position,to,solids,id);}
 return {get target(){return selected;},get action(){return action;},use,update(){
  selected=null;action=null;
  if(!isActive())return;
  const motion=getMotion();
  if(motion.active){
   action=motion.state.phase==='standing'?standing:motion.state.phase==='sitting'?sitting:stand;
   return;
  }
  pointer.set(0,0);
  camera.updateMatrixWorld();ray.setFromCamera(pointer,camera);let closest=Infinity;
  for(const seat of seats){if(!motion.canSit(seat,getPosition()))continue;box.min.set(seat.x-.32,.05,seat.z-.32);box.max.set(seat.x+.32,1.12,seat.z+.32);const hit=ray.ray.intersectBox(box,point);if(hit){const distance=camera.position.distanceTo(hit);if(distance<closest&&!occluded(hit,seat.id)){closest=distance;selected=seat;}}}
  if(selected)action=sit;
 }};
}
