// Frame interval, not CPU submission time, detects a GPU-bound renderer too.
// Only step down after sustained slow frames; never oscillate quality while moving.
export function createAdaptiveQuality({sampleSize=60,cooldown=3500}={}){
 let samples=[],level=0,last=-Infinity;
 return {reset(){samples=[];level=0;last=-Infinity;},observe(seconds,now,active=true){
  if(!active||!Number.isFinite(seconds)||seconds<.004||seconds>.2){samples=[];return null;}
  samples.push(seconds*1000);if(samples.length<sampleSize)return null;
  const sorted=samples.sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)];samples=[];
  if(level<2&&median>24&&now-last>=cooldown){level++;last=now;return level;}return null;
 }};
}
