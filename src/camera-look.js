const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function followCameraAngles(camera,subject,yaw,pitch,dt){
 const dx=subject.x-camera.x,dz=subject.z-camera.z,distance=Math.hypot(dx,dz);
 if(distance<.05)return {yaw,pitch};
 const yawDelta=Math.atan2(-dx,-dz)-yaw;
 const targetPitch=Math.atan2(subject.y-camera.y,distance);
 const blend=1-Math.exp(-5*Math.min(dt,.12));
 return {yaw:yaw+Math.atan2(Math.sin(yawDelta),Math.cos(yawDelta))*blend,pitch:pitch+(targetPitch-pitch)*blend};
}

// Filter manual input, not the camera's absolute orientation: scripted arrival,
// following and role changes remain authoritative and never fight an old target.
// Exponential damping uses seconds, so response does not depend on refresh rate.
export function createCameraLook({response=20,mouseSensitivity=.0033,touchSensitivity=.0026,maxSpeed=3.2,pitchLimit=1.35,maxPending=.55}={}){
 let horizontal=0,vertical=0;
 function reset(){horizontal=vertical=0;}
 return {reset,
  get settling(){return Math.abs(horizontal)>.004||Math.abs(vertical)>.004;},
  input(dx,dy,pointerType='mouse'){
   if(!Number.isFinite(dx)||!Number.isFinite(dy))return;
   const sensitivity=pointerType==='touch'?touchSensitivity:mouseSensitivity;
   // Bound the backlog from an outlier or stalled tab; no long inertial spin.
   horizontal=clamp(horizontal-dx*sensitivity,-maxPending,maxPending);
   vertical=clamp(vertical-dy*sensitivity,-maxPending,maxPending);
  },
  update(yaw,pitch,dt){
   if(!Number.isFinite(dt)||dt<=0||maxSpeed===0)return {yaw,pitch,changed:false};
   if(dt>.25){reset();return {yaw,pitch,changed:false};}
   // Spread a missed frame's rotation across the next few frames.
   const step=Math.min(dt,1/30),blend=1-Math.exp(-response*step);
   const yawLimit=maxSpeed*step,pitchSpeed=yawLimit*.75;
   const dx=yawLimit*Math.tanh(horizontal*blend/yawLimit);
   const dy=pitchSpeed*Math.tanh(vertical*blend/pitchSpeed);
   const nextPitch=clamp(pitch+dy,-pitchLimit,pitchLimit);
   horizontal-=dx;vertical=nextPitch!==pitch+dy?0:vertical-dy;
   if(Math.abs(horizontal)<1e-6)horizontal=0;
   if(Math.abs(vertical)<1e-6)vertical=0;
   return {yaw:yaw+dx,pitch:nextPitch,changed:dx!==0||nextPitch!==pitch};
  }
 };
}
