// Local-server signaling and direct WebRTC media. No third-party relay or upload.
import {sessionBase} from './session-address.js';
import {streamsForPeer} from './media-routing.js';
import {visitAudioOutput} from './visit-audio-output.js';
import {createPeerSignaling} from './peer-signaling.js';
import {createPeerAudio} from './peer-audio.js';
export function createVisitSession({onState=()=>{},onAttention=()=>{},onScreen=()=>{},onStatus=()=>{},onRejected=()=>{},onAdmission=()=>{},onWaiting=()=>{}}={}){
 const id=crypto.randomUUID(),room=new URL(location.href).searchParams.get('room')||'office',peers=new Map();
 const base=sessionBase(location),params=new URL(location.href).searchParams;
 const endpoint=base+'/session/message?id='+id+'&room='+encodeURIComponent(room);
 let state=null,streams=[],translation=null,destroyed=false,admitted=params.get('joined')!=='1'||params.get('modo')==='presenter';
 const audioElements=new Map();
 function post(type,payload,to){if(!destroyed&&admitted)fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,payload,to})}).catch(()=>onStatus('Connection interrupted'));}
 function addTracks(peer){
  const selected=streamsForPeer(streams,translation,peer.role);
  void peer.audio.set(selected.find(stream=>stream.getAudioTracks().length)||null);
  for(const sender of peer.pc.getSenders())if(sender.track?.kind==='video'&&!selected.some(s=>s.getTracks().includes(sender.track)))peer.pc.removeTrack(sender);
  for(const stream of selected)for(const track of stream.getVideoTracks())if(!peer.pc.getSenders().some(s=>s.track===track))peer.pc.addTrack(track,stream);
 }
 function connect(key){
  if(peers.has(key))return peers.get(key);
  const pc=new RTCPeerConnection({iceServers:['localhost','127.0.0.1'].includes(location.hostname)?[]:[{urls:'stun:stun.cloudflare.com:3478'}]}),peer={pc};peers.set(key,peer);
  peer.signals=createPeerSignaling(pc,{polite:id.localeCompare(key)>0,send:payload=>post('signal',payload,key),onRemoteDescription:()=>peer.audio.refresh(),onError:()=>onStatus('Audio negotiation interrupted. Toggle the microphone to retry.')});
  pc.onicecandidate=e=>{if(e.candidate)post('signal',{candidate:e.candidate},key);};
  pc.onnegotiationneeded=()=>{void peer.signals.negotiate();};
  pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed')onStatus('Audio link failed. Check your network; a relay may be needed.');};
  pc.ontrack=e=>{
   const stream=e.streams[0]||new MediaStream([e.track]);
   if(e.track.kind==='video'){onScreen(stream,key);e.track.onended=()=>onScreen(null,key);e.track.onmute=()=>onScreen(null,key);e.track.onunmute=()=>onScreen(stream,key);}
   else if(visitAudioOutput.supported){const audioStream=new MediaStream([e.track]);const attach=()=>visitAudioOutput.remote(key,audioStream);e.track.onunmute=attach;if(!e.track.muted)attach();e.track.onended=()=>visitAudioOutput.remove(key,audioStream);}
   else{let audio=audioElements.get(key);if(!audio){audio=new Audio();audio.autoplay=true;audioElements.set(key,audio);}audio.srcObject=stream;audio.play().catch(()=>onStatus('Tap Enable audio to hear participants'));}
  };
  peer.audio=createPeerAudio(pc,{initiator:id.localeCompare(key)<0,onError:()=>onStatus('Microphone track could not be sent. Toggle Mic to retry.')});
  addTracks(peer);if(state)post('state',state,key);return peer;
 }
 const join=params.get('joined')==='1'?'&joined=1&role='+encodeURIComponent(params.get('modo')||'client')+'&name='+encodeURIComponent(params.get('name')||''):'';
 const events=new EventSource(base+'/session/events?id='+id+'&room='+encodeURIComponent(room)+join);
 events.onopen=()=>{onStatus('Visit connected');if(state)post('state',state);};
 events.onerror=()=>{if(!destroyed)onStatus('Reconnecting visit…');};
 events.onmessage=async e=>{
  const data=JSON.parse(e.data),key=data.from;
  if(data.type==='waiting'){onWaiting(data.queue);return;}
  if(data.type==='awaiting-admission'){admitted=false;onAdmission(false);return;}
  if(data.type==='admitted'){admitted=true;onAdmission(true);if(state)post('state',state);return;}
  if(data.type==='host-required'){events.close();destroyed=true;for(const peer of peers.values())peer.pc.close();for(const audio of audioElements.values()){audio.pause();audio.srcObject=null;}peers.clear();onRejected('host-required');return;}
  if(data.type==='role-busy'){events.close();destroyed=true;onRejected(data.role);return;}
  if(data.type==='peers'){for(const p of data.peers)connect(p);return;}
  if(data.type==='join'){connect(key);return;}
  if(data.type==='leave'){peers.get(key)?.pc.close();peers.delete(key);visitAudioOutput.remove(key);audioElements.get(key)?.pause();audioElements.delete(key);onState(null,key);onScreen(null,key);return;}
  if(data.type==='state'){const peer=connect(key);peer.role=data.payload?.role;addTracks(peer);onState(data.payload,key);return;}
  if(data.type==='attention'){onAttention(data.payload,key);return;}
  if(data.type!=='signal')return;
  await connect(key).signals.receive(data.payload);
 };
 return {publish(next){state=next;post('state',state);},attention(payload){post('attention',payload);},admit(id){post('admit',{},id);},
  media(next){streams=next.filter(Boolean);for(const peer of peers.values())addTracks(peer);},
  translation(next){translation=next;for(const peer of peers.values())addTracks(peer);},
  unlock(){void visitAudioOutput.unlock();for(const audio of audioElements.values())audio.play().catch(()=>{});},
  destroy(){destroyed=true;events.close();for(const [id,peer] of peers){peer.pc.close();visitAudioOutput.remove(id);}for(const a of audioElements.values()){a.pause();a.srcObject=null;}peers.clear();}
 };
}
