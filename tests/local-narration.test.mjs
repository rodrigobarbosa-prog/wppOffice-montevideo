import test from 'node:test';
import assert from 'node:assert/strict';
import {createTourVoice} from '../src/tour-voice.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('local narration drives speaking gestures and is cancelled when changing to presenter',async()=>{
 const clips=[],calls=[];
 class AudioClass{constructor(url){this.url=url;clips.push(this);}async play(){this.onplaying();}pause(){this.stopped=true;}}
 const voice=createTourVoice({AudioClass,request:async(url,options)=>{calls.push({url,options});return {ok:true,blob:async()=>new Blob(['wav'])};}});
 voice.visit('Hall');voice.setPaused(false);await tick();
 assert.equal(calls[0].url,'/voice/speak');assert.equal(voice.state().voiceName,'Kokoro · local');assert.equal(voice.state().speaking,true);
 voice.setRole('presenter');assert.equal(clips[0].stopped,true);assert.equal(voice.state().speaking,false);assert.equal(calls.length,1);voice.destroy();
});
test('a delayed synthesis reply cannot play after the client mutes narration',async()=>{
 let finish,created=0;
 class AudioClass{constructor(){created++;}play(){return Promise.resolve();}}
 const voice=createTourVoice({AudioClass,request:()=>new Promise(resolve=>{finish=resolve;})});
 voice.visit('Hall');voice.setPaused(false);voice.setEnabled(false);
 finish({ok:true,blob:async()=>new Blob(['wav'])});await tick();assert.equal(created,0);assert.equal(voice.state().speaking,false);voice.destroy();
});
