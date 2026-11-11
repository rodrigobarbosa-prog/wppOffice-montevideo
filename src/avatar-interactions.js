import * as THREE from '../vendor/three.module.js';

export function avatarActions(target,self){
 if(target===self)return [];
 return target==='collaborator'?['screen','attention']:['client','presenter'].includes(target)?['attention']:[];
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

export function setupAvatarInteractions({canvas,camera,people,solids,getRole,isActive,isDragging,onAction,extraOcclusion=()=>false}){
 const menu=document.getElementById('avatar-actions'),title=document.getElementById('avatar-action-name'),attention=document.getElementById('avatar-attention'),screen=document.getElementById('screen-open');
 const names={client:'Client',presenter:'Presenter',collaborator:'Brian'},ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),anchor=new THREE.Vector3();
 let target=null,lastHit=0,lastCheck=0,dismissedUntil=0;
 const hide=()=>{menu.hidden=true;target=null;};
 function occluded(to){
  if(extraOcclusion(camera.position,to))return true;
  const from=camera.position,steps=Math.ceil(from.distanceTo(to)/.12);
  for(let i=1;i<steps;i++){const t=i/steps,x=from.x+(to.x-from.x)*t,y=from.y+(to.y-from.y)*t,z=from.z+(to.z-from.z)*t;if(solids.some(s=>y>s.bottom&&y<s.top&&x>s.x1&&x<s.x2&&z>s.z1&&z<s.z2))return true;}
  return false;
 }
 function show(role,now){if(!isActive()){hide();return;}target=role;lastHit=now;menu.hidden=false;title.textContent=names[role];screen.hidden=!avatarActions(role,getRole()).includes('screen');attention.textContent='Call '+(role==='collaborator'?'Brian’s':names[role]+'’s')+' attention';menu.dataset.target=role;}
 const dismiss=()=>{hide();dismissedUntil=performance.now()+1200;canvas.focus();};
 document.getElementById('avatar-actions-close').onclick=dismiss;
 attention.onclick=()=>{if(target&&isActive())onAction(target,'attention');dismiss();};
 screen.addEventListener('click',dismiss);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')dismiss();});
 canvas.addEventListener('keydown',e=>{if(isActive()&&e.key.toLowerCase()==='f'&&target&&!menu.hidden)attention.focus();});
 return {get target(){return menu.hidden?null:target;},update(now){
  if(!isActive()||now<dismissedUntil){hide();return;}
  if(target&&!people[target].visible){hide();return;}
  const held=!menu.hidden&&(menu.matches(':hover')||menu.contains(document.activeElement));
  if(!held&&now-lastCheck>90){
   lastCheck=now;pointer.set(0,0);camera.updateMatrixWorld();ray.setFromCamera(pointer,camera);
   const hits=[];for(const [role,person] of Object.entries(people))if(role!==getRole()&&person.visible){person.updateWorldMatrix(true,true);const hit=ray.intersectObject(person,true).find(h=>h.object.isSkinnedMesh);if(hit&&hit.distance<6&&!occluded(hit.point))hits.push({role,hit});}
   hits.sort((a,b)=>a.hit.distance-b.hit.distance);if(hits[0])show(hits[0].role,now);
  }
  if(!held&&now-lastHit>650)hide();
  if(target){anchor.copy(people[target].position);anchor.y+=people[target].userData.animation?.gesture==='seated'?1.4:1.95;anchor.project(camera);menu.style.left=Math.max(12,Math.min(innerWidth-250,(anchor.x+1)*innerWidth/2+12))+'px';menu.style.top=Math.max(85,Math.min(innerHeight-180,(-anchor.y+1)*innerHeight/2))+'px';}
 },hide};
}
