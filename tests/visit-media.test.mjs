import test from 'node:test';
import assert from 'node:assert/strict';
import {createVisitMedia} from '../src/visit-media.js';
const stream=()=>{const track={stopped:false,stop(){this.stopped=true;}};return {getTracks:()=>[track],track};};
test('microphone requests audio only, stops on mute or role change, and every role can use it',async()=>{
 let state,calls=0,latest;
 const media=createVisitMedia({devices:{async getUserMedia(options){assert.equal(options.video,false);assert.equal(options.audio.noiseSuppression,true);assert.equal(options.audio.echoCancellation,true);assert.equal(options.audio.autoGainControl,true);calls++;return latest=stream();}},onChange:s=>state=s});
 for(const role of ['client','presenter','collaborator']){
  media.setRole(role);await media.toggleMic();assert.equal(state.mic,true);await media.toggleMic();assert.equal(state.mic,false);assert.equal(latest.track.stopped,true);
 }
 assert.equal(calls,3);await media.toggleMic();media.setRole('client');assert.equal(latest.track.stopped,true);assert.equal(state.mic,false);
});

test('only processed microphone audio is published and both input and filter stop on mute',async()=>{
 const raw=stream(),clean=stream();let state,published,destroyed=0;
 const media=createVisitMedia({devices:{getUserMedia:async()=>raw},processAudio:async()=>({stream:clean,mode:'filtered',destroy(){destroyed++;}}),onChange:s=>state=s,onStreams:s=>published=s});
 await media.toggleMic();assert.deepEqual(published,[clean]);assert.equal(state.noiseMode,'filtered');
 await media.toggleMic();assert.equal(raw.track.stopped,true);assert.equal(clean.track.stopped,true);assert.equal(destroyed,1);assert.deepEqual(published,[]);
});

test('leaving while the audio filter loads cannot publish or retain an old capture',async()=>{
 const raw=stream(),clean=stream();let resolve,started,published=[];
 const ready=new Promise(r=>started=r);let disposed=false;
 const media=createVisitMedia({devices:{getUserMedia:async()=>raw},processAudio:()=>{started();return new Promise(r=>resolve=r);},onStreams:s=>published=s});
 const pending=media.toggleMic();await ready;media.setRole('presenter');assert.equal(raw.track.stopped,true);
 resolve({stream:clean,mode:'filtered',destroy(){disposed=true;clean.track.stop();}});await pending;
 assert.equal(disposed,true);assert.equal(clean.track.stopped,true);assert.deepEqual(published,[]);
});
test('only collaborator can share a real screen, capture stops cleanly and denial is recoverable',async()=>{
 let calls=0,state,current;
 const media=createVisitMedia({devices:{async getDisplayMedia(options){calls++;assert.equal(options.audio,false);return current=stream();}},onChange:s=>state=s,onScreen:()=>{}});
 await media.toggleScreen();assert.equal(calls,0);
 media.setRole('collaborator');await media.toggleScreen();assert.equal(state.sharing,true);
 media.setRole('client');assert.equal(state.sharing,true); // Visitor can view Brian's capture in the local role preview.
 current.track.onended();assert.equal(state.sharing,false);
 media.destroy();assert.equal(state.mic,false);
 const denied=createVisitMedia({devices:{async getUserMedia(){throw Object.assign(Error(),{name:'NotAllowedError'});}},onChange:s=>state=s});
 await denied.toggleMic();assert.equal(state.mic,false);assert.match(state.error,/permission/);assert.equal(state.micPending,false);
});
test('a permission response after leaving the role cannot leave the microphone running',async()=>{
 let resolve;const audio=stream();let state;
 const media=createVisitMedia({devices:{getUserMedia:()=>new Promise(r=>resolve=r)},onChange:s=>state=s});
 const pending=media.toggleMic();media.setRole('presenter');resolve(audio);await pending;
 assert.equal(state.mic,false);assert.equal(audio.track.stopped,true);
});
