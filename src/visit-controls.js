import * as THREE from '../vendor/three.module.js';
import {createVisitMedia} from './visit-media.js';
import {createVisitSession} from './visit-session.js';
import {inviteUrl} from './lobby-model.js';
import {participantReturnUrl} from './client-entry-model.js';
import {createRemoteMotion} from './remote-motion.js';
import {visitAudioOutput} from './visit-audio-output.js';
import {processMicrophone} from './microphone-processing.js';
import {validSocialGesture} from './social-gesture.js';

export function setupVisitControls({workstationDisplay,onExplore,onAttention,onGesture=()=>{},onScreenVisit=()=>false}){
 const $=id=>document.getElementById(id),labels={client:'Client',presenter:'Presenter',collaborator:'Brian · Collaborator'};
 let waitingCount=0,stateSequence=0;
 let screenVisit='idle',role='client',following=true,mediaState={mic:false,sharing:false},pose={},localScreen=null,activeScreen=null,screenTexture=null;
 const remotes=new Map(),remoteScreens=new Map(),remoteMotion=createRemoteMotion();
 const video=$('shared-video');
 const params=new URL(location.href).searchParams,joined=params.get('joined')==='1',displayName=(params.get('name')||'').slice(0,40),room=params.get('room')||'office';
 let rejected=false,admitted=!joined||params.get('modo')==='presenter';
 const toast=text=>{$('visit-message').textContent=text;$('visit-message').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('visit-message').hidden=true,6500);};
 function clearScreenTexture(){
  workstationDisplay.setLiveTexture(null);
  screenTexture?.dispose();screenTexture=null;
 }
 function syncScreen(){
  if(activeScreen&&video.readyState>=2){
   if(!screenTexture){
    screenTexture=new THREE.VideoTexture(video);
    screenTexture.colorSpace=THREE.SRGBColorSpace;
    workstationDisplay.setLiveTexture(screenTexture);
   }
  }else if(screenTexture)clearScreenTexture();
  update();
 }
 function attachScreen(){
  const stream=localScreen||[...remoteScreens].find(([id])=>remotes.get(id)?.role==='collaborator')?.[1]||null;
  if(stream!==activeScreen){
   clearScreenTexture();
   activeScreen=stream;video.srcObject=stream;
   if(stream)video.play().catch(()=>{});
  }
  syncScreen();
 }
 function publish(){session.publish({screenVisit,role,name:displayName,mic:mediaState.mic,sharing:mediaState.sharing,joined,...pose,sequence:++stateSequence});}
 function update(){
  $('admission-panel').hidden=role!=='presenter'||!waitingCount;$('host-invites').hidden=role!=='presenter';
  $('mic-toggle').textContent=mediaState.micPending?'Mic: connecting…':mediaState.mic?'Mic: on':'Mic: off';
  $('mic-noise-state').textContent=!mediaState.mic?'Noise reduction · automatic voice level ready':mediaState.noiseMode==='balanced'?'Noise reduction · automatic voice level · no voice gate':'Browser noise reduction · automatic voice level';
  $('mic-toggle').setAttribute('aria-pressed',String(mediaState.mic));$('mic-toggle').disabled=Boolean(mediaState.micPending);
  $('follow-toggle').hidden=role!=='client';$('follow-toggle').disabled=screenVisit!=='idle';$('workstation-trip').hidden=screenVisit!=='approaching';$('follow-toggle').textContent=following?'Explore office':'Follow presenter';
  $('screen-share').hidden=role!=='collaborator';$('screen-share').textContent=mediaState.sharing?'Stop sharing':'Share screen';$('screen-share').disabled=Boolean(mediaState.screenPending);
  $('screen-open').textContent='View Brian’s screen';
  for(const name of Object.keys(labels)){
   const peer=[...remotes.values()].find(p=>p.role===name);
   const on=name===role?mediaState.mic:peer?.mic||false;
   $('participant-'+name).textContent=labels[name]+(name===role?' · You':peer?' · Connected':' · Not connected')+' · Mic '+(on?'on':'off');
   $('participant-'+name).dataset.mic=String(on);
  }
  const brian=role==='collaborator'||[...remotes.values()].some(p=>p.role==='collaborator'),ready=Boolean(activeScreen&&video.readyState>=2);
  video.hidden=!ready;$('screen-waiting').hidden=ready;
  $('screen-status').textContent=ready?'Live':activeScreen?'Connecting…':brian?'Connected · Not sharing':'Not connected';
  $('screen-waiting-title').textContent=activeScreen?'Connecting to Brian’s screen':brian?'Brian is connected':'Waiting for Brian';
  $('screen-empty').textContent=activeScreen?'The live video will appear here shortly.':brian?'Brian can choose a task window using Share screen. You’ll see his work here when he starts.':'Invite Brian to this room. Once connected, he can share the window he’s working in.';
  $('screen-invite').hidden=role==='client'||brian||Boolean(activeScreen);
 }
 const session=createVisitSession({
  onStatus:text=>{$('connection-state').textContent=text;},
  onState:(data,id)=>{if(!data){remotes.delete(id);remoteMotion.remove(id);remoteScreens.delete(id);attachScreen();return;}if(!Object.hasOwn(labels,data.role))return;if(Number.isFinite(data.sequence)&&Number.isFinite(remotes.get(id)?.sequence)&&data.sequence<=remotes.get(id).sequence)return;remotes.set(id,{...data,received:Date.now()});remoteMotion.push(id,data,performance.now());attachScreen();},
  onAdmission:allowed=>{admitted=allowed;$('enter').disabled=!allowed;$('status').textContent=allowed?'The presenter has admitted you. You can start the visit.':'Waiting for the presenter to admit you…';$('enter').textContent=allowed?'Start visit':'Waiting for admission…';},
  onWaiting:queue=>{waitingCount=queue.length;const panel=$('admission-panel'),list=$('admission-queue');panel.hidden=role!=='presenter'||!waitingCount;list.replaceChildren();for(const guest of queue){const card=document.createElement('div'),title=document.createElement('strong'),copy=document.createElement('p'),button=document.createElement('button');card.className='admission-notice';title.textContent=guest.name;copy.textContent='Requested to join the visit';button.textContent='Admit';button.setAttribute('aria-label','Admit '+guest.name);button.onclick=()=>{button.disabled=true;button.textContent='Admitting…';session.admit(guest.id);};card.append(title,copy,button);list.append(card);}},
  onRejected:reason=>{rejected=true;media.destroy();if(new URL(location.href).searchParams.get('modo')==='client'){$('enter').disabled=true;$('status').textContent='Return to your invitation to request access again.';$('welcome-title').textContent='Your visit will be ready soon';$('welcome').hidden=false;$('tour-ui').hidden=true;return;}$('enter').disabled=true;$('status').textContent=reason==='host-required'?'The presenter needs to join first. Return to the lobby to try again.':'This role is already occupied in the room. Return to the lobby and choose an available role.';$('welcome-title').textContent=reason==='host-required'?'Waiting for the presenter':'Role already connected';$('welcome').hidden=false;$('tour-ui').hidden=true;$('connection-state').textContent='Role already occupied';},
  onScreen:(stream,id)=>{if(stream)remoteScreens.set(id,stream);else remoteScreens.delete(id);attachScreen();},
  onAttention:(data,id)=>{if(!Object.hasOwn(labels,data?.from))return;if(data.kind==='gesture'){if(remotes.get(id)?.role===data.from&&validSocialGesture(data.gesture,data.point))onGesture(data.gesture,data.point,data.from);return;}if(!Object.hasOwn(labels,data?.target))return;toast(data.kind==='screen'?labels[data.from]+' is viewing Brian’s screen.':labels[data.from]+' is asking for '+labels[data.target]+'’s attention.');onAttention(data.target,data.from);}
 });
 const media=createVisitMedia({devices:navigator.mediaDevices,prepareAudio:()=>visitAudioOutput.unlock(),processAudio:stream=>processMicrophone(stream,{context:visitAudioOutput.getContext()}),
  onChange:next=>{mediaState=next;update();publish();if(next.error)toast(next.error);},
  onStreams:streams=>session.media(streams),onScreen:stream=>{localScreen=stream;attachScreen();}
 });
 $('admission-room').textContent=room;
 for(const [id,target] of [['invite-client','client'],['invite-brian','collaborator']])$(id).onclick=async()=>{const field=$('admission-invite-link');field.value=inviteUrl(location.origin,room,target);field.hidden=false;try{await navigator.clipboard.writeText(field.value);toast('Invitation copied. Share this link to let your guest request access.');}catch{field.focus();field.select();toast('Copy the invitation link.');}};
 $('mic-toggle').onclick=()=>media.toggleMic();$('screen-share').onclick=()=>media.toggleScreen();
 function showScreen(){screenVisit=role==='client'?'viewing':'idle';$('screen-panel').hidden=false;if(activeScreen)$('shared-video').play().catch(()=>{});update();publish();}
 function closeScreen(){const visiting=screenVisit!=='idle';screenVisit='idle';$('screen-panel').hidden=true;if(visiting){onScreenVisit(false);following=true;onExplore(false);}update();publish();}
 function interact(target,kind){if(target===role||!Object.hasOwn(labels,target))return;
  if(kind==='screen'&&target==='collaborator'&&role==='client'){
   if(!onScreenVisit(true)){toast('No clear route to Brian’s desk. Move closer and try again.');return;}
   screenVisit='approaching';following=false;update();publish();toast('Walking to Brian’s desk. The presenter will wait.');
  }else if(kind==='screen'&&target==='collaborator')showScreen();else toast('Attention requested: '+labels[target]);
  session.attention({from:role,target,kind});onAttention(target,role);
 }
 $('screen-open').onclick=()=>interact('collaborator','screen');
 $('screen-close').onclick=closeScreen;$('workstation-cancel').onclick=closeScreen;
 for(const event of ['loadeddata','playing','emptied'])video.addEventListener(event,syncScreen);
 $('screen-invite').onclick=async()=>{const link=inviteUrl(location.origin,room,'collaborator');$('screen-invite-link').value=link;try{await navigator.clipboard.writeText(link);toast('Brian’s invitation copied.');}catch{$('screen-invite-link').hidden=false;$('screen-invite-link').focus();$('screen-invite-link').select();}};
 const invitedRole=new URL(location.href).searchParams.get('modo');
 const returnUrl=participantReturnUrl(location.origin,room,invitedRole);
 $('return-lobby').href=returnUrl;$('return-lobby').hidden=!joined;
 $('welcome-lobby').href=returnUrl;$('welcome-lobby').hidden=!joined;
 if(joined){
  $('role-switch')?.setAttribute('hidden','');
  $('view-role')?.setAttribute('hidden','');
  document.querySelector('label[for="view-role"]')?.setAttribute('hidden','');
 }
 if(joined&&invitedRole==='client'){$('return-lobby').textContent='← Your invitation';$('welcome-lobby').textContent='Back to your invitation';}
 $('follow-toggle').onclick=()=>{following=!following;onExplore(!following);update();};
 window.addEventListener('pagehide',()=>{media.destroy();session.destroy();clearScreenTexture();workstationDisplay.dispose();},{once:true});
 update();
 return {interact,arriveScreen:showScreen,screenPhase:()=>screenVisit,waitForClient(value,message){$('presenter-waiting').hidden=role!=='presenter'||!value;if(message)$('presenter-waiting').textContent=message;},setRole(next){role=next;media.setRole(next);update();publish();},unlock(){session.unlock();},
  gesture(kind,point){if(validSocialGesture(kind,point))session.attention({kind:'gesture',gesture:kind,point,from:role});},
  publishPose(next){pose=next;publish();},
  remotePose(name){const entry=[...remotes].find(([,p])=>p.role===name),peer=entry&&remoteMotion.sample(entry[0],performance.now());return peer&&Number.isFinite(peer.x)&&Number.isFinite(peer.z)&&Math.abs(peer.x)<100&&Math.abs(peer.z)<100?{...peer,heading:Number.isFinite(peer.heading)?peer.heading:0,speed:Number.isFinite(peer.speed)?Math.min(3,Math.max(0,peer.speed)):0,gesture:['idle','walk','welcome','explain'].includes(peer.gesture)?peer.gesture:'idle'}:null;},
  setFollowing(next){following=next;update();},state(){return {following,role,mic:mediaState.mic,conversation:mediaState.mic||[...remotes.values()].some(p=>p.mic),sharing:Boolean(activeScreen)};}
  ,hasPeer(name){return [...remotes.values()].some(p=>p.role===name);},rejected(){return rejected||!admitted;}
 };
}
