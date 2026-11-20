import test from 'node:test';import assert from 'node:assert/strict';
import {createTourVoice} from '../src/tour-voice.js';
import {voiceProfile,narrationAudioUrl} from '../src/voice-profile.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('production narration stays on the same English recording profile in every zone',async()=>{
 const urls=[];let systemSpeech=0;
 class AudioClass{async play(){this.onplaying?.();}pause(){}}
 const narrator=createTourVoice({recorded:true,AudioClass,synth:{getVoices:()=>[],cancel(){},speak(){systemSpeech++;}},request:async url=>{urls.push(url);return {ok:true,blob:async()=>new Blob(['wav'])};}});
 narrator.setPaused(false);
 for(const location of ['Hall','Acceso','Pasillo','Sala 01','Cocina']){narrator.visit(location);await tick();assert.equal(narrator.state().voiceName,voiceProfile.name);assert.equal(narrator.state().language,'en');}
 assert.deepEqual(urls.map(u=>new URL(u,'https://office.example').pathname),['arrival','entrance','office','meeting','kitchen'].map(z=>'/assets/audio/tour-en-'+z+'.wav'));
 narrator.setLanguage('es');narrator.setVoice('some-other-voice');assert.equal(narrator.state().language,'en');assert.equal(narrator.state().voiceURI,'');assert.equal(systemSpeech,0);narrator.destroy();
 assert.match(narrationAudioUrl('welcome'),/arrival-welcome-en.wav/);
});
test('a failed recording never switches the client to an unrelated system voice',async()=>{
 let spoken=0;class AudioClass{}
 const narrator=createTourVoice({recorded:true,AudioClass,synth:{getVoices:()=>[{voiceURI:'robot',lang:'en-US',localService:true}],cancel(){},speak(){spoken++;}},request:async()=>({ok:false})});
 narrator.visit('Pasillo');narrator.setPaused(false);await tick();assert.equal(spoken,0);assert.match(narrator.state().error,/Replay/);narrator.destroy();
});
test('mobile playback policy is recoverable activation, not Voice unavailable',async()=>{
 let blocked=true;class AudioClass{pause(){}async play(){if(blocked){const e=Error('tap');e.name='NotAllowedError';throw e;}this.onplaying?.();}}
 const narrator=createTourVoice({recorded:true,AudioClass,request:async()=>({ok:true,blob:async()=>new Blob(['wav'])})});
 narrator.visit('Pasillo');narrator.setPaused(false);await tick();assert.equal(narrator.state().error,'');assert.equal(narrator.state().needsActivation,true);
 blocked=false;narrator.replay();await tick();assert.equal(narrator.state().needsActivation,false);assert.equal(narrator.state().speaking,true);narrator.destroy();
});

test('recorded narration resumes from its offset and plays each completed zone only once',async()=>{
 const plays=[],files=[];
 class AudioClass{
  constructor(){this.currentTime=0;}
  pause(){}
  async play(){plays.push(this);this.onplaying?.();}
 }
 const narrator=createTourVoice({recorded:true,AudioClass,request:async url=>{files.push(url);return {ok:true,blob:async()=>new Blob(['wav'])};}});
 narrator.reserveArrivalForVoiceover();
 narrator.visit('Hall de ascensores');narrator.setPaused(false);await tick();
 assert.equal(plays.length,0,'the elevator welcome replaces the automatic hall narration');
 narrator.visit('Pasillo 2');await tick();
 plays[0].currentTime=1.4;
 narrator.setPaused(true);narrator.setPaused(false);await tick();
 assert.equal(plays[1].currentTime,1.4);
 plays[1].onended();
 narrator.visit('Sala 01');await tick();plays[2].onended();
 narrator.visit('Pasillo 1');narrator.setPaused(true);narrator.setPaused(false);
 narrator.setEnabled(false);narrator.setEnabled(true);await tick();
 assert.equal(plays.length,3);
 narrator.replay();await tick();
 assert.equal(plays.length,4);assert.equal(plays[3].currentTime,0);
 assert.deepEqual(files.map(u=>u.split('/').at(-1).split('.wav')[0]),['tour-en-office','tour-en-office','tour-en-meeting','tour-en-office']);
 narrator.destroy();
});
