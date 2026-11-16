const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function seatStandPoint(seat,from,blocked,transitionBlocked=blocked){
 const candidates=[[-.70,0],[.70,0],[0,-.75],[0,.70]].map(([side,forward])=>({x:seat.x+Math.cos(seat.yaw)*side+Math.sin(seat.yaw)*forward,z:seat.z-Math.sin(seat.yaw)*side+Math.cos(seat.yaw)*forward}));
 candidates.sort((a,b)=>Math.hypot(a.x-from.x,a.z-from.z)-Math.hypot(b.x-from.x,b.z-from.z));
 return candidates.find(p=>!blocked(p.x,p.z,seat.id)&&clear(seat,p,transitionBlocked,seat.id))||null;
}
function clear(a,b,blocked,id){const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.04));for(let i=1;i<=steps;i++){const t=i/steps;if(blocked(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,id))return false;}return true;}
export function createSeatMotion({blocked,transitionBlocked=blocked,occupied=()=>false}){
 let state=null;
 return {get active(){return Boolean(state);},get state(){return state;},
  canSit(seat,from){if(state||occupied(seat.id)||Math.hypot(seat.x-from.x,seat.z-from.z)>1.8)return false;const stand=seatStandPoint(seat,from,blocked,transitionBlocked);return Boolean(stand&&clear(from,stand,blocked,seat.id));},
  sit(seat,from){if(!this.canSit(seat,from))return false;state={seat,stand:seatStandPoint(seat,from,blocked,transitionBlocked),from:{x:from.x,z:from.z},time:0,phase:'sitting'};return true;},
  occupy(seat){state={seat,stand:seatStandPoint(seat,seat,blocked,transitionBlocked),from:{x:seat.x,z:seat.z},time:1.4,phase:'seated'};},
  stand(){if(!state||state.phase!=='seated')return false;const stand=state.stand&&!blocked(state.stand.x,state.stand.z,state.seat.id)&&clear(state.seat,state.stand,transitionBlocked,state.seat.id)?state.stand:seatStandPoint(state.seat,state.seat,blocked,transitionBlocked);if(!stand)return false;state.stand=stand;state.phase='standing';state.time=0;return true;},
  update(dt){if(!state)return null;state.time+=Math.max(0,Math.min(.1,dt));const s=state;
   if(s.phase==='sitting'){
    const approach=ease(s.time/.35),lower=ease((s.time-.35)/1.05);const start={x:s.from.x+(s.stand.x-s.from.x)*approach,z:s.from.z+(s.stand.z-s.from.z)*approach};
    if(lower===0&&!clear(s.from,start,blocked,s.seat.id)||lower>0&&!clear(s.stand,s.seat,transitionBlocked,s.seat.id)){state=null;return {x:s.from.x,z:s.from.z,weight:0,heading:s.seat.yaw,id:null};}
    if(s.time>=1.4)s.phase='seated';return {x:start.x+(s.seat.x-start.x)*lower,z:start.z+(s.seat.z-start.z)*lower,weight:lower,heading:s.seat.yaw,id:s.seat.id};
   }
   if(s.phase==='standing'){if(!clear(s.seat,s.stand,transitionBlocked,s.seat.id)||blocked(s.stand.x,s.stand.z,s.seat.id)){s.phase='seated';s.time=1.4;return {x:s.seat.x,z:s.seat.z,weight:1,heading:s.seat.yaw,id:s.seat.id};}const p=ease(s.time/1.2),result={x:s.seat.x+(s.stand.x-s.seat.x)*p,z:s.seat.z+(s.stand.z-s.seat.z)*p,weight:1-p,heading:s.seat.yaw,id:p>=1?null:s.seat.id};if(p>=1)state=null;return result;}
   return {x:s.seat.x,z:s.seat.z,weight:1,heading:s.seat.yaw,id:s.seat.id};
  }
 };
}
