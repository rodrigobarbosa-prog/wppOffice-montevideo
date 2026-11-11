import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

export async function startLocalVoice(){
 try{const response=await fetch('http://127.0.0.1:4182/status',{signal:AbortSignal.timeout(500)});if(response.ok&&(await response.json()).narration==='Kokoro')return;}catch{}
 const python=fileURLToPath(new URL('./artifacts/voice-env/Scripts/python.exe',import.meta.url));
 if(!existsSync(python)||!existsSync(new URL('./artifacts/voice-models/voices.bin',import.meta.url)))return;
 const child=spawn(python,[fileURLToPath(new URL('./scripts/local-voice.py',import.meta.url))],{windowsHide:true,stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',chunk=>process.stdout.write(chunk));child.stderr.on('data',chunk=>process.stderr.write(chunk));child.on('error',()=>console.log('Local voice unavailable.'));
 process.once('exit',()=>child.kill());
}
export async function localVoiceProxy(req,res){
 const route=new URL(req.url,'http://localhost').pathname;
 if(!route.startsWith('/voice/'))return false;
 const send=(code,body)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
 const host=req.headers.host;
 if(!['localhost:4180','127.0.0.1:4180'].includes(host)||req.headers.origin&&!['http://localhost:4180','http://127.0.0.1:4180'].includes(req.headers.origin)||req.headers['sec-fetch-site']==='cross-site'){send(403,{error:'Local access only'});return true;}
 if(!['/voice/status','/voice/speak'].includes(route)||req.method!==(route==='/voice/status'?'GET':'POST')){send(404,{error:'Not found'});return true;}
 try{
  let size=0;const chunks=[];
  for await(const chunk of req){size+=chunk.length;if(size>2_000_000){send(413,{error:'Audio too long'});return true;}chunks.push(chunk);}
  const upstream=await fetch('http://127.0.0.1:4182'+route.slice(6),{method:req.method,headers:{'Content-Type':req.headers['content-type']||'application/json'},body:req.method==='POST'?Buffer.concat(chunks):undefined,signal:AbortSignal.timeout(120000)});
  res.writeHead(upstream.status,{'Content-Type':upstream.headers.get('content-type')||'application/json','Cache-Control':'no-store'});res.end(Buffer.from(await upstream.arrayBuffer()));
 }catch{send(503,{ready:false,error:'Local voice is not available'});}
 return true;
}
