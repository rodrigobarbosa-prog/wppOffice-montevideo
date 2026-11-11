import {MicrophoneGate} from './microphone-gate.js';
class CleanMicrophone extends AudioWorkletProcessor {
 constructor(){super();this.gate=new MicrophoneGate(sampleRate);}
 process(inputs,outputs){
  const output=outputs[0]?.[0];if(output)this.gate.process(inputs[0]?.[0]||new Float32Array(output.length),output);
  return true;
 }
}
registerProcessor('wpp-clean-microphone',CleanMicrophone);
