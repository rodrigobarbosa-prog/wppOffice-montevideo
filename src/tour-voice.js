import {voiceProfile,narrationAudioUrl} from './voice-profile.js';
export function narrationPolicy(role){return {audio:role!=='presenter',captions:role!=='presenter'};}
// Local voices only: do not silently send narration to network synthesizers.
export function selectTourVoice(all,language,voiceURI=''){
 all=all.filter(v=>v.localService!==false);
 const manual=all.find(v=>v.voiceURI===voiceURI);if(manual)return manual;
 const score=v=>(/natural|neural|online/i.test(v.name)?100:0)+(/Google/i.test(v.name)?60:0)+(v.localService===false?20:0)+(language==='es'&&/^es-(UY|AR|MX|US|CL|CO)/i.test(v.lang)?15:0)+(/Pablo|Jorge|Diego|David|Mark|Daniel|George/i.test(v.name)?2:0);
 return all.filter(v=>v.lang.toLowerCase().startsWith(language)).sort((a,b)=>score(b)-score(a))[0];
}
export function narrationFor(location,language='es'){
 const zone=location.startsWith('Sala ')?'meeting':location.startsWith('Cocina')?'kitchen':location.startsWith('Hall')?'arrival':location.startsWith('Acceso')?'entrance':'office';
 const scripts={
  es:{
   arrival:'Ya estamos en el piso catorce de WPP Production, en Montevideo. Empecemos el recorrido.',
   entrance:'Por acá empieza la visita. Vení, te muestro dónde trabaja el equipo.',
   office:'Acá las ideas toman forma. Compartimos las mesas y estamos a mano para ayudarnos.',
   meeting:'En estas salas compartimos ideas, revisamos proyectos y tomamos decisiones en equipo.',
   kitchen:'Esta es la cocina. El equipo suele encontrarse acá para un café y una charla.'
  },
  en:{
   arrival:'We’re on the fourteenth floor at WPP Production in Montevideo. Let’s take a look around.',
   entrance:'Our tour starts here. Come on in and see where the team works.',
   office:'Teams sit together here, so it’s easy to ask a quick question or lend a hand.',
   meeting:'These are our meeting rooms, where we share ideas and review work together.',
   kitchen:'Here’s the kitchen. It’s where the team catches up over coffee.'
  }
 };
 return {zone,text:(scripts[language]||scripts.es)[zone]};
}

export function createTourVoice({synth,Utterance,onChange=()=>{},request=globalThis.fetch,AudioClass=globalThis.Audio,recorded=false}){
 let localAudio=null,localUrl=null,controller=null,localVoice=false,needsActivation=false,audioKey=null;
 let role='client',enabled=true,paused=true,language=recorded?'en':'es',voiceURI='',volume=.8,current=null,utterance=null,activeVoice='',speaking=false,error='',generation=0;
 const heard=new Set(),offsets=new Map();
 const voices=()=>synth?.getVoices?.()||[];
 const state=()=>({role,audible:narrationPolicy(role).audio,enabled,paused,language,voiceURI,volume,speaking,error,needsActivation,supported:Boolean(AudioClass||synth&&Utterance),voices:recorded?[]:voices().filter(v=>v.localService!==false),voiceName:recorded?voiceProfile.name:localVoice?'Kokoro · local':voices().find(v=>v.voiceURI===activeVoice)?.name||'',text:current?.text||'',zone:current?.zone||''});
 const emit=()=>onChange(state());
 function stop(){
  generation++;controller?.abort();controller=null;
  if(localAudio){
   localAudio.pause();
   if(recorded&&audioKey&&!heard.has(audioKey)&&localAudio.currentTime>0)offsets.set(audioKey,localAudio.currentTime);
  }
  localAudio=null;audioKey=null;if(localUrl)URL.revokeObjectURL(localUrl);localUrl=null;
  speaking=false;if(synth)synth.cancel();utterance=null;
 }
 async function speak(replay=false){
  stop();error='';needsActivation=false;
  if(!current||!enabled||paused||!narrationPolicy(role).audio){emit();return;}
  const key=language+':'+current.zone;
  if(replay){heard.delete(key);offsets.delete(key);}
  else if(heard.has(key)){emit();return;}
  const localToken=generation;localVoice=false;
  if(!voiceURI&&request&&AudioClass){
   controller=new AbortController();const localController=controller,timeout=setTimeout(()=>localController.abort(),45000);
   try{
    const response=await request(recorded?narrationAudioUrl(current.zone):'/voice/speak',recorded?{signal:controller.signal,cache:'no-cache'}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:current.text,language}),signal:controller.signal});
    if(!response.ok)throw Error('Local voice unavailable');
    const blob=await response.blob();if(localToken!==generation)return;
    localUrl=URL.createObjectURL(blob);localAudio=new AudioClass(localUrl);localAudio.volume=volume;localVoice=true;audioKey=key;
    if(offsets.has(key))localAudio.currentTime=offsets.get(key);
    localAudio.onplaying=()=>{if(localToken===generation){speaking=true;emit();}};
    localAudio.onended=()=>{if(localToken===generation){heard.add(key);offsets.delete(key);speaking=false;emit();}};
    localAudio.onerror=()=>{if(localToken===generation){speaking=false;error='Local audio unavailable';emit();}};
    await localAudio.play();emit();return;
   }catch(error){if(localToken!==generation)return;if(error?.name==='NotAllowedError'){needsActivation=true;emit();return;}}
   finally{clearTimeout(timeout);}
  }
  if(recorded){error='Voiceover unavailable · tap Replay to retry';emit();return;}
  if(!synth||!Utterance){error='Voice unavailable · captions on';emit();return;}
  const all=voices(),matching=all.filter(v=>v.lang.toLowerCase().startsWith(language));
  const selected=selectTourVoice(all,language,voiceURI);
  if(!selected){error='No voice for this language · captions on';emit();return;}
  activeVoice=selected.voiceURI;const token=generation;utterance=new Utterance(current.text);
  utterance.lang=selected.lang;utterance.voice=selected;utterance.rate=1;utterance.pitch=1;utterance.volume=volume;
  utterance.onstart=()=>{if(token!==generation)return;speaking=true;emit();};
  utterance.onend=()=>{if(token!==generation)return;heard.add(key);speaking=false;utterance=null;emit();};
  utterance.onerror=event=>{if(token!==generation)return;speaking=false;utterance=null;if(!['interrupted','canceled'].includes(event.error))error='Audio unavailable · captions on';emit();};
  try{synth.speak(utterance);}catch{error='Audio unavailable · captions on';speaking=false;}
  emit();
 }
 const changed=()=>{if(recorded)return;emit();const best=selectTourVoice(voices(),language,voiceURI);if(!localVoice&&enabled&&!paused&&current&&(error||!voiceURI&&best?.voiceURI!==activeVoice))speak();};
 synth?.addEventListener?.('voiceschanged',changed);
 return {
  state,
  reserveArrivalForVoiceover(){heard.add(language+':arrival');if(current?.zone==='arrival'){stop();current=null;emit();}},
  setRole(next){if(role===next)return;role=next;speak();},
  visit(location,{force=false}={}){const next=narrationFor(location,language);if(!force&&(current?.zone===next.zone||next.zone==='arrival'&&heard.has(language+':arrival')))return;current=next;speak(force);},
  replay(){speak(true);},
  retry(){speak();},
  setEnabled(value){enabled=value;speak();},
  setPaused(value){if(paused===value)return;paused=value;if(paused){stop();emit();}else speak();},
  setLanguage(value){if(recorded)return;language=value;voiceURI='';if(current)current=narrationFor({arrival:'Hall',entrance:'Acceso',meeting:'Sala ',kitchen:'Cocina',office:'Pasillo'}[current.zone],language);speak();},
  setVoice(value){if(recorded)return;voiceURI=value;speak();},
  setVolume(value){volume=Math.max(0,Math.min(1,Number(value)));if(utterance)utterance.volume=volume;if(localAudio)localAudio.volume=volume;emit();},
  destroy(){stop();synth?.removeEventListener?.('voiceschanged',changed);}
 };
}
