const mix=(a,b,t)=>a+(b-a)*t;
export function createRemoteMotion({delay=120,teleportDistance=4}={}){
 const peers=new Map();
 return {
  push(id,pose,now){
   if(!pose||![pose.x,pose.z].every(Number.isFinite)){peers.delete(id);return;}
   let frames=peers.get(id)||[];const last=frames.at(-1);
   if(last&&Number.isFinite(pose.sequence)&&Number.isFinite(last.pose.sequence)&&pose.sequence<=last.pose.sequence)return;
   if(last&&(now<=last.time||Math.hypot(pose.x-last.pose.x,pose.z-last.pose.z)>teleportDistance))frames=[];
   frames.push({time:now,pose:{...pose}});while(frames.length>2&&frames[1].time<now-1000)frames.shift();peers.set(id,frames);
  },
  remove(id){peers.delete(id);},
  sample(id,now){
   const frames=peers.get(id);if(!frames?.length)return null;const latest=frames.at(-1).pose,target=now-delay;
   let a=frames[0],b=a;for(const frame of frames){if(frame.time<=target)a=frame;if(frame.time>=target){b=frame;break;}b=frame;}
   const t=b.time>a.time?Math.max(0,Math.min(1,(target-a.time)/(b.time-a.time))):0;
   const heading=a.pose.heading||0,turn=Math.atan2(Math.sin((b.pose.heading||0)-heading),Math.cos((b.pose.heading||0)-heading));
   return {...latest,x:mix(a.pose.x,b.pose.x,t),z:mix(a.pose.z,b.pose.z,t),heading:heading+turn*t,speed:mix(a.pose.speed||0,b.pose.speed||0,t)};
  }
 };
}
