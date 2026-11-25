import {createClientFollower,findFollowPath} from './client-follow.js';

export function isBesideWorkstation(station,visitor){
 const dx=visitor.x-station.x,dz=visitor.z-station.z;
 const forward=dx*Math.sin(station.yaw)+dz*Math.cos(station.yaw);
 const lateral=dx*Math.cos(station.yaw)-dz*Math.sin(station.yaw);
 return forward>=-1&&forward<=.1&&Math.abs(lateral)>=.30&&Math.hypot(dx,dz)<=1.65;
}

export function createWorkstationVisit({station,blocked,occluded,canViewFrom=()=>false}){
 const step=station.approachPoints?.length? .20 : undefined;
 const walker=createClientFollower({distance:.12,occluded,step});let phase='idle',goal=null;
 return {
  get phase(){return phase;},
  start(client){
   if(canViewFrom(client)){goal=null;walker.reset();phase='viewing';return true;}
   const candidates=[];
   const points=station.approachPoints||[1.25,1.75].flatMap(distance=>[[1,0],[1,1],[1,-1],[0,1],[0,-1],[-1,0]].map(([dx,dz])=>{
    const length=Math.hypot(dx,dz);
    return {x:station.x+dx/length*distance,z:station.z+dz/length*distance};
   }));
   for(const point of points){
    if(blocked(point.x,point.z))continue;
    const path=findFollowPath(client,point,blocked,{occluded,step});if(!path.length)continue;
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
