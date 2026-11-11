// Local-server signaling and direct WebRTC media. No third-party relay or upload.
import {sessionBase} from './session-address.js';
import {streamsForPeer} from './media-routing.js';
export function createVisitSession({onState=()=>{},onAttention=()=>{},onScreen=()=>{},onStatus=()=>{},onRejected=()=>{},onAdmission=()=>{},onWaiting=()=>{}}={}){
 const id=crypto.randomUUID(),room=new URL(location.href).searchParams.get('room')||'office',peers=new Map();
 const base=sessionBase(location),params=new URL(location.href).searchParams;
 const endpoint=base+'/session/message?id='+id+'&room='+encodeURIComponent(room);
 let state=null,streams=[],translation=null,destroyed=false,admitted=params.get('joined')!=='1'||params.get('modo')==='presenter';
 const audioElements=new Map();
 function post(type,payload,to){if(!destroyed&&admitted)fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,payload,to})}).catch(()=>onStatus('Connection interrupted'));}
 function addTracks(peer){
  const selected=streamsForPeer(streams,translation,peer.role);
  for(const sender of peer.pc.getSenders())if(sender.track&&!selected.some(s=>s.getTracks().includes(sender.track)))peer.pc.removeTrack(sender);
  for(const stream of selected)for(const track of stream.getTracks())if(!peer.pc.getSenders().some(s=>s.track===track))peer.pc.addTrack(track,stream);
 }
 function connect(key){
  if(peers.has(key))return peers.get(key);
  const pc=new RTCPeerConnection({iceServers:['localhost','127.0.0.1'].includes(location.hostname)?[]:[{urls:'stun:stun.cloudflare.com:3478'}]}),peer={pc,makingOffer:false,ignoreOffer:false,polite:id.localeCompare(key)>0,pendingCandidates:[]};peers.set(key,peer);
  pc.onicecandidate=e=>{if(e.candidate)post('signal',{candidate:e.candidate},key);};
  pc.onnegotiationneeded=async()=>{try{peer.makingOffer=true;await pc.setLocalDescription();post('signal',{description:pc.localDescription},key);}catch{}finally{peer.makingOffer=false;}};
  pc.ontrack=e=>{
   const stream=e.streams[0]||new MediaStream([e.track]);
   if(e.track.kind==='video'){onScreen(stream,key);e.track.onended=()=>onScreen(null,key);e.track.onmute=()=>onScreen(null,key);e.track.onunmute=()=>onScreen(stream,key);}
   else{let audio=audioElements.get(key);if(!audio){audio=new Audio();audio.autoplay=true;audioElements.set(key,audio);}audio.srcObject=stream;audio.play().catch(()=>onStatus('Press Start visit to hear participants'));}
  };
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
  if(data.type==='leave'){peers.get(key)?.pc.close();peers.delete(key);audioElements.get(key)?.pause();audioElements.delete(key);onState(null,key);onScreen(null,key);return;}
  if(data.type==='state'){const peer=connect(key);peer.role=data.payload?.role;addTracks(peer);onState(data.payload,key);return;}
  if(data.type==='attention'){onAttention(data.payload,key);return;}
  if(data.type!=='signal')return;
  const peer=connect(key),pc=peer.pc;
  try{
   const {description,candidate}=data.payload;
   if(description){
    const collision=description.type==='offer'&&(peer.makingOffer||pc.signalingState!=='stable');
    peer.ignoreOffer=!peer.polite&&collision;if(peer.ignoreOffer)return;
    await pc.setRemoteDescription(description);
    for(const c of peer.pendingCandidates)await pc.addIceCandidate(c);peer.pendingCandidates=[];
    if(description.type==='offer'){await pc.setLocalDescription();post('signal',{description:pc.localDescription},key);}
   }else if(candidate){if(pc.remoteDescription)await pc.addIceCandidate(candidate);else peer.pendingCandidates.push(candidate);}
  }catch{if(!peer.ignoreOffer)onStatus('Media connection interrupted');}
 };
 return {publish(next){state=next;post('state',state);},attention(payload){post('attention',payload);},admit(id){post('admit',{},id);},
  media(next){streams=next.filter(Boolean);for(const peer of peers.values())addTracks(peer);},
  translation(next){translation=next;for(const peer of peers.values())addTracks(peer);},
  unlock(){for(const audio of audioElements.values())audio.play().catch(()=>{});},
  destroy(){destroyed=true;events.close();for(const peer of peers.values())peer.pc.close();for(const a of audioElements.values()){a.pause();a.srcObject=null;}peers.clear();}
 };
}
