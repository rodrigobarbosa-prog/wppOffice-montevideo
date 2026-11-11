// Soft gate with hysteresis, a speech hold and lookahead to preserve word starts.
export class MicrophoneGate {
 constructor(sampleRate=48000){
  this.rate=sampleRate;this.gain=.015;this.hold=0;
  this.delay=new Float32Array(Math.max(1,Math.round(sampleRate*.012)));this.cursor=0;
 }
 process(input,output){
  let power=0;for(const sample of input)power+=sample*sample;
  const rms=Math.sqrt(power/Math.max(1,input.length));
  const threshold=this.hold>0?.0035:.007;
  if(rms>=threshold)this.hold=this.rate*.22;
  else this.hold=Math.max(0,this.hold-input.length);
  const target=this.hold>0?1:.015,time=target>this.gain?.004:.09;
  const smoothing=1-Math.exp(-1/(this.rate*time));
  for(let i=0;i<output.length;i++){
   const delayed=this.delay[this.cursor];this.delay[this.cursor]=input[i]||0;
   this.cursor=(this.cursor+1)%this.delay.length;
   this.gain+=(target-this.gain)*smoothing;output[i]=delayed*this.gain;
  }
 }
}
