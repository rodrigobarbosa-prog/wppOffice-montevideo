import test from 'node:test';
import assert from 'node:assert/strict';
import {processMicrophone} from '../src/microphone-processing.js';
function harness(){
 const nodes=[];let context,stops=0;
 const node=()=>{const value={frequency:{},Q:{},gain:{},threshold:{},knee:{},ratio:{},attack:{},release:{},connections:[],connect(next){this.connections.push(next);return next;},disconnect(){this.disconnected=true;}};nodes.push(value);return value;};
 class Context{constructor(options){context=this;this.options=options;}resume(){return Promise.resolve();}close(){this.closed=true;return Promise.resolve();}createMediaStreamSource(){return node();}createBiquadFilter(){return node();}createGain(){return node();}createDynamicsCompressor(){return node();}createMediaStreamDestination(){const dest=node();dest.stream={getTracks:()=>[{stop(){stops++;}}]};return dest;}}
 return {Context,nodes,get context(){return context;},get stops(){return stops;}};
}
test('balanced microphone has a continuous path for quiet voice and releases every node on mute',async()=>{
 const h=harness(),result=await processMicrophone({},h);
 assert.equal(result.mode,'balanced');assert.equal(h.nodes[0].connections[0],h.nodes[1]);
 assert.equal(h.nodes[1].frequency.value,70);assert.equal(h.nodes[2].gain.value,1.35);
 assert.equal(h.nodes[3].threshold.value,-6);assert.equal(h.nodes[3].connections[0],h.nodes[4]);
 result.destroy();assert.ok(h.nodes.every(n=>n.disconnected));assert.equal(h.stops,1);assert.equal(h.context.closed,true);
});
test('unavailable audio processing keeps the original microphone stream',async()=>{
 const raw={};const result=await processMicrophone(raw,{Context:undefined});assert.equal(result.stream,raw);assert.equal(result.mode,'browser');
 class BrokenContext {async resume(){throw Error('unavailable');}close(){return Promise.resolve();}}
 const failed=await processMicrophone(raw,{Context:BrokenContext});assert.equal(failed.stream,raw);assert.equal(failed.mode,'browser');
});
