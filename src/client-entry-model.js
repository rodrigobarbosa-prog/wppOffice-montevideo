import {validRoom,visitUrl,inviteUrl} from './lobby-model.js';
export function clientEntryState({room,connected,requested,participants=[]}){
 if(!validRoom(room))return {disabled:true,ready:false,label:'Invalid invitation',message:'Ask your presenter for a new invitation link.'};
 const host=participants.some(p=>p.role==='presenter'),occupied=participants.some(p=>p.role==='client');
 if(requested){
  const ready=connected&&host&&!occupied;
  const message=!connected?'Reconnecting to the room…':!host?'The visit will open when the presenter joins.':occupied?'Another client is in the room. You’ll be able to join when a spot opens.':'You can now go to the waiting room.';
  return {disabled:true,ready,label:ready?'Opening the visit…':'Waiting to join…',message};
 }
 return {disabled:!connected,ready:false,label:connected?'Join the visit':'Connecting…',message:!connected?'Connecting to your visit…':host?'The presenter will admit you to the room.':'The presenter will admit you once they join.'};
}
export function clientVisitUrl(origin,room,name){return visitUrl(origin,room,'client',name);}
export function participantReturnUrl(origin,room,role){return role==='client'?inviteUrl(origin,room,'client'):new URL('/?room='+encodeURIComponent(room),origin).href;}
