import {lobbyRoles,roleNames,validRoom,makeRoom,inviteUrl,visitUrl} from './lobby-model.js';
import {sessionBase} from './session-address.js';
const params=new URL(location.href).searchParams;
if(params.has('vista')||params.has('modo'))location.replace('/assets/visit.html'+location.search);
else{
 const $=id=>document.getElementById(id),id=crypto.randomUUID();
 let room=validRoom(params.get('room'))?params.get('room'):sessionStorage.getItem('wppLobbyRoom');
 if(!validRoom(room))room=makeRoom();
 let participants=[],connected=false,loading=false;
 const preferred=lobbyRoles.includes(params.get('join'))?params.get('join'):null;
 const message=text=>$('lobby-message').textContent=text;
 function render(){
  $('lobby-connection').textContent=connected?'Sala disponible':'Conectando con la sala…';$('lobby-connection').dataset.connected=String(connected);
  $('room-summary').textContent=participants.length+' de 3 participantes conectados';
  for(const role of lobbyRoles){
   const person=participants.find(p=>p.role===role),card=$('role-'+role),join=$('join-'+role);
   card.classList.toggle('is-connected',Boolean(person));card.classList.toggle('is-invited',preferred===role);
   $('status-'+role).textContent=person?'Conectado · '+person.name:'Esperando conexión';
   $('detail-'+role).textContent=person?(person.mic?'Micrófono encendido':'Micrófono apagado')+(person.sharing?' · Compartiendo pantalla':''):role==='collaborator'?'Comparte su ventana de trabajo en vivo.':role==='presenter'?'Guía el recorrido y acompaña al cliente.':'Sigue al presentador y ve el trabajo de Brian.';
   const host=participants.some(p=>p.role==='presenter');join.disabled=!connected||Boolean(person)||loading||(role!=='presenter'&&!host);join.textContent=person?'Rol ocupado':role!=='presenter'&&!host?'Esperando al presentador':role!=='presenter'?'Solicitar ingreso':'Entrar como Presentador';
  }
 }
 async function poll(){
  const requested=room;
  try{const response=await fetch(sessionBase(location)+'/session/presence?id='+id+'&room='+encodeURIComponent(room),{cache:'no-store'});if(!response.ok)throw Error();const body=await response.json();if(requested!==room)return;participants=body.participants||[];connected=true;message('El presentador entra primero y admite a Cliente y Brian. Los micrófonos comienzan apagados.');}
  catch{if(requested!==room)return;connected=false;message('No se pudo conectar con la sala. Verificá que el servidor de la visita esté iniciado.');}render();
 }
 function useRoom(next){
  if(!validRoom(next)){message('Usá entre 1 y 60 letras, números, guiones o guiones bajos para la sala.');return;}
  room=next;sessionStorage.setItem('wppLobbyRoom',room);$('room-code').value=room;const url=new URL(location.href);url.searchParams.set('room',room);history.replaceState(null,'',url);participants=[];connected=false;render();poll();
 }
 for(const role of lobbyRoles){
  $('join-'+role).onclick=()=>{if(!connected||participants.some(p=>p.role===role))return;loading=true;render();location.assign(visitUrl(location.origin,room,role,$('display-name').value));};
  $('copy-'+role).onclick=async()=>{const link=inviteUrl(location.origin,room,role);$('invite-link').value=link;$('invite-output').hidden=false;try{await navigator.clipboard.writeText(link);message('Invitación de '+roleNames[role]+' copiada.');}catch{message('Copiá el enlace que aparece debajo.');$('invite-link').focus();$('invite-link').select();}};
 }
 $('room-form').onsubmit=e=>{e.preventDefault();useRoom($('room-code').value.trim());};$('new-room').onclick=()=>useRoom(makeRoom());
 $('display-name').value=sessionStorage.getItem('wppDisplayName')||'';$('display-name').oninput=e=>sessionStorage.setItem('wppDisplayName',e.target.value.trim().slice(0,40));
 useRoom(room);const timer=setInterval(poll,1200);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
}
