import test from 'node:test';
import assert from 'node:assert/strict';
import {createArrivalVoice} from '../src/arrival-voice.js';
import {createLoadingProgress} from '../src/loading-progress.js';
function fixture(){
 let clip,blocked=false;const progress=[];
 class AudioClass extends EventTarget{constructor(){super();clip=this;this.paused=true;this.duration=17.26;this.currentTime=0;}load(){queueMicrotask(()=>this.dispatchEvent(new Event('loadeddata')));}async play(){if(blocked)throw Error('Gesture required');this.paused=false;this.onplaying?.();}pause(){this.paused=true;this.onpause?.();}removeAttribute(){}}
 const request=async()=>({ok:true,headers:{get:()=>4},body:new Blob([new Uint8Array(4)]).stream()});
 const voice=createArrivalVoice({AudioClass,request,onProgress:value=>progress.push(value)});
 return {voice,progress,get clip(){return clip;},block(value){blocked=value;}};
}
test('welcome is loaded before readiness and only a genuine media end completes it',async()=>{
 const f=fixture();assert.equal(f.voice.state().ready,false);await f.voice.load();assert.equal(f.voice.state().ready,true);assert.equal(f.progress.at(-1),1);
 await f.voice.play();assert.equal(f.voice.state().playing,true);assert.equal(f.voice.state().finished,false);
 f.voice.pause();assert.equal(f.voice.state().finished,false);await f.voice.play();assert.equal(f.voice.state().finished,false);
 f.clip.onended();assert.equal(f.voice.state().finished,true);f.voice.destroy();
});
test('blocked audio requires retry and never releases the elevator',async()=>{
 const f=fixture();await f.voice.load();f.block(true);await f.voice.play();assert.match(f.voice.state().error,/Retry/);assert.equal(f.voice.state().finished,false);
 f.block(false);await f.voice.retry();assert.equal(f.voice.state().error,'');assert.equal(f.voice.state().playing,true);f.voice.destroy();
});
test('preparation progress never runs backwards and needs every stage to reach 100 percent',()=>{
 const states=[],progress=createLoadingProgress(state=>states.push(state));
 progress.set('office',.8,'Loading office');progress.set('office',.2,'More resources');assert.equal(states.at(-1).percent,44);
 for(const stage of ['office','lighting','people'])progress.set(stage,1,'Ready');assert.equal(states.at(-1).percent,85);
 progress.set('welcome',.98,'Decoding welcome');assert.ok(states.at(-1).percent<100);progress.set('welcome',1,'Ready');assert.equal(states.at(-1).percent,100);
});
