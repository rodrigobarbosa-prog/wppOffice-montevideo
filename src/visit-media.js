import {processMicrophone} from './microphone-processing.js';
export function createVisitMedia({devices,processAudio=processMicrophone,onChange=()=>{},onStreams=()=>{},onScreen=()=>{}}){
 let rawAudio=null,processor=null,micEpoch=0;
 let role='client',audio=null,screen=null,micPending=false,screenPending=false,destroyed=false,error='';
 const emit=()=>{onChange({role,mic:Boolean(audio),sharing:Boolean(screen),micPending,screenPending,error,noiseMode:audio?(processor?.mode||'browser'):'off'});onStreams([audio,screen].filter(Boolean));};
 const stop=stream=>stream?.getTracks().forEach(track=>track.stop());
 function stopMic(){micEpoch++;stop(audio);stop(rawAudio);processor?.destroy();processor=null;rawAudio=null;audio=null;emit();}
 function stopScreen(){stop(screen);screen=null;onScreen(null);emit();}
 return {
  setRole(next){if(next!==role){stopMic();role=next;error='';emit();}},
  async toggleMic(){
   if(audio){stopMic();return;}if(micPending)return;
   const owner=role,epoch=++micEpoch;micPending=true;error='';emit();
   try{
    if(!devices?.getUserMedia)throw Error('Microphone is unavailable in this browser.');
    const stream=await devices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1},video:false});
    if(destroyed||owner!==role||epoch!==micEpoch){stop(stream);return;}rawAudio=stream;
    const filtered=await processAudio(stream);
    if(destroyed||owner!==role||epoch!==micEpoch){stop(stream);filtered.destroy();return;}
    processor=filtered;audio=filtered.stream;
    for(const track of [...stream.getTracks(),...audio.getTracks()])track.onended=()=>{if(rawAudio===stream)stopMic();};
   }catch(e){stop(rawAudio);rawAudio=null;processor?.destroy();processor=null;audio=null;error=e.name==='NotAllowedError'?'Microphone permission was not granted.':e.message||'Microphone unavailable.';}
   finally{micPending=false;emit();}
  },
  async toggleScreen(){
   if(screen){stopScreen();return;}if(role!=='collaborator'||screenPending)return;
   screenPending=true;error='';emit();
   try{
    if(!devices?.getDisplayMedia)throw Error('Screen sharing is unavailable in this browser. Open the visit in Chrome or Edge.');
    const stream=await devices.getDisplayMedia({video:{frameRate:{ideal:20,max:30}},audio:false});
    if(destroyed){stop(stream);return;}screen=stream;onScreen(screen);
    for(const track of screen.getTracks())track.onended=()=>{if(screen===stream){screen=null;onScreen(null);emit();}};
   }catch(e){error=e.name==='NotAllowedError'?'Screen sharing cancelled.':e.message||'Screen sharing unavailable.';}
   finally{screenPending=false;emit();}
  },
  destroy(){destroyed=true;stopMic();stop(screen);screen=null;onScreen(null);emit();}
 };
}
