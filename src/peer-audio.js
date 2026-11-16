// Reserve the audio channel even when both microphones initially start muted.
// Muting/replacing its track does not tear down SDP or strand a remote receiver.
export function createPeerAudio(pc,{onError=()=>{},initiator=true}={}){
 let transceiver=initiator?pc.addTransceiver('audio',{direction:'sendrecv'}):null,queued=Promise.resolve(),desired=null,applied=null;
 const api={get sender(){return transceiver?.sender;},refresh(){return api.set(desired);},set(stream){
  desired=stream;const next=queued.then(async()=>{const current=desired,track=current?.getAudioTracks()[0]||null;
   if(!transceiver)transceiver=pc.getTransceivers().find(t=>t.receiver.track?.kind==='audio');
   if(!transceiver)return;
   if(transceiver.direction!=='sendrecv')transceiver.direction='sendrecv';
   if(transceiver.sender.track!==track)await transceiver.sender.replaceTrack(track);
   if(current!==applied){transceiver.sender.setStreams?.(...(current?[current]:[]));applied=current;}
  });queued=next.catch(onError);return queued;
 }};return api;
}
