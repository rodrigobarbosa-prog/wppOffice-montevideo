export const liftArrival={client:{x:0,z:3.85,yaw:-.10,pitch:.025},host:{x:.45,z:.65},exit:{x:0,z:2.0}};
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);};
export function createArrivalIntro(){
 let time=0,phase='pending',afterVoice=0,duration=15;
 return {
  get active(){return phase!=='complete';},get phase(){return phase;},
  start(audioDuration=15){if(phase==='pending'){duration=audioDuration;phase='rising';}},
  update(dt,{audioFinished=false,audioTime=0}={}){
   if(phase==='pending'||phase==='complete')return {phase,door:phase==='complete'?1:0,exit:phase==='complete'?1:0,floor:phase==='complete'?14:10,rideProgress:phase==='complete'?1:0};
   // Returning from a hidden tab must not jump the camera through the doors.
   const step=Math.max(0,Math.min(.1,dt));time=Math.max(time+step,Math.min(duration,Number.isFinite(audioTime)?audioTime:0));
   // Only audio completion releases the doors; a delayed voice keeps the lift rising.
   if(phase==='rising'&&audioFinished){phase='arriving';afterVoice=0;}else if(phase!=='rising')afterVoice+=step;
   const door=phase==='rising'?0:smooth((afterVoice-.32)/2.05),exit=phase==='rising'?0:smooth((afterVoice-2.7)/2.9);
   if(phase!=='rising')phase=afterVoice<.32?'arriving':afterVoice<2.7?'opening':afterVoice<5.6?'exiting':'complete';
   const rideProgress=phase==='rising'?smooth(time/Math.max(3,duration)):1;
   return {phase,door,exit,rideProgress,floor:phase==='rising'?Math.min(13,10+Math.floor(4*rideProgress)):14,sway:0,cameraYaw:-.10*(1-rideProgress),cameraPitch:.025*(1-rideProgress),greeting:door>.85};
  }
 };
}

export function liftSeparates(from,to,door){
 if(door>=.999||Math.abs(to.z-from.z)<.0001)return false;
 const t=(2.67-from.z)/(to.z-from.z);if(t<=0||t>=1)return false;
 const x=from.x+(to.x-from.x)*t,y=(from.y??1.5)+((to.y??1.5)-(from.y??1.5))*t;
 return Math.abs(x)<1.02&&y>0&&y<2.4;
}
