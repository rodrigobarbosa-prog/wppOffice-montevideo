import test from 'node:test';import assert from 'node:assert/strict';
import {clientEntryState,clientVisitUrl,participantReturnUrl} from '../src/client-entry-model.js';
import {presenterWaitState} from '../src/presenter-wait.js';
test('invited visitor can only enter as client and returns to the invitation',()=>{
 const url=new URL(clientVisitUrl('https://office.example','wpp-team','Ana'));
 assert.equal(url.searchParams.get('modo'),'client');assert.equal(url.searchParams.get('joined'),'1');assert.equal(url.searchParams.get('name'),'Ana');
 const back=new URL(participantReturnUrl(url.origin,'wpp-team','client'));assert.equal(back.searchParams.get('join'),'client');assert.equal(back.searchParams.get('room'),'wpp-team');
 assert.equal(new URL(participantReturnUrl(url.origin,'wpp-team','presenter')).searchParams.has('join'),false);
});
test('a client request waits without role selection until the host and client slot are ready',()=>{
 const base={room:'team',connected:true,requested:true};
 assert.equal(clientEntryState({...base,participants:[]}).ready,false);
 assert.equal(clientEntryState({...base,participants:[{role:'presenter'}]}).ready,true);
 assert.equal(clientEntryState({...base,participants:[{role:'presenter'},{role:'client'}]}).ready,false);
 assert.equal(clientEntryState({...base,connected:false,participants:[{role:'presenter'}]}).ready,false);
 assert.equal(clientEntryState({...base,requested:false,participants:[{role:'presenter'}]}).ready,false);
 assert.equal(clientEntryState({...base,room:'../wrong'}).disabled,true);
});
test('presenter can walk immediately with no client and during the elevator intro',()=>{
 for(const client of [null,{arriving:true},{arriving:false}])assert.equal(presenterWaitState({role:'presenter',connected:true,client}).lockMovement,false);
 assert.equal(presenterWaitState({role:'presenter',connected:true,client:null}).waiting,true);
 for(const client of [{screenVisit:'approaching'},{screenVisit:'viewing'},{seat:{id:'chair'}}])assert.equal(presenterWaitState({role:'presenter',connected:true,client}).lockMovement,true);
 assert.equal(presenterWaitState({role:'client',connected:true,client:{screenVisit:'viewing'}}).lockMovement,false);
});
