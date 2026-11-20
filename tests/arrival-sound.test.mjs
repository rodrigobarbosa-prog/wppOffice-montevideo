import test from 'node:test';
import assert from 'node:assert/strict';
import {createArrivalIntro,liftArrival} from '../src/arrival-intro.js';
import {createArrivalSound} from '../src/arrival-sound.js';

test('arrival cues follow the ride, doors and walking distance using the shared context',()=>{
 const buffers=[],starts=[],stops=[],levels=[];
 const context={
  currentTime:0,state:'running',destination:{},
  createBuffer(_,length){const data=new Float32Array(length),buffer={getChannelData:()=>data};buffers.push(buffer);return buffer;},
  createGain(){return {gain:{value:0,setTargetAtTime(value){levels.push(value);}},connect(){return this;},disconnect(){}};},
  createBufferSource(){return {connect(gain){this.gain=gain;return gain;},start(){starts.push(this);},stop(){stops.push(this);this.onended?.();},disconnect(){}};}
 };
 const intro=createArrivalIntro(),sound=createArrivalSound({output:{getContext:()=>context}});
 sound.update(null);assert.equal(buffers.length,0);
 intro.start(5);
 const feed=(step,voice=true)=>sound.update({...step,voice,z:liftArrival.client.z+(liftArrival.exit.z-liftArrival.client.z)*step.exit});
 feed(intro.update(.1));assert.equal(starts.length,1);assert.equal(levels.at(-1),.055);
 feed(intro.update(.1),false);assert.equal(levels.at(-1),.084);
 feed(intro.update(.1,{audioFinished:true}));
 for(let i=0;i<75&&intro.active;i++)feed(intro.update(.1,{audioFinished:true}),false);
 const names=starts.map(source=>buffers.indexOf(source.buffer));
 assert.equal(names.filter(n=>n===2).length,1);
 assert.equal(names.filter(n=>n===1).length,1);
 assert.ok(names.includes(3)&&names.includes(4));
 assert.ok(stops.includes(starts[0]));
 sound.update(null);sound.destroy();
 assert.ok(starts.every(source=>stops.includes(source)));
});
