const sampleRate=24000;
const wave=(frequency,t)=>Math.sin(2*Math.PI*frequency*t);

function makeBuffer(context,duration,sample){
 const buffer=context.createBuffer(1,Math.round(duration*sampleRate),sampleRate),data=buffer.getChannelData(0);
 let seed=3947,low=0;
 for(let i=0;i<data.length;i++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const noise=seed/2147483648-1;
  low+=(noise-low)*.065;
  data[i]=sample(i/sampleRate,noise,low);
 }
 return buffer;
}
function arrivalBuffers(context){
 const foot=(frequency,brightness)=>makeBuffer(context,.18,(t,noise,low)=>{
  const attack=Math.min(1,t/.007),decay=Math.exp(-t*31);
  return attack*decay*(.6*wave(frequency,t)+.65*low+brightness*noise*Math.exp(-t*42));
 });
 return {
  motor:makeBuffer(context,2,(t)=>.36*wave(56,t)+(.13+.04*wave(1.5,t))*wave(112,t)+.04*wave(168,t)),
  doors:makeBuffer(context,1.35,(t,noise,low)=>Math.min(1,t/.06,(1.35-t)/.06)*(.52*low+.19*noise+.06*wave(95,t))),
  chime:makeBuffer(context,.45,(t)=>Math.min(1,t/.009)*Math.exp(-t*10)*(.65*wave(659,t)+.12*wave(988,t))),
  cabinStep:foot(104,.09),hallStep:foot(135,.24)
 };
}
export function createArrivalSound({output,thresholdZ=2.67}){
 const loops=new Map(),oneShots=new Set();
 let buffers=null,lastPhase='pending',lastZ=null,stride=0,stepCount=0;
 function bed(context,name,volume){
  let loop=loops.get(name);
  if(!loop&&volume>0){
   const source=context.createBufferSource(),gain=context.createGain();
   source.buffer=buffers[name];source.loop=true;gain.gain.value=0;
   source.connect(gain).connect(context.destination);source.start();
   loop={source,gain,volume:0};loops.set(name,loop);
  }
  if(loop&&loop.volume!==volume){
   loop.volume=volume;loop.gain.gain.setTargetAtTime(volume,context.currentTime,.1);
  }
 }
 function play(context,name,volume){
  const source=context.createBufferSource(),gain=context.createGain();
  source.buffer=buffers[name];gain.gain.value=volume;source.connect(gain).connect(context.destination);
  oneShots.add(source);
  source.onended=()=>{source.disconnect();gain.disconnect();oneShots.delete(source);};
  source.start();
 }
 function stop(){
  for(const {source,gain} of loops.values()){source.stop();source.disconnect();gain.disconnect();}
  loops.clear();
  for(const source of oneShots)source.stop();
  oneShots.clear();lastZ=null;
 }
 return {
  update(step){
   if(!step){if(loops.size||oneShots.size)stop();lastZ=null;return;}
   if(step.phase==='complete'&&!buffers)return;
   const context=output.getContext();if(!context||context.state!=='running')return;
   buffers??=arrivalBuffers(context);
   bed(context,'motor',step.phase==='rising'?(step.voice?.055:.084):0);
   bed(context,'doors',step.door>0&&step.door<.999?.12:0);
   if(lastPhase==='rising'&&step.phase==='arriving')play(context,'chime',.09);
   if(step.exit>0&&lastZ!==null){
    const travelled=Math.max(0,lastZ-step.z);
    stride+=Math.min(travelled,.22);
    if(stride>=.39){
     stride-=.39;stepCount++;
     play(context,step.z>thresholdZ?'cabinStep':'hallStep',stepCount%2?.092:.077);
    }
   }
   if(step.phase==='complete'&&lastPhase!=='complete'){
    // Let the last step decay without keeping silent motor sources alive.
    for(const {source,gain} of loops.values()){source.stop();source.disconnect();gain.disconnect();}
    loops.clear();
   }
   lastZ=step.z;lastPhase=step.phase;
  },
  destroy(){stop();}
 };
}
