import test from 'node:test';import assert from 'node:assert/strict';
import worker,{VisitRoom} from '../cloudflare/worker.mjs';
import {narrationFor} from '../src/tour-voice.js';
test('cloud HTTPS rooms preserve admission, signals and disconnect cleanup',{timeout:5000},async()=>{
 const room=new VisitRoom(),controllers=[],base='https://office.example';
 const request=(path,options={})=>room.fetch(new Request(base+path,options));
 async function join(id,role){const c=new AbortController();controllers.push(c);const response=await request('/session/events?id='+id+'&room=one&joined=1&role='+role,{signal:c.signal});const reader=response.body.getReader();return {c,reader,event:new TextDecoder().decode((await reader.read()).value)};}
 const post=(id,data,origin=base)=>request('/session/message?id='+id+'&room=one',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(data)});
 const presence=async()=> (await (await request('/session/presence?id=lobby-test&room=one')).json()).participants;
 try{
  assert.match((await join('client-early','client')).event,/host-required/);
  await join('host-one','presenter');const client=await join('client-one','client');assert.match(client.event,/awaiting-admission/);
  assert.equal((await presence()).length,1);assert.equal((await post('client-one',{type:'state',payload:{role:'client'}})).status,403);
  assert.equal((await post('host-one',{type:'admit',to:'client-one'})).status,204);
  assert.equal((await presence()).length,2);assert.equal((await post('host-one',{type:'state',payload:{role:'presenter',seat:{id:'chair-3',weight:1}}})).status,204);
  assert.equal((await post('host-one',{type:'state',payload:{role:'presenter'}},'https://other.example')).status,403);
  client.c.abort();assert.equal((await presence()).length,1);
 }finally{controllers.forEach(c=>c.abort());}
});
test('worker isolates room bindings and serves only generated narration',async()=>{
 const rooms=new Map(),requests=[];const env={ROOMS:{idFromName:n=>n,get(name){if(!rooms.has(name))rooms.set(name,new VisitRoom());return rooms.get(name);}},ASSETS:{fetch:r=>{requests.push(r.url);return new Response('RIFF',{headers:{'Content-Type':'audio/wav'}});}}};
 const base='https://office.example',presence=room=>worker.fetch(new Request(base+'/session/presence?id=lobby-test&room='+room),env);
 assert.equal((await presence('one')).status,200);assert.equal((await presence('two')).status,200);assert.equal(rooms.size,2);
 const voice=await worker.fetch(new Request(base+'/voice/speak',{method:'POST',body:JSON.stringify({language:'en',text:narrationFor('Sala ','en').text})}),env);assert.equal(voice.status,200);assert.match(requests[0],/tour-en-meeting.wav$/);
 assert.equal((await worker.fetch(new Request(base+'/voice/speak',{method:'POST',body:'{"language":"en","text":"arbitrary synthesis"}'}),env)).status,404);
 assert.equal((await worker.fetch(new Request(base+'/session/presence?id=lobby-test&room=one',{headers:{origin:'https://evil.example'}}),env)).status,403);
});
