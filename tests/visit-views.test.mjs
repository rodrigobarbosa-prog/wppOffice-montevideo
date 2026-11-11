import test from 'node:test';
import assert from 'node:assert/strict';
import {avatarVisibility,findCollaboratorView} from '../src/visit-views.js';

test('each first-person view hides its own body and collaborator sees both people',()=>{
 assert.deepEqual(avatarVisibility('client'),{client:false,presenter:true});
 assert.deepEqual(avatarVisibility('presenter'),{client:true,presenter:false});
 assert.deepEqual(avatarVisibility('collaborator'),{client:true,presenter:true});
});
test('collaborator keeps clear of both people and cannot see through a blocking wall',()=>{
 const client={x:0,z:0},presenter={x:0,z:2.2};
 const blocked=(x,z)=>x>.5;
 const view=findCollaboratorView(client,presenter,blocked);
 assert.ok(view&&view.x<0);
 for(const person of [client,presenter]){
  assert.ok(Math.hypot(view.x-person.x,view.z-person.z)>.85);
  for(let i=0;i<=30;i++)assert.equal(blocked(view.x+(person.x-view.x)*i/30,view.z+(person.z-view.z)*i/30),false);
 }
 assert.equal(findCollaboratorView(client,presenter,()=>true),null);
});
