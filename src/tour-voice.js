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
  es:{arrival:'Bienvenido a WPP Production, en Montevideo. Estamos llegando al piso catorce. Al abrirse las puertas, tu presentador te estará esperando para acompañarte por la oficina.',entrance:'Estamos en la entrada de la oficina. En una visita compartida, el presentador abre la puerta y el cliente lo acompaña. Vamos a entrar.',office:'Este es nuestro espacio de trabajo. Los puestos enfrentados y las salas de reunión conectan las distintas áreas del equipo. Seguime, y vamos conociendo los distintos espacios.',meeting:'Estas son nuestras salas de reunión. Los frentes de vidrio permiten mantener la conexión visual con la oficina, con mesas y equipamiento para trabajar en equipo.',kitchen:'Llegamos a la cocina y al espacio de encuentro del equipo. Podés detenerte y mirar los detalles antes de continuar.'},
  en:{arrival:'Welcome to WPP Production in Montevideo. We are arriving on floor fourteen. When the doors open, your presenter will be waiting to guide you through the office.',entrance:'This is the office entrance. The door starts closed. Move closer, look at it, and press E, or use the button on screen, to open or close it.',office:'This is our workspace. Facing workstations and meeting rooms connect the different areas of the team. I will stay beside you as you explore.',meeting:'These are our meeting rooms. Glass fronts keep a visual connection with the office, with tables and equipment for teamwork.',kitchen:'This is the kitchen and the team gathering space. Take a moment to look around before continuing.'}
 };
 return {zone,text:(scripts[language]||scripts.es)[zone]};
}

export function createTourVoice({synth,Utterance,onChange=()=>{},request=globalThis.fetch,AudioClass=globalThis.Audio,recorded=false}){
 let localAudio=null,localUrl=null,controller=null,localVoice=false,arrivalPlayed=false;
 let role='client',enabled=true,paused=true,language=recorded?'en':'es',voiceURI='',volume=.8,current=null,utterance=null,activeVoice='',speaking=false,error='',generation=0;
 const voices=()=>synth?.getVoices?.()||[];
 const state=()=>({role,audible:narrationPolicy(role).audio,enabled,paused,language,voiceURI,volume,speaking,error,supported:Boolean(AudioClass||synth&&Utterance),voices:recorded?[]:voices().filter(v=>v.localService!==false),voiceName:recorded?voiceProfile.name:localVoice?'Kokoro · local':voices().find(v=>v.voiceURI===activeVoice)?.name||'',text:current?.text||'',zone:current?.zone||''});
 const emit=()=>onChange(state());
 function stop(){generation++;controller?.abort();controller=null;localAudio?.pause();localAudio=null;if(localUrl)URL.revokeObjectURL(localUrl);localUrl=null;speaking=false;if(synth)synth.cancel();utterance=null;}
 async function speak(){
  stop();error='';
  if(!current||!enabled||paused||!narrationPolicy(role).audio){emit();return;}
  const localToken=generation;localVoice=false;
  if(!voiceURI&&request&&AudioClass){
   controller=new AbortController();const localController=controller,timeout=setTimeout(()=>localController.abort(),45000);
   try{
    const response=await request(recorded?narrationAudioUrl(current.zone):'/voice/speak',recorded?{signal:controller.signal,cache:'no-cache'}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:current.text,language}),signal:controller.signal});
    if(!response.ok)throw Error('Local voice unavailable');
    const blob=await response.blob();if(localToken!==generation)return;
    localUrl=URL.createObjectURL(blob);localAudio=new AudioClass(localUrl);localAudio.volume=volume;localVoice=true;
    localAudio.onplaying=()=>{if(localToken===generation){speaking=true;if(current?.zone==='arrival')arrivalPlayed=true;emit();}};
    localAudio.onended=()=>{if(localToken===generation){speaking=false;emit();}};
    localAudio.onerror=()=>{if(localToken===generation){speaking=false;error='Local audio unavailable';emit();}};
    await localAudio.play();emit();return;
   }catch{if(localToken!==generation)return;}
   finally{clearTimeout(timeout);}
  }
  if(recorded){error='Voiceover unavailable · tap Replay to retry';emit();return;}
  if(!synth||!Utterance){error='Voice unavailable · captions on';emit();return;}
  const all=voices(),matching=all.filter(v=>v.lang.toLowerCase().startsWith(language));
  const selected=selectTourVoice(all,language,voiceURI);
  if(!selected){error='No voice for this language · captions on';emit();return;}
  activeVoice=selected.voiceURI;const token=generation;utterance=new Utterance(current.text);
  utterance.lang=selected.lang;utterance.voice=selected;utterance.rate=1;utterance.pitch=1;utterance.volume=volume;
  utterance.onstart=()=>{if(token!==generation)return;speaking=true;if(current?.zone==='arrival')arrivalPlayed=true;emit();};
  utterance.onend=()=>{if(token!==generation)return;speaking=false;utterance=null;emit();};
  utterance.onerror=event=>{if(token!==generation)return;speaking=false;utterance=null;if(!['interrupted','canceled'].includes(event.error))error='Audio unavailable · captions on';emit();};
  try{synth.speak(utterance);}catch{error='Audio unavailable · captions on';speaking=false;}
  emit();
 }
 const changed=()=>{if(recorded)return;emit();const best=selectTourVoice(voices(),language,voiceURI);if(!localVoice&&enabled&&!paused&&current&&(error||!voiceURI&&best?.voiceURI!==activeVoice))speak();};
 synth?.addEventListener?.('voiceschanged',changed);
 return {
  state,
  reserveArrivalForVoiceover(){arrivalPlayed=true;if(current?.zone==='arrival'){stop();current=null;emit();}},
  setRole(next){if(role===next)return;role=next;speak();},
  visit(location,{force=false}={}){const next=narrationFor(location,language);if(!force&&(current?.zone===next.zone||next.zone==='arrival'&&arrivalPlayed))return;current=next;speak();},
  replay:speak,
  setEnabled(value){enabled=value;speak();},
  setPaused(value){if(paused===value)return;paused=value;if(paused){stop();emit();}else speak();},
  setLanguage(value){if(recorded)return;language=value;voiceURI='';if(current)current=narrationFor({arrival:'Hall',entrance:'Acceso',meeting:'Sala ',kitchen:'Cocina',office:'Pasillo'}[current.zone],language);speak();},
  setVoice(value){if(recorded)return;voiceURI=value;speak();},
  setVolume(value){volume=Math.max(0,Math.min(1,Number(value)));if(utterance)utterance.volume=volume;if(localAudio)localAudio.volume=volume;emit();},
  destroy(){stop();synth?.removeEventListener?.('voiceschanged',changed);}
 };
}
