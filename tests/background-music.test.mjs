import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackgroundMusic} from '../src/background-music.js';

test('lounge starts only inside the visit, loops quietly, ducks and mutes without touching microphones',async()=>{
 const targets=[],sources=[];let requests=0;
 const context={state:'running',currentTime:2,destination:{},createGain(){return {gain:{value:0,setTargetAtTime(value,time,speed){targets.push({value,time,speed});}},connect(){return this;},disconnect(){}};},createBufferSource(){const s={connect(){return this;},start(){s.started=true;},stop(){s.stopped=true;},disconnect(){}};sources.push(s);return s;}};
 const music=createBackgroundMusic({output:{getContext:()=>context,decode:async()=>({duration:27})},request:async()=>{requests++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(4)};}});
 music.update({playing:false});assert.equal(requests,0);
 music.update({playing:true});await new Promise(resolve=>setTimeout(resolve,0));music.update({playing:true});
 assert.equal(requests,1);assert.equal(sources.length,1);assert.equal(sources[0].loop,true);assert.equal(targets.at(-1).value,.65);
 music.update({playing:true,conversation:true});assert.equal(targets.at(-1).value,.12);
 music.setEnabled(false);music.update({playing:true});assert.equal(targets.at(-1).value,0);
 music.setEnabled(true);music.update({playing:true});assert.equal(targets.at(-1).value,.65);assert.equal(sources.length,1);
 music.update({playing:false});assert.equal(targets.at(-1).value,0);music.destroy();assert.ok(sources[0].stopped);
});

test('failed music download stays optional and does not retry every frame',async()=>{
 let requests=0;const states=[];const music=createBackgroundMusic({output:{getContext:()=>null},onChange:s=>states.push(s),request:async()=>{requests++;throw Error('offline');}});
 music.update({playing:true});await new Promise(resolve=>setTimeout(resolve,0));music.update({playing:true});
 assert.equal(requests,1);assert.equal(states.at(-1).error,true);music.destroy();
});
