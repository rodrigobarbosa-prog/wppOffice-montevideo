// Phrase-based local translation. The synthesized English voice is NOT a voice clone.
export async function startLocalTranslation(stream,{onStatus=()=>{},onSpeaking=()=>{},onError=()=>{},preservesVoice=false}={}){
 if(!globalThis.MediaRecorder)throw Error('Recording is unavailable in this browser');
 const context=new AudioContext({sampleRate:48000}),output=context.createMediaStreamDestination();
 await context.resume();
 const input=context.createMediaStreamSource(stream),analyser=context.createAnalyser();input.connect(analyser);
 const data=new Float32Array(1024);analyser.fftSize=1024;
 let stopped=false,busy=false,recorder=null,timer=null,poll=null,hasSpeech=false,abort=null,queued=null,startedAt=0,lastSpeechAt=0,nextPlayAt=0;
 const players=new Set();
 const status=text=>{if(!stopped)onStatus(text);};
 const listening=()=>status(preservesVoice?'Listening · local voice adaptation · phrase delay':'Listening · English synthetic voice · phrase delay');
 async function translate(blob){
  if(stopped||!blob.size)return;
  if(busy){if(queued)status('Translation cannot keep up · pause between phrases');queued=blob;return;}
  busy=true;abort=new AbortController();status('Translating locally…');
  const timeout=setTimeout(()=>abort?.abort(),90000);
  let failed=false;
  try{
   const response=await fetch('/voice/translate',{method:'POST',headers:{'Content-Type':blob.type},body:blob,signal:abort.signal});
   if(response.status===204)return;
   if(!response.ok)throw Error('Local translation unavailable');
   const buffer=await response.arrayBuffer();if(stopped)return;
   const decoded=await context.decodeAudioData(buffer);if(stopped)return;
   const when=Math.max(context.currentTime,nextPlayAt);
   if(when-context.currentTime>12){status('Interpretation delayed · pause between phrases');return;}
   const player=context.createBufferSource();player.buffer=decoded;player.connect(output);players.add(player);nextPlayAt=when+decoded.duration;
   onSpeaking(true);status(preservesVoice?'English voice playing · adapted to your timbre':'English voice playing · local synthetic voice');
   player.onended=()=>{players.delete(player);player.disconnect();if(stopped)return;onSpeaking(players.size>0);if(!players.size&&!busy)listening();};
   player.start(when);
  }catch(error){failed=true;if(!stopped){status('Translation failed');onError(error);}}
  finally{clearTimeout(timeout);busy=false;if(!stopped&&!failed&&!players.size)listening();if(queued&&!stopped){const next=queued;queued=null;void translate(next);}}
 }
 function record(){
  if(stopped)return;
  hasSpeech=false;startedAt=performance.now();lastSpeechAt=startedAt;const chunks=[];
  recorder=new MediaRecorder(stream);
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  recorder.onstop=()=>{clearTimeout(timer);if(stopped)return;if(hasSpeech)void translate(new Blob(chunks,{type:recorder.mimeType}));record();};
  recorder.start();timer=setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},8000);
 }
 try{
  poll=setInterval(()=>{analyser.getFloatTimeDomainData(data);const now=performance.now();if(Math.sqrt(data.reduce((n,x)=>n+x*x,0)/data.length)>.012){hasSpeech=true;lastSpeechAt=now;}else if(hasSpeech&&now-startedAt>1600&&now-lastSpeechAt>550&&recorder?.state==='recording')recorder.stop();},100);
  record();listening();
 }catch(error){destroy();throw error;}
 function destroy(){stopped=true;queued=null;clearTimeout(timer);clearInterval(poll);for(const player of players)player.stop();players.clear();abort?.abort();if(recorder?.state==='recording')recorder.stop();input.disconnect();analyser.disconnect();output.stream.getTracks().forEach(t=>t.stop());void context.close();}
 return {stream:output.stream,destroy};
}
