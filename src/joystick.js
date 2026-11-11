export function stickVector(x,y){
 const length=Math.hypot(x,y);if(length<.12)return {side:0,forward:0};
 const strength=Math.min(1,(length-.12)/.88);
 return {side:x/length*strength,forward:-y/length*strength};
}
export function movementAxes(keys,stick={side:0,forward:0}){
 let side=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))+stick.side;
 let forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'))+stick.forward;
 const length=Math.max(1,Math.hypot(side,forward));return {side:side/length,forward:forward/length};
}
export function setupJoystick(element){
 const knob=element.querySelector('.joystick-knob');let pointer=null,stick={side:0,forward:0},enabled=false;
 const release=()=>{const id=pointer;pointer=null;stick={side:0,forward:0};element.classList.remove('is-held');if(id!==null&&element.hasPointerCapture(id))element.releasePointerCapture(id);};
 function move(e){const box=element.getBoundingClientRect(),radius=box.width*.34;stick=stickVector((e.clientX-box.left-box.width/2)/radius,(e.clientY-box.top-box.height/2)/radius);}
 element.addEventListener('pointerdown',e=>{if(!enabled||pointer!==null||e.button!==0)return;e.preventDefault();e.stopPropagation();pointer=e.pointerId;element.setPointerCapture(pointer);element.focus({preventScroll:true});element.classList.add('is-held');move(e);});
 element.addEventListener('pointermove',e=>{if(pointer!==e.pointerId)return;e.preventDefault();move(e);});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(type,e=>{if(e.pointerId===pointer)release();});
 window.addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{if(document.hidden)release();});
 return {update(keys,canMove){
  enabled=canMove;if(!enabled)release();const axes=enabled?movementAxes(keys,stick):{side:0,forward:0};
  knob.style.transform=`translate(${axes.side*30}px,${-axes.forward*30}px)`;
  element.dataset.side=axes.side.toFixed(3);element.dataset.forward=axes.forward.toFixed(3);element.setAttribute('aria-disabled',String(!enabled));
  return axes;
 },reset:release};
}
