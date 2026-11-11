import {createClientFollower,findFollowPath} from './client-follow.js';

export function createWorkstationVisit({station,blocked}){
 const walker=createClientFollower({distance:.12});let phase='idle',goal=null;
 return {
  get phase(){return phase;},
  start(client){
   const candidates=[];
   for(const distance of [1.25,1.75])for(const [dx,dz] of [[1,0],[1,1],[1,-1],[0,1],[0,-1],[-1,0]]){
    const length=Math.hypot(dx,dz),point={x:station.x+dx/length*distance,z:station.z+dz/length*distance};
    if(blocked(point.x,point.z))continue;
    const path=findFollowPath(client,point,blocked);if(!path.length)continue;
    let cost=0,previous=client;for(const p of path){cost+=Math.hypot(p.x-previous.x,p.z-previous.z);previous=p;}
    candidates.push({point,cost});
   }
   candidates.sort((a,b)=>a.cost-b.cost);goal=candidates[0]?.point||null;
   if(!goal){phase='idle';return false;}phase='approaching';walker.reset();return true;
  },
  update(dt,client){
   if(phase!=='approaching')return {...client,speed:0,arrived:false};
   const next=walker.update(dt,client,goal,blocked);
   const arrived=Math.hypot(next.x-goal.x,next.z-goal.z)<.22;
   if(arrived)phase='viewing';return {...next,arrived};
  },
  cancel(){phase='idle';goal=null;walker.reset();}
 };
}
