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
 const readyMessage='The presenter joins first and admits the client and Brian.';
 const message=text=>$('lobby-message').textContent=text;
 function render(){
  $('lobby-connection').textContent=connected?'Room available':'Connecting to the room…';$('lobby-connection').dataset.connected=String(connected);
  $('room-summary').textContent=participants.length+' of 3 participants connected';
  const host=participants.some(p=>p.role==='presenter');
  for(const role of lobbyRoles){
   const person=participants.find(p=>p.role===role),card=$('role-'+role),join=$('join-'+role);
   card.classList.toggle('is-connected',Boolean(person));card.classList.toggle('is-invited',preferred===role);
   $('status-'+role).textContent=person?'Connected · '+person.name:'Not connected';
   const detail=$('detail-'+role);detail.hidden=!person;detail.textContent=person?(person.mic?'Microphone on':'Microphone off')+(person.sharing?' · Sharing screen':''):'';
   join.disabled=!connected||Boolean(person)||loading||(role!=='presenter'&&!host);
   join.textContent=person?'Role taken':role!=='presenter'&&!host?'Waiting for the presenter':role!=='presenter'?'Request to join':'Join as presenter';
  }
 }
 async function poll(){
  const requested=room;
  try{const response=await fetch(sessionBase(location)+'/session/presence?id='+id+'&room='+encodeURIComponent(room),{cache:'no-store'});if(!response.ok)throw Error();const body=await response.json();if(requested!==room)return;participants=body.participants||[];if(!connected)message(readyMessage);connected=true;}
  catch{if(requested!==room)return;connected=false;message('Could not connect to the room. Check that the visit server is running.');}render();
 }
 function useRoom(next){
  if(!validRoom(next)){message('Enter a room code with 1–60 letters, numbers, hyphens or underscores.');return;}
  if(next!==room){$('invite-output').hidden=true;$('invite-link').value='';message(readyMessage);}
  room=next;sessionStorage.setItem('wppLobbyRoom',room);$('room-code').value=room;const url=new URL(location.href);url.searchParams.set('room',room);history.replaceState(null,'',url);participants=[];connected=false;render();poll();
 }
 for(const role of lobbyRoles){
  $('join-'+role).onclick=()=>{if(!connected||participants.some(p=>p.role===role))return;loading=true;render();location.assign(visitUrl(location.origin,room,role,$('display-name').value));};
  $('copy-'+role).onclick=async()=>{const link=inviteUrl(location.origin,room,role);$('invite-link').value=link;$('invite-output').hidden=false;try{await navigator.clipboard.writeText(link);message(roleNames[role]+' invitation copied.');}catch{message('Copy the invitation link shown below.');$('invite-link').focus();$('invite-link').select();}};
 }
 $('room-form').onsubmit=e=>{e.preventDefault();useRoom($('room-code').value.trim());};$('new-room').onclick=()=>useRoom(makeRoom());
 $('display-name').value=sessionStorage.getItem('wppDisplayName')||'';$('display-name').oninput=e=>sessionStorage.setItem('wppDisplayName',e.target.value.trim().slice(0,40));
 useRoom(room);const timer=setInterval(poll,1200);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
}
