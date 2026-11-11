import test from 'node:test';import assert from 'node:assert/strict';import {createRemoteMotion} from '../src/remote-motion.js';
test('remote avatars interpolate between delayed snapshots instead of jumping on receipt',()=>{
 const motion=createRemoteMotion({delay:100});motion.push('p',{x:0,z:0,speed:1,heading:3.1},0);motion.push('p',{x:1,z:0,speed:1,heading:-3.1,door:{open:true}},100);
 const mid=motion.sample('p',150);assert.equal(mid.x,.5);assert.ok(Math.abs(mid.heading-Math.PI)<.01);assert.equal(mid.door.open,true);
 assert.equal(motion.sample('p',300).x,1);assert.equal(motion.sample('p',5000).x,1,'never extrapolate through a wall when packets stop');
});
test('teleports, invalid data and disconnects do not leave an interpolated ghost',()=>{
 const m=createRemoteMotion();m.push('p',{x:0,z:0},0);m.push('p',{x:20,z:0},100);assert.equal(m.sample('p',150).x,20);m.push('p',{x:NaN,z:0},200);assert.equal(m.sample('p',200),null);m.push('p',{x:1,z:0},300);m.remove('p');assert.equal(m.sample('p',400),null);
});
test('late or duplicate network snapshots cannot move a participant backwards',()=>{
 const m=createRemoteMotion({delay:0});m.push('p',{x:0,z:0,sequence:1},0);m.push('p',{x:1,z:0,sequence:3},100);m.push('p',{x:.5,z:0,sequence:2},120);m.push('p',{x:.7,z:0,sequence:3},130);assert.equal(m.sample('p',200).x,1);
});
