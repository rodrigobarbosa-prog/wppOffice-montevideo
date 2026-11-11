import test from 'node:test';
import assert from 'node:assert/strict';
import {inviteUrl,visitUrl,validRoom} from '../src/lobby-model.js';

test('each invitation enters its own role in the same room without switching the other participants',()=>{
 for(const role of ['client','collaborator','presenter']){
  const invite=new URL(inviteUrl('http://localhost:4180','wpp-team',role));
  assert.equal(invite.pathname,'/');assert.equal(invite.searchParams.get('room'),'wpp-team');assert.equal(invite.searchParams.get('join'),role);
  const visit=new URL(visitUrl(invite.origin,'wpp-team',role,'  Ana & Equipo  '));
  assert.equal(visit.pathname,'/assets/visit.html');assert.equal(visit.searchParams.get('modo'),role);assert.equal(visit.searchParams.get('name'),'Ana & Equipo');assert.equal(visit.searchParams.get('joined'),'1');
 }
 assert.equal(validRoom('../other'),false);assert.equal(validRoom('room with spaces'),false);assert.throws(()=>inviteUrl('http://localhost','room','admin'));
});
