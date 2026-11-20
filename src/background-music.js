// Local-only instrumental asset. Uses the visit's unlocked playback context.
export function createBackgroundMusic({output,request=globalThis.fetch,onChange=()=>{}}){
 let enabled=true,active=false,source=null,gain=null,buffer=null,loading=null,destroyed=false,lastTarget=null,error=false;
 function load(){
  if(!loading)loading=(async()=>{const response=await request('/assets/audio/music/C-lounge-nocturno.wav');if(!response.ok)throw Error('Music unavailable');buffer=await output.decode(await response.arrayBuffer());})().catch(()=>{error=true;onChange({enabled,error});});
  return loading;
 }
 return {
  setEnabled(value){enabled=Boolean(value);onChange({enabled,error});},
  update({playing,conversation=false}){
   active=playing&&!destroyed;
   if(active&&enabled&&!buffer&&!error)void load();
   const context=output.getContext();
   if(active&&enabled&&buffer&&!source&&context?.state==='running'){
    source=context.createBufferSource();gain=context.createGain();gain.gain.value=0;source.buffer=buffer;source.loop=true;source.connect(gain).connect(context.destination);source.start();
   }
   const target=active&&enabled?(conversation?.096:.52):0;
   if(gain&&target!==lastTarget){gain.gain.setTargetAtTime(target,context.currentTime,conversation?.18:.7);lastTarget=target;}
  },
  destroy(){destroyed=true;source?.stop();source?.disconnect();gain?.disconnect();source=null;gain=null;}
 };
}
