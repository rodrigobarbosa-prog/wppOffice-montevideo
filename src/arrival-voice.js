import {narrationAudioUrl} from './voice-profile.js';
export function createArrivalVoice({onProgress=()=>{},onChange=()=>{},request=globalThis.fetch,AudioClass=globalThis.Audio}={}){
 let audio=null,url=null,destroyed=false,ready=false,finished=false,error='';
 const state=()=>({ready,finished,error,playing:Boolean(audio&&!audio.paused&&!finished),duration:audio?.duration||0,currentTime:audio?.currentTime||0});
 const emit=()=>{if(!destroyed)onChange(state());};
 return {
  state,
  async load(){
   const response=await request(narrationAudioUrl('welcome'),{cache:'no-cache'});if(!response.ok)throw Error('Could not load the English welcome. Reload to retry.');
   const total=Number(response.headers.get('content-length')),chunks=[];let loaded=0;
   if(response.body?.getReader){const reader=response.body.getReader();while(true){const {value,done}=await reader.read();if(done)break;chunks.push(value);loaded+=value.length;onProgress(total?Math.min(.98,loaded/total):0);}}
   else chunks.push(await response.arrayBuffer());
   if(destroyed)return;
   url=URL.createObjectURL(new Blob(chunks,{type:'audio/wav'}));audio=new AudioClass(url);audio.preload='auto';audio.volume=.8;
   audio.onended=()=>{finished=true;emit();};audio.onplaying=emit;audio.onpause=emit;
   audio.onerror=()=>{error='Welcome audio stopped. Retry to continue the arrival.';emit();};
   await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Welcome audio could not be prepared. Reload to retry.')),20000);audio.addEventListener('loadeddata',()=>{clearTimeout(timeout);resolve();},{once:true});audio.addEventListener('error',()=>{clearTimeout(timeout);reject(Error('Welcome audio could not be decoded.'));},{once:true});audio.load();});
   if(destroyed)return;ready=true;onProgress(1);emit();
  },
  async play(){if(!ready||destroyed)return;error='';try{await audio.play();}catch{error='Tap Retry welcome to play the audio.';emit();}},
  pause(){audio?.pause();},setVolume(value){if(audio)audio.volume=value;},
  retry(){if(audio){audio.currentTime=0;finished=false;return this.play();}},
  destroy(){destroyed=true;audio?.pause();if(audio){audio.removeAttribute('src');audio.load();}if(url)URL.revokeObjectURL(url);}
 };
}
