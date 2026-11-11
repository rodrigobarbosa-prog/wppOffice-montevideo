import test from 'node:test';import assert from 'node:assert/strict';import {createPoseRate} from '../src/pose-rate.js';
test('movement sends at most 10 poses per second, idle keeps only a sparse heartbeat',()=>{
 const rate=createPoseRate();assert.equal(rate.shouldSend(0,{x:0,z:0}),true);assert.equal(rate.shouldSend(10,{x:1,z:0}),false);assert.equal(rate.shouldSend(100,{x:1,z:0}),true);assert.equal(rate.shouldSend(200,{x:1,z:0}),false);assert.equal(rate.shouldSend(2100,{x:1,z:0}),true);
});
test('sub-millimetre numerical drift does not spam poses but gestures and doors still publish',()=>{
 const r=createPoseRate();r.shouldSend(0,{x:1,z:0,gesture:'idle'});assert.equal(r.shouldSend(100,{x:1.000001,z:0,gesture:'idle'}),false);assert.equal(r.shouldSend(200,{x:1,z:0,gesture:'attention'}),true);assert.equal(r.shouldSend(300,{x:1,z:0,gesture:'attention',door:{open:true}}),true);
});
