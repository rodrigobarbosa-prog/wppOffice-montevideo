import {createClientFollower,findFollowPath} from './client-follow.js';
import {seatStandPoint} from './seating.js';
// Only chairs chosen by this controller are automatically released on resume.
export function createFollowSeating({seats,motion,blocked,occupied}){
 const walker=createClientFollower({distance:.08});let selected=null,automatic=false,retry=0;
 return {get active(){return automatic||Boolean(selected);},
  update(dt,{enabled,presenter,client,presenterSeat}){
   retry-=dt;
   if(!enabled||!presenterSeat){
    selected=null;walker.reset();
    if(automatic){if(motion.state?.phase==='seated')motion.stand();if(!motion.active)automatic=false;}
    return null;
   }
   if(motion.active)return null;
   automatic=false;
   if(selected&&(selected.host!==presenterSeat||occupied(selected.seat.id))){selected=null;walker.reset();}
   if(!selected&&retry<=0){
    retry=1;
    const candidates=seats.filter(s=>s.id!==presenterSeat&&!occupied(s.id)&&Math.hypot(s.x-presenter.x,s.z-presenter.z)<4.5)
     .sort((a,b)=>Math.hypot(a.x-presenter.x,a.z-presenter.z)-Math.hypot(b.x-presenter.x,b.z-presenter.z));
    for(const seat of candidates){const stand=seatStandPoint(seat,client,blocked);if(!stand)continue;const path=findFollowPath(client,stand,blocked);if(path.length){selected={seat,stand,host:presenterSeat};walker.reset();break;}}
   }
   if(!selected)return {x:client.x,z:client.z,speed:0,waiting:true};
   const pose=walker.update(dt,client,selected.stand,blocked);
   if(Math.hypot(pose.x-selected.stand.x,pose.z-selected.stand.z)<.16&&motion.sit(selected.seat,pose)){automatic=true;selected=null;}
   return pose;
  }
 };
}
