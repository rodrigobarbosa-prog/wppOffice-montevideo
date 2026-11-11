import {validRoom,visitUrl,inviteUrl} from './lobby-model.js';
export function clientEntryState({room,connected,requested,participants=[]}){
 if(!validRoom(room))return {disabled:true,ready:false,label:'Invitación no válida',message:'Pedí un nuevo enlace de invitación para comenzar tu visita.'};
 if(requested)return {disabled:true,ready:connected&&participants.some(p=>p.role==='presenter')&&!participants.some(p=>p.role==='client'),label:'Preparando tu ingreso…',message:'Ya recibimos tu solicitud. Enseguida te damos la bienvenida.'};
 return {disabled:!connected,ready:false,label:connected?'Entrar a la visita':'Conectando…',message:connected?'Todo listo para recibirte.':'Estamos conectando con tu visita. En un momento podés volver a intentarlo.'};
}
export function clientVisitUrl(origin,room,name){return visitUrl(origin,room,'client',name);}
export function participantReturnUrl(origin,room,role){return role==='client'?inviteUrl(origin,room,'client'):new URL('/?room='+encodeURIComponent(room),origin).href;}
