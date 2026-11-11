import test from 'node:test';import assert from 'node:assert/strict';
import {createVisitAudioOutput,createBufferedAudioClass} from '../src/visit-audio-output.js';
function fixture(){
 let gesture=false,contexts=0;const sources=[];
 class Context{
  constructor(){contexts++;this.state='suspended';this.currentTime=0;this.destination={};}
  resume(){if(!gesture)return Promise.reject(Error('gesture required'));this.state='running';this.onstatechange?.();return Promise.resolve();}
  decodeAudioData(){return Promise.resolve({duration:5});}
  createGain(){return {gain:{value:1},connect(){return this;},disconnect(){}};}
  createBufferSource(){const source={connect(){return this;},start(){source.started=true;},stop(){source.onended?.();},disconnect(){source.disconnected=true;}};sources.push(source);return source;}
  createMediaStreamSource(stream){const source={stream,connect(){source.connected=true;},disconnect(){source.disconnected=true;}};sources.push(source);return source;}
  close(){this.state='closed';return Promise.resolve();}
 }
 const output=createVisitAudioOutput({Context});const AudioClass=createBufferedAudioClass(output,{request:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)})});
 return {output,AudioClass,sources,get contexts(){return contexts;},tap(){gesture=true;const promise=output.unlock();gesture=false;return promise;}};
}
test('one entry tap permits narration and a presenter microphone arriving later on mobile',async()=>{
 const f=fixture(),states=[];f.output.subscribe(s=>states.push(s));
 const welcome=new f.AudioClass('welcome');await welcome.load();assert.equal(f.contexts,1);assert.equal(await f.tap(),true);await welcome.play();
 const stream={id:'presenter microphone'};assert.equal(f.output.remote('presenter',stream),true);
 const tour=new f.AudioClass('office');await tour.play();assert.equal(f.contexts,1);assert.equal(f.sources.filter(s=>s.started).length,2);assert.equal(f.sources.find(s=>s.stream===stream).connected,true);
 assert.equal(states.at(-1).needsTap,false);f.output.remove('presenter');assert.equal(f.sources.find(s=>s.stream===stream).disconnected,true);f.output.destroy();
});
test('a mobile autoplay block asks for a tap and recovers without changing the recording',async()=>{
 const f=fixture(),audio=new f.AudioClass('welcome');let blocked=false;f.output.subscribe(s=>blocked=s.needsTap);
 await assert.rejects(audio.play(),{name:'NotAllowedError'});assert.ok(blocked);assert.equal(await f.tap(),true);await audio.play();assert.equal(audio.paused,false);assert.equal(audio.src,'welcome');f.output.destroy();
});
test('welcome pause and resume preserve time, and only real completion calls onended',async()=>{
 const f=fixture(),audio=new f.AudioClass('welcome');await f.tap();let ended=0;audio.onended=()=>ended++;await audio.play();
 f.output.getContext().currentTime=2;audio.pause();assert.equal(audio.currentTime,2);assert.equal(ended,0);await audio.play();f.sources.at(-1).onended();assert.equal(ended,1);assert.equal(audio.currentTime,5);f.output.destroy();
});
