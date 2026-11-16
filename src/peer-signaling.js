// Serialize SDP/candidates, including simultaneous microphone activation.
// https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
export function createPeerSignaling(pc,{polite,send,onRemoteDescription=async()=>{},onError=()=>{}}){
 let queue=Promise.resolve(),makingOffer=false,ignoreOffer=false,settingAnswer=false,candidates=[];
 const enqueue=job=>{const next=queue.then(job);queue=next.catch(onError);return next.catch(()=>{});};
 return {
  negotiate(){return enqueue(async()=>{if(pc.signalingState!=='stable'||polite&&!pc.remoteDescription&&!pc.localDescription)return;try{makingOffer=true;await pc.setLocalDescription();send({description:pc.localDescription});}finally{makingOffer=false;}});},
  receive({description,candidate}){return enqueue(async()=>{
   if(description){
    const ready=!makingOffer&&(pc.signalingState==='stable'||settingAnswer);
    ignoreOffer=description.type==='offer'&&!ready&&!polite;if(ignoreOffer){candidates=[];return;}
    settingAnswer=description.type==='answer';try{await pc.setRemoteDescription(description);await onRemoteDescription();}finally{settingAnswer=false;}
    for(const c of candidates)await pc.addIceCandidate(c);candidates=[];
    if(description.type==='offer'){await pc.setLocalDescription();send({description:pc.localDescription});}
   }else if(candidate&&!ignoreOffer){if(pc.remoteDescription)await pc.addIceCandidate(candidate);else candidates.push(candidate);}
  });}
 };
}
