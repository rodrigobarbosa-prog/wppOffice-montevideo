import * as THREE from '../vendor/three.module.js';
export function setupSeatInteractions({canvas,camera,seats,isActive,getMotion,getPosition,onSit,onStand,solids=[],extraOcclusion=()=>false}){
 const button=document.getElementById('seat-action'),ray=new THREE.Raycaster(),pointer=new THREE.Vector2(0,0),box=new THREE.Box3(),point=new THREE.Vector3();let selected=null;
 function use(){if(!isActive())return false;if(getMotion().active){onStand();return true;}if(selected){onSit(selected);return true;}return false;}
 button.onclick=()=>{use();canvas.focus();};
 function occluded(to,id){if(extraOcclusion(camera.position,to))return true;const from=camera.position,steps=Math.ceil(from.distanceTo(to)/.08);for(let i=1;i<steps;i++){const t=i/steps,x=from.x+(to.x-from.x)*t,y=from.y+(to.y-from.y)*t,z=from.z+(to.z-from.z)*t;if(solids.some(s=>s.seatId!==id&&x>s.x1&&x<s.x2&&z>s.z1&&z<s.z2&&y>s.bottom&&y<s.top))return true;}return false;}
 return {get target(){return button.hidden?null:selected;},use,update(){
  if(!isActive()){selected=null;button.hidden=true;return;}
  const motion=getMotion();if(motion.active){button.hidden=false;button.disabled=motion.state.phase!=='seated';button.textContent=motion.state.phase==='standing'?'Standing up…':motion.state.phase==='sitting'?'Sitting down…':'E · Stand up';return;}
  if(selected&&(button.matches(':hover')||document.activeElement===button)&&motion.canSit(selected,getPosition())){button.hidden=false;button.disabled=false;return;}
  selected=null;
  pointer.set(0,0);
  camera.updateMatrixWorld();ray.setFromCamera(pointer,camera);let closest=Infinity;
  for(const seat of seats){if(!motion.canSit(seat,getPosition()))continue;box.min.set(seat.x-.32,.05,seat.z-.32);box.max.set(seat.x+.32,1.12,seat.z+.32);const hit=ray.ray.intersectBox(box,point);if(hit){const distance=camera.position.distanceTo(hit);if(distance<closest&&!occluded(hit,seat.id)){closest=distance;selected=seat;}}}
  button.hidden=!selected;button.disabled=false;button.textContent='E · Sit here';
 }};
}
