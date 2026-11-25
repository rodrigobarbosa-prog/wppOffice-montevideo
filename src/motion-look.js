const radians=Math.PI/180;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const shortestTurn=angle=>Math.atan2(Math.sin(angle),Math.cos(angle));

function screenDirection({alpha,beta,gamma}){
 if(![alpha,beta,gamma].every(Number.isFinite))return null;
 const a=alpha*radians,b=beta*radians,g=gamma*radians;
 // Apply the device's Z-X'-Y'' rotation to the camera-facing normal of the screen.
 const x=-Math.cos(a)*Math.sin(g)-Math.sin(a)*Math.sin(b)*Math.cos(g);
 const north=-Math.sin(a)*Math.sin(g)+Math.cos(a)*Math.sin(b)*Math.cos(g);
 const up=-Math.cos(b)*Math.cos(g);
 return {yaw:Math.hypot(x,north)>.15?Math.atan2(-x,north):null,pitch:Math.asin(clamp(up,-1,1))};
}

export function createMotionLook(){
 let sample=null,reference=null,pendingYaw=0,pendingPitch=0;
 function rebase(){reference=null;pendingYaw=pendingPitch=0;}
 return {
  input(event){
   const direction=screenDirection(event);
   if(!direction)return false;
   sample=direction;return true;
  },
  rebase,
  reset(){sample=null;rebase();},
  update(yaw,pitch,dt,enabled){
   const active=Boolean(enabled&&sample);
   if(!active||!Number.isFinite(dt)||dt<=0||dt>.25){
    rebase();return {yaw,pitch,active,changed:false};
   }
   if(!reference)reference=sample;
   if(reference!==sample){
    if(reference.yaw!==null&&sample.yaw!==null)pendingYaw=clamp(pendingYaw+shortestTurn(sample.yaw-reference.yaw),-.65,.65);
    pendingPitch=clamp(pendingPitch+sample.pitch-reference.pitch,-.55,.55);
    reference=sample;
   }
   const blend=1-Math.exp(-14*Math.min(dt,1/30));
   const turn=Math.abs(pendingYaw)<.00005?0:pendingYaw*blend;
   const tilt=Math.abs(pendingPitch)<.00005?0:pendingPitch*blend;
   const nextPitch=clamp(pitch+tilt,-1.35,1.35);
   pendingYaw-=turn;
   pendingPitch=nextPitch===pitch+tilt?pendingPitch-tilt:0;
   return {yaw:yaw+turn,pitch:nextPitch,active,changed:turn!==0||nextPitch!==pitch};
  }
 };
}
