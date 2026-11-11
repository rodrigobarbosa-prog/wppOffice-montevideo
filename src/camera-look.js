const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

// Filter manual input, not the camera's absolute orientation: scripted arrival,
// following and role changes remain authoritative and never fight an old target.
// Exponential damping uses seconds, so response does not depend on refresh rate.
export function createCameraLook({response=18,mouseSensitivity=.0022,touchSensitivity=.0026,maxSpeed=3.2,pitchLimit=1.35,maxPending=.55}={}){
 let horizontal=0,vertical=0;
 function reset(){horizontal=vertical=0;}
 return {reset,
  input(dx,dy,pointerType='mouse'){
   if(!Number.isFinite(dx)||!Number.isFinite(dy))return;
   const sensitivity=pointerType==='touch'?touchSensitivity:mouseSensitivity;
   // Bound the backlog from an outlier or stalled tab; no long inertial spin.
   horizontal=clamp(horizontal-dx*sensitivity,-maxPending,maxPending);
   vertical=clamp(vertical-dy*sensitivity,-maxPending,maxPending);
  },
  update(yaw,pitch,dt){
   if(!Number.isFinite(dt)||dt<=0)return {yaw,pitch,changed:false};
   if(dt>.25){reset();return {yaw,pitch,changed:false};}
   const blend=1-Math.exp(-response*dt),limit=maxSpeed*dt;
   const dx=clamp(horizontal*blend,-limit,limit),dy=clamp(vertical*blend,-limit*.75,limit*.75);
   const nextPitch=clamp(pitch+dy,-pitchLimit,pitchLimit);
   horizontal-=dx;vertical=nextPitch!==pitch+dy?0:vertical-dy;
   if(Math.abs(horizontal)<1e-6)horizontal=0;
   if(Math.abs(vertical)<1e-6)vertical=0;
   return {yaw:yaw+dx,pitch:nextPitch,changed:dx!==0||nextPitch!==pitch};
  }
 };
}
