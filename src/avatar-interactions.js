import * as THREE from '../vendor/three.module.js';
import {segmentOccluded} from './visibility-segment.js';

export function avatarActions(target,self){
 if(target===self)return [];
 return target==='collaborator'?['screen','attention']:['client','presenter'].includes(target)?['attention']:[];
}

// Interaction targets do not need a CPU skinning/raycast of every finger and
// garment triangle. Use a forgiving body volume and retain wall/door occlusion.
export function avatarTargetBounds(person,box){
 const seated=Math.max(0,Math.min(1,person.userData.seated||0)),p=person.position;
 box.min.set(p.x-.34,p.y+.08,p.z-.34);box.max.set(p.x+.34,p.y+1.85-.48*seated,p.z+.34);return box;
}

// The observer camera never changes the person's navigation position.
export function thirdPersonPosition(actor,yaw,blocked){
 let best=null;
 // In a narrow hall, slide the camera to a shoulder instead of looking straight
 // down from a few centimetres behind the head.
 for(const offset of [0,-.45,.45,-.85,.85,-1.25,1.25]){
  const angle=yaw+offset;let distance=.2;
  for(let d=.3;d<=2.8;d+=.1){if(blocked(actor.x+Math.sin(angle)*d,actor.z+Math.cos(angle)*d))break;distance=d;}
  const score=distance-Math.abs(offset)*.45;
  if(!best||score>best.score)best={x:actor.x+Math.sin(angle)*distance,y:distance<.65?1.72:2.05,z:actor.z+Math.cos(angle)*distance,score};
 }
 return {x:best.x,y:best.y,z:best.z};
}

const exploreAction={kind:'explore',label:'Explore office'};
const followAction={kind:'follow',label:'Follow presenter'};
const attentionAction={kind:'attention',label:'Get attention'};
const brianAction={kind:'brian',label:'Brian’s actions'};
export function primaryVisitAction({seatAction,target,role,following}){
 if(seatAction)return seatAction;
 if(target==='collaborator')return brianAction;
 if(role!=='client')return null;
 return following?(target==='presenter'?attentionAction:exploreAction):followAction;
}

export function setupAvatarInteractions({canvas,camera,people,solids,getRole,isActive,onAction,extraOcclusion=()=>false}){
 const menu=document.getElementById('avatar-actions'),attention=document.getElementById('avatar-attention'),screen=document.getElementById('screen-open');
 const attentionLabel=document.getElementById('avatar-attention-label');
 const names={client:'Client',presenter:'Presenter',collaborator:'Brian'};
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),hitBox=new THREE.Box3(),hitPoint=new THREE.Vector3();
 let target=null,lastCheck=-Infinity,dismissedUntil=0,brianMenuOpen=false;
 function hide(){menu.hidden=true;target=null;brianMenuOpen=false;}
 function occluded(to){
  return extraOcclusion(camera.position,to)||segmentOccluded(camera.position,to,solids);
 }
 function usesClientButton(role){return getRole()==='client'&&role==='presenter';}
 function show(role){
  if(target!==role)brianMenuOpen=false;
  target=role;
  menu.hidden=role==='collaborator'?!brianMenuOpen:usesClientButton(role);
  screen.hidden=!avatarActions(role,getRole()).includes('screen');
  attentionLabel.textContent=role==='collaborator'?'Get Brian’s attention':'Get attention';
  attention.setAttribute('aria-label','Get '+names[role]+'’s attention');
 }
 function dismiss(){hide();dismissedUntil=performance.now()+1200;canvas.focus();}
 function requestAttention(role=target){
  if(!role||role!==target||!isActive())return false;
  onAction(role,'attention');dismiss();return true;
 }
 function closeBrianActions(){
  if(!brianMenuOpen)return false;
  brianMenuOpen=false;menu.hidden=true;return true;
 }
 function toggleBrianActions(){
  if(target!=='collaborator'||!isActive())return;
  if(closeBrianActions())return;
  brianMenuOpen=true;menu.hidden=false;
  (screen.disabled?attention:screen).focus();
 }
 function activateScreenShortcut(){
  if(!brianMenuOpen||!isActive())return false;
  if(!screen.disabled)screen.click();
  return true;
 }
 function activateAttentionShortcut(){
  if(target==='collaborator'&&!brianMenuOpen||attention.disabled)return false;
  return requestAttention();
 }
 attention.onclick=()=>requestAttention();
 screen.addEventListener('click',dismiss);
 return {get target(){return target;},get brianMenuOpen(){return brianMenuOpen;},requestAttention,toggleBrianActions,closeBrianActions,activateScreenShortcut,activateAttentionShortcut,update(now){
  if(!isActive()||now<dismissedUntil){hide();return;}
  if(target&&(!people[target].visible||people[target].userData.ready===false)){hide();return;}
  const held=target!=='collaborator'&&!menu.hidden&&(menu.matches(':hover')||menu.contains(document.activeElement));
  if(held||now-lastCheck<90)return;
  lastCheck=now;camera.updateMatrixWorld();ray.setFromCamera(pointer,camera);
  let nearest=null,distance=6;
  for(const [role,person] of Object.entries(people))if(role!==getRole()&&person.visible&&person.userData.ready!==false){
   if(ray.ray.intersectBox(avatarTargetBounds(person,hitBox),hitPoint)){
    const d=camera.position.distanceTo(hitPoint);
    if(d<distance&&!occluded(hitPoint)){nearest=role;distance=d;}
   }
  }
  if(nearest)show(nearest);else hide();
 },hide};
}
