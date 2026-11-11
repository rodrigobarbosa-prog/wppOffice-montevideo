import assert from 'node:assert/strict';
import {narrationFor} from '../src/tour-voice.js';
const base=process.argv[2],room='qa-'+Date.now().toString(36),controllers=[];
const timeout=setTimeout(()=>controllers.forEach(c=>c.abort()),25000);timeout.unref();
const presence=async()=>{const r=await fetch(`${base}/session/presence?id=lobby-test&room=${room}`);assert.equal(r.status,200);return (await r.json()).participants;};
async function join(id,role){const controller=new AbortController();controllers.push(controller);const response=await fetch(`${base}/session/events?id=${id}&room=${room}&joined=1&role=${role}&name=${role}`,{signal:controller.signal});assert.equal(response.status,200);const reader=response.body.getReader();return {controller,reader,event:new TextDecoder().decode((await reader.read()).value)};}
async function post(id,body){return fetch(`${base}/session/message?id=${id}&room=${room}`,{method:'POST',headers:{'Content-Type':'application/json',origin:base},body:JSON.stringify(body)});}
try{
 const health=await (await fetch(base+'/health')).json();assert.equal(health.service,'wppoffice-montevideo');console.log('PASS health');
 for(const path of ['/','/assets/visit.html','/assets/lobby.css','/src/main.js','/vendor/three.module.js','/assets/avatars/client/client.glb','/assets/audio/arrival-welcome-en.wav']){const r=await fetch(base+path,{method:'HEAD'});assert.equal(r.status,200,path);console.log('PASS asset '+path);}
 const voice=await fetch(base+'/voice/speak',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:narrationFor('Pasillo','en').text,language:'en'})});assert.equal(voice.status,200);assert.match(voice.headers.get('content-type'),/audio/);assert.ok((await voice.arrayBuffer()).byteLength>44);console.log('PASS prerecorded voice');
 assert.match((await join('early-client','client')).event,/host-required/);
 const host=await join('host-smoke','presenter');assert.match(host.event,/peers/);
 const client=await join('client-smoke','client'),brian=await join('brian-smoke','collaborator');assert.match(client.event,/awaiting-admission/);assert.match(brian.event,/awaiting-admission/);
 assert.equal((await presence()).length,1);assert.equal((await post('client-smoke',{type:'state',payload:{role:'client'}})).status,403);
 for(const id of ['client-smoke','brian-smoke'])assert.equal((await post('host-smoke',{type:'admit',to:id})).status,204);
 assert.equal((await presence()).length,3);console.log('PASS host-first admission for both guests');
 assert.equal((await post('host-smoke',{type:'state',payload:{role:'presenter',x:12.345,z:0}})).status,204);
 let received='';for(let i=0;i<12&&!received.includes('12.345');i++){const chunk=await client.reader.read();if(chunk.done)break;received+=new TextDecoder().decode(chunk.value);}assert.match(received,/12.345/);console.log('PASS cross-session pose streaming');
 host.controller.abort();let participants=[];for(let i=0;i<16;i++){participants=await presence();if(!participants.length)break;await new Promise(r=>setTimeout(r,250));}assert.equal(participants.length,0);console.log('PASS disconnect cleanup');
}finally{controllers.forEach(c=>c.abort());clearTimeout(timeout);}
