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
