// Local-only benchmark: same application, camera and UI code; no microphone.
const params=new URL(location.href).searchParams,output=document.createElement('pre');output.id='qa-performance';output.style='position:fixed;left:16px;bottom:16px;z-index:9999;padding:16px;background:#102824ed;color:white;font:13px monospace;max-width:92vw;pointer-events:none';document.body.append(output);
const samples=[],duration=Number(params.get('seconds'))||12;let started=0,collecting=0,lastKey=null,lastPosition=null,travelled=0,measured=0,lastSample=0;
const percentile=(values,p)=>{const s=values.slice().sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.floor(s.length*p))]||0;};
const timer=setInterval(()=>{
 const canvas=document.getElementById('scene');
 if(!window.officePilot){output.textContent='Waiting for scene and characters…';return;}
 if(!started){document.getElementById('enter').click();if(document.getElementById('voice-toggle').getAttribute('aria-pressed')==='true')document.getElementById('voice-toggle').click();if(params.get('quality')==='smooth')document.getElementById('quality').click();if(params.get('camera')==='third'){const view=document.getElementById('camera-view');view.value='third';view.dispatchEvent(new Event('change'));}started=performance.now();}
 if(performance.now()-started<(Number(params.get('warmup'))||2000))return;
 const sampleNow=performance.now(),frame=Number(canvas.dataset.frameMs);
 // Do not censor genuinely slow foreground frames: they are the stutters we
 // need to measure. Pause only when the document actually reports hidden.
 if(document.visibilityState!=='visible'){lastSample=sampleNow;if(lastKey){window.dispatchEvent(new KeyboardEvent('keyup',{code:lastKey}));lastKey=null;}output.textContent='Measurement paused: browser document is hidden.';return;}
 if(!collecting)collecting=performance.now();
 if(lastSample)measured+=Math.min(200,sampleNow-lastSample);lastSample=sampleNow;
 if(params.get('motion')==='walk'){
  const key=Math.floor((performance.now()-collecting)/2000)%2?'KeyA':'KeyD';if(key!==lastKey){if(lastKey)window.dispatchEvent(new KeyboardEvent('keyup',{code:lastKey}));window.dispatchEvent(new KeyboardEvent('keydown',{code:key,cancelable:true}));lastKey=key;}
 }
 const position=canvas.dataset.position?.split(',').map(Number);if(position&&lastPosition)travelled+=Math.hypot(position[0]-lastPosition[0],position[2]-lastPosition[2]);lastPosition=position;
 samples.push({frame:Number(canvas.dataset.frameMs),renderCpu:Number(canvas.dataset.renderCpuMs),drawCalls:Number(canvas.dataset.drawCalls),triangles:Number(canvas.dataset.triangles)});
 output.textContent='Measuring '+params.get('vista')+' / '+(params.get('quality')||'detail')+' / '+(params.get('camera')||'first')+' · '+samples.length+' samples';
 if(measured<duration*1000)return;
 if(lastKey)window.dispatchEvent(new KeyboardEvent('keyup',{code:lastKey}));
 const result={view:params.get('vista'),quality:params.get('quality')||'detail',camera:params.get('camera')||'first',motion:params.get('motion')||'idle',travelled:+travelled.toFixed(2),effectiveQuality:document.getElementById('quality').textContent,pixelRatio:canvas.width/innerWidth,profile:canvas.dataset.graphicsProfile,samples:samples.length,frameMedian:percentile(samples.map(s=>s.frame),.5),frameP95:percentile(samples.map(s=>s.frame),.95),renderCpuMedian:percentile(samples.map(s=>s.renderCpu),.5),drawCalls:percentile(samples.map(s=>s.drawCalls),.5),triangles:percentile(samples.map(s=>s.triangles),.5)};
 output.textContent=JSON.stringify(result,null,2);output.dataset.complete='true';clearInterval(timer);
},100);
