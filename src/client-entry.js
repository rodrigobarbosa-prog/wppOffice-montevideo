import {clientEntryState,clientVisitUrl} from './client-entry-model.js';
import {sessionBase} from './session-address.js';
import {validRoom} from './lobby-model.js';
const $=id=>document.getElementById(id),room=new URL(location.href).searchParams.get('room'),id=crypto.randomUUID();
let connected=false,requested=false,participants=[],leaving=false,inFlight=false;
$('guest-name').value=sessionStorage.getItem('wppDisplayName')||'';
function render(){
 const state=clientEntryState({room,connected,requested,participants});
 $('client-enter').disabled=state.disabled;$('client-enter').textContent=state.label;$('client-entry-status').textContent=state.message;
 $('client-entry-form').setAttribute('aria-busy',String(requested));
 if(state.ready&&!leaving){leaving=true;location.replace(clientVisitUrl(location.origin,room,$('guest-name').value));}
}
async function poll(){
 if(inFlight||leaving||!validRoom(room))return;inFlight=true;
 try{const response=await fetch(sessionBase(location)+'/session/presence?id='+id+'&room='+encodeURIComponent(room),{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error();participants=(await response.json()).participants||[];connected=true;}catch{connected=false;}finally{inFlight=false;render();}
}
$('client-entry-form').onsubmit=e=>{e.preventDefault();if(!connected||requested||!validRoom(room))return;sessionStorage.setItem('wppDisplayName',$('guest-name').value.trim().slice(0,40));requested=true;render();void poll();};
render();void poll();const timer=setInterval(poll,1500);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
