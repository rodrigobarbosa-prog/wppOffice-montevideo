import * as THREE from '../vendor/three.module.js';
import {validSocialGesture,socialGestures} from './social-gesture.js';
export function setupSocialControls({scene,camera,people,getRole,isActive,onGesture}){
 const panel=document.createElement('div');panel.className='social-controls';panel.setAttribute('aria-label','Avatar gestures');panel.hidden=true;
 const hint=document.createElement('p');hint.className='social-hint';hint.hidden=true;
 const buttons={};for(const [kind,label,title] of [['thumbsUp','👍 Agree','Thumbs up'],['point','☝ Point','Choose a point to indicate'],['no','No','Shake your head: no']]){const button=document.createElement('button');button.textContent=label;button.title=title;button.setAttribute('aria-label',title);button.dataset.gesture=kind;panel.append(button);buttons[kind]=button;}
 panel.append(hint);document.getElementById('visit-action-dock').append(panel);
 const ray=new THREE.Raycaster(),center=new THREE.Vector2(0,0),markers=new Map(),markerGroup=new THREE.Group();scene.add(markerGroup);let choosing=false;
 const geometry=new THREE.SphereGeometry(.065,12,8);
 function cancel(){choosing=false;hint.hidden=true;buttons.point.textContent='☝ Point';buttons.point.setAttribute('aria-pressed','false');}
 function play(kind,point,role=getRole()){
  if(!validSocialGesture(kind,point)||!people[role])return;
  const actor=people[role],started=performance.now();
  actor.userData.socialGesture={kind,point:point?{...point}:null,started,heading:actor.rotation.y};
  if(kind==='point'){let marker=markers.get(role);if(!marker){marker=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:role==='client'?'#f7d474':role==='presenter'?'#66e7d2':'#e9a3cf',depthTest:true,transparent:true}));markerGroup.add(marker);markers.set(role,marker);}marker.position.set(point.x,point.y,point.z);marker.userData.until=started+socialGestures.point*1000;}
 }
 function confirm(){
  if(!choosing||!isActive())return false;
  camera.updateMatrixWorld();ray.setFromCamera(center,camera);ray.near=.15;ray.far=25;
  const roots=scene.children.filter(o=>o!==markerGroup&&!Object.values(people).includes(o)&&!o.isLight);
  const hit=ray.intersectObjects(roots,true).find(hit=>hit.object.visible&&hit.object.isMesh);
  if(!hit){hint.textContent='Look at a nearby surface, then press Point here.';return true;}
  const point={x:hit.point.x,y:hit.point.y,z:hit.point.z};if(!validSocialGesture('point',point)){hint.textContent='Choose a point inside the office.';return true;}
  play('point',point);onGesture('point',point);cancel();return true;
 }
 for(const kind of ['thumbsUp','no'])buttons[kind].onclick=()=>{if(!isActive())return;cancel();play(kind);onGesture(kind);};
 buttons.point.onclick=()=>{if(!isActive())return;if(choosing){confirm();return;}choosing=true;buttons.point.textContent='Point here';buttons.point.setAttribute('aria-pressed','true');hint.textContent='Aim the center dot, then press Point here or E. Esc cancels.';hint.hidden=false;document.getElementById('scene').focus();};
 document.addEventListener('keydown',event=>{if(event.key==='Escape')cancel();});
 return {get aiming(){return choosing;},play,confirm,update(now){panel.hidden=!isActive();if(panel.hidden)cancel();for(const marker of markers.values()){marker.visible=marker.userData.until>now;marker.material.opacity=Math.min(1,Math.max(0,(marker.userData.until-now)/500));}}};
}
