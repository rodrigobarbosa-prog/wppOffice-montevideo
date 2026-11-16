// Browser echo/noise suppression runs once; no gate can erase quiet speech.
export async function processMicrophone(stream,{Context=globalThis.AudioContext||globalThis.webkitAudioContext,context:sharedContext=null}={}){
 if(!Context&&!sharedContext)return {stream,mode:'browser',destroy(){}};
 const context=sharedContext||new Context({latencyHint:'interactive'});let source,highpass,level,limiter,destination;
 const destroy=()=>{for(const node of [source,highpass,level,limiter,destination])node?.disconnect();destination?.stream.getTracks().forEach(t=>t.stop());if(!sharedContext)context.close().catch(()=>{});};
 try{
  // Never publish a silent destination from a suspended processing context.
  if(context.state!=='running')await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Audio processing suspended')),1000);Promise.resolve(context.resume()).then(()=>{clearTimeout(timeout);resolve();},e=>{clearTimeout(timeout);reject(e);});});
  if(context.state&&context.state!=='running')throw Error('Audio processing suspended');
  source=context.createMediaStreamSource(stream);
  highpass=context.createBiquadFilter();highpass.type='highpass';highpass.frequency.value=70;highpass.Q.value=.707;
  level=context.createGain();level.gain.value=1.35;
  limiter=context.createDynamicsCompressor();limiter.threshold.value=-6;limiter.knee.value=6;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.18;
  destination=context.createMediaStreamDestination();source.connect(highpass).connect(level).connect(limiter).connect(destination);
  return {stream:destination.stream,mode:'balanced',destroy};
 }catch{destroy();return {stream,mode:'browser',destroy(){}};}
}
