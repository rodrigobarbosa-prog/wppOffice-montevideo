import test from 'node:test';
import assert from 'node:assert/strict';
import {avatarActions,thirdPersonPosition} from '../src/avatar-interactions.js';
test('avatar actions belong to the selected person and never target yourself',()=>{
 assert.deepEqual(avatarActions('collaborator','client'),['screen','attention']);
 assert.deepEqual(avatarActions('presenter','client'),['attention']);
 assert.deepEqual(avatarActions('client','presenter'),['attention']);
 assert.deepEqual(avatarActions('client','client'),[]);
 assert.deepEqual(avatarActions('missing','client'),[]);
});
test('third person camera follows the same body and stops before a wall',()=>{
 const actor={x:2,z:3},before={...actor};
 const free=thirdPersonPosition(actor,0,()=>false);
 assert.equal(free.x,2);assert.ok(free.z>5.5);assert.deepEqual(actor,before);
 const wall=thirdPersonPosition(actor,0,(x,z)=>z>4);
 assert.ok(wall.z<=4);assert.ok(wall.z>3);
 const rotated=thirdPersonPosition(actor,Math.PI/2,()=>false);
 assert.ok(rotated.x>4.5);assert.equal(rotated.z,3);
});
