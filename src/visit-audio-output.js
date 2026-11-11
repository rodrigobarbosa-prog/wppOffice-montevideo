// One playback context is unlocked by Start visit. Recordings and remote
// microphones arriving later share it instead of creating locked media players.
export function createVisitAudioOutput({Context=globalThis.AudioContext||globalThis.webkitAudioContext}={}){
 let context=null,needsTap=false,started=false,unlockPending=null;const peers=new Map(),listeners=new Set();
 const emit=()=>{for(const listener of listeners)listener({needsTap});};
 function getContext(){
  if(!context&&Context){context=new Context({latencyHint:'interactive'});context.onstatechange=()=>{needsTap=started&&context.state!=='running';emit();};}
  return context;
 }
 return {
  supported:Boolean(Context),getContext,
  subscribe(listener){listeners.add(listener);listener({needsTap});return ()=>listeners.delete(listener);},
  blocked(){needsTap=true;emit();},
  unlock(){
   const c=getContext();if(!c)return Promise.resolve(false);started=true;
   // Call resume synchronously inside the user's tap, before any fetch/await.
   try{const resumed=c.resume();unlockPending=new Promise(resolve=>{const timeout=setTimeout(()=>resolve(false),1200);Promise.resolve(resumed).then(()=>{clearTimeout(timeout);resolve(c.state==='running');},()=>{clearTimeout(timeout);resolve(false);});}).then(ok=>{needsTap=!ok;emit();return ok;});return unlockPending;}
   catch{needsTap=true;emit();return Promise.resolve(false);}
  },
  whenUnlocked(){return unlockPending||Promise.resolve(context?.state==='running');},
  async decode(bytes){const c=getContext();if(!c)throw Error('Audio unavailable');return c.decodeAudioData(bytes);},
  remote(id,stream){
   this.remove(id);const c=getContext();if(!c)return false;
   const source=c.createMediaStreamSource(stream);source.connect(c.destination);peers.set(id,{source,stream});
   if(c.state!=='running')this.blocked();return true;
  },
  remove(id,stream){const peer=peers.get(id);if(stream&&peer?.stream!==stream)return;peer?.source.disconnect();peers.delete(id);},
  destroy(){for(const {source} of peers.values())source.disconnect();peers.clear();listeners.clear();context?.close().catch(()=>{});}
 };
}

// Minimal media interface used by the existing welcome and narration modules.
// Buffer decoding works while suspended; only playback needs the entry tap.
export function createBufferedAudioClass(output,{request=globalThis.fetch}={}){
 return class BufferedVisitAudio extends EventTarget{
  constructor(src=''){super();this.src=src;this.paused=true;this.buffer=null;this.loading=null;this.source=null;this.gain=null;this.offset=0;this.startTime=0;this.level=1;}
  get duration(){return this.buffer?.duration||0;}
  get currentTime(){return this.paused?this.offset:Math.min(this.duration,this.offset+output.getContext().currentTime-this.startTime);}
  set currentTime(value){const playing=!this.paused;this.pause();this.offset=Math.max(0,Number(value)||0);if(playing)void this.play().catch(()=>{});}
  get volume(){return this.level;}
  set volume(value){this.level=value;if(this.gain)this.gain.gain.value=value;}
  load(){
   if(!this.src)return Promise.resolve();if(this.loading)return this.loading;
   const src=this.src;this.loading=(async()=>{try{const response=await request(src);if(!response.ok)throw Error('Audio download failed');const buffer=await output.decode(await response.arrayBuffer());if(this.src!==src)return;this.buffer=buffer;this.dispatchEvent(new Event('loadeddata'));}catch(error){this.onerror?.(error);this.dispatchEvent(new Event('error'));throw error;}})();
   // load() also has fire-and-forget callers matching HTMLMediaElement.load().
   this.loading.catch(()=>{});return this.loading;
  }
  async play(){
   if(!this.buffer)await this.load();await output.whenUnlocked();const c=output.getContext();
   if(!this.buffer)throw Error('Audio not ready');
   if(c.state!=='running'){output.blocked();const error=new Error('Tap to enable audio');error.name='NotAllowedError';throw error;}
   if(!this.paused)return;const source=c.createBufferSource(),gain=c.createGain();source.buffer=this.buffer;gain.gain.value=this.level;source.connect(gain).connect(c.destination);
   this.source=source;this.gain=gain;this.startTime=c.currentTime;this.paused=false;
   source.onended=()=>{if(this.source!==source)return;this.offset=this.duration;this.paused=true;this.source=null;source.disconnect();gain.disconnect();this.onended?.();};
   source.start(0,this.offset);this.onplaying?.();
  }
  pause(){if(this.paused)return;this.offset=this.currentTime;this.paused=true;const source=this.source;this.source=null;source.onended=null;source.stop();source.disconnect();this.gain?.disconnect();this.onpause?.();}
  removeAttribute(name){if(name==='src'){this.pause();this.src='';this.buffer=null;this.loading=null;this.offset=0;}}
 };
}
export const visitAudioOutput=createVisitAudioOutput();
export const VisitAudio=visitAudioOutput.supported?createBufferedAudioClass(visitAudioOutput):globalThis.Audio;
