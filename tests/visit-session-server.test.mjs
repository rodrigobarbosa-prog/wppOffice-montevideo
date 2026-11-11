import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createSessionServer} from '../session-server.mjs';

test('session signaling stays inside its room and rejects cross-origin requests',{timeout:5000},async()=>{
 const handle=createSessionServer(),server=http.createServer((req,res)=>handle(req,res,new URL(req.url,'http://localhost')));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const controllers=[],readers=[];
 try{
  for(const [id,room] of [['client-test','one'],['presenter-test','one'],['outsider-test','two']]){
   const controller=new AbortController();controllers.push(controller);
   const response=await fetch(base+'/session/events?id='+id+'&room='+room,{signal:controller.signal});
   assert.equal(response.status,200);const reader=response.body.getReader();readers.push(reader);await reader.read();
  }
  await readers[0].read(); // Join event for presenter.
  const response=await fetch(base+'/session/message?id=client-test&room=one',{method:'POST',body:JSON.stringify({type:'state',payload:{role:'client',x:2,z:3}})});
  assert.equal(response.status,204);
  const event=new TextDecoder().decode((await readers[1].read()).value);assert.match(event,/"x":2/);assert.match(event,/client-test/);
  const rejected=await fetch(base+'/session/message?id=client-test&room=one',{method:'POST',headers:{Origin:'https://unrelated.example'},body:'{}'});assert.equal(rejected.status,403);
 }finally{controllers.forEach(c=>c.abort());readers.forEach(r=>r.cancel().catch(()=>{}));server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('lobby reports live roles, rejects duplicate Brian and releases the role on disconnect',{timeout:5000},async()=>{
 const handle=createSessionServer(),server=http.createServer((req,res)=>handle(req,res,new URL(req.url,'http://localhost')));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const controllers=[];
 async function join(id,role,name){const controller=new AbortController();controllers.push(controller);const response=await fetch(base+'/session/events?id='+id+'&room=team&joined=1&role='+role+'&name='+encodeURIComponent(name),{signal:controller.signal});const reader=response.body.getReader();return {controller,reader,event:new TextDecoder().decode((await reader.read()).value)};}
 async function presence(room='team'){return (await (await fetch(base+'/session/presence?id=lobby-test&room='+room)).json()).participants;}
 try{
  assert.match((await join('early-guest','client','Early')).event,/host-required/);
  await join('host-one','presenter','Host');
  const brian=await join('brian-one','collaborator','Brian');
  const duplicate=await join('brian-two','collaborator','Other Brian');assert.match(duplicate.event,/role-busy/);
  assert.match(brian.event,/awaiting-admission/);
  const denied=await fetch(base+'/session/message?id=brian-one&room=team',{method:'POST',body:JSON.stringify({type:'state',payload:{role:'collaborator'}})});assert.equal(denied.status,403);
  await join('client-one','client','Ana');
  assert.deepEqual((await presence()).map(p=>p.role),['presenter']);
  for(const guest of ['brian-one','client-one'])assert.equal((await fetch(base+'/session/message?id=host-one&room=team',{method:'POST',body:JSON.stringify({type:'admit',to:guest})})).status,204);
  assert.deepEqual((await presence()).map(p=>p.role).sort(),['client','collaborator','presenter']);assert.equal((await presence('different')).length,0);
  const rejected=await fetch(base+'/session/message?id=brian-one&room=team',{method:'POST',body:JSON.stringify({type:'state',payload:{role:'client'}})});assert.equal(rejected.status,403);
  await fetch(base+'/session/message?id=brian-one&room=team',{method:'POST',body:JSON.stringify({type:'state',payload:{role:'collaborator',sharing:true,mic:true,name:'Forged'}})});
  const person=(await presence()).find(p=>p.role==='collaborator');assert.equal(person.name,'Brian');assert.equal(person.sharing,true);assert.equal(person.mic,true);
  brian.controller.abort();let members=[];for(let i=0;i<30;i++){members=await presence();if(!members.some(p=>p.role==='collaborator'))break;}
  assert.equal(members.some(p=>p.role==='collaborator'),false);
 }finally{controllers.forEach(c=>c.abort());server.closeAllConnections();await new Promise(r=>server.close(r));}
});
