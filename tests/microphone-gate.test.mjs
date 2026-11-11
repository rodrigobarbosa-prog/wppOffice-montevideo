import test from 'node:test';
import assert from 'node:assert/strict';
import {MicrophoneGate} from '../src/microphone-gate.js';
function signal(gate,amplitude,seconds){
 let energy=0,count=0;
 for(let frame=0;frame<Math.ceil(seconds*48000/128);frame++){
  const input=Float32Array.from({length:128},(_,i)=>amplitude*Math.sin((frame*128+i)*2*Math.PI*440/48000)),output=new Float32Array(128);
  gate.process(input,output);if(frame>20)for(const v of output){energy+=v*v;count++;}
 }
 return Math.sqrt(energy/count);
}
test('soft breathing is attenuated while speech opens the gate and short pauses keep it open',()=>{
 const gate=new MicrophoneGate();
 assert.ok(signal(gate,.002,.4)<.0001);
 assert.ok(signal(gate,.05,.4)>.03);
 signal(gate,0,.1);assert.ok(gate.gain>.95);
 signal(gate,0,.8);assert.ok(gate.gain<.03);
 assert.ok(signal(gate,.002,.4)<.0001);
});
