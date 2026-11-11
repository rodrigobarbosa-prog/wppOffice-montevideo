import test from 'node:test';
import assert from 'node:assert/strict';
import {avatarActions,avatarTargetBounds,thirdPersonPosition} from '../src/avatar-interactions.js';
import {Box3,Ray,Vector3} from '../vendor/three.module.js';
test('body target works standing and seated without triangle raycasts',()=>{const box=new Box3(),point=new Vector3(),person={position:new Vector3(0,0,3),userData:{seated:0}},ray=new Ray(new Vector3(0,1.6,0),new Vector3(0,0,1));assert.ok(ray.intersectBox(avatarTargetBounds(person,box),point));person.userData.seated=1;assert.equal(ray.intersectBox(avatarTargetBounds(person,box),point),null);ray.origin.y=1;assert.ok(ray.intersectBox(avatarTargetBounds(person,box),point));});
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
