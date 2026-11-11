import test from 'node:test';import assert from 'node:assert/strict';
import {createCameraLook} from '../src/camera-look.js';

test('drag rotation arrives smoothly without overshoot or a long inertial tail',()=>{
 const look=createCameraLook();look.input(100,20);let yaw=0,pitch=0;
 for(let i=0;i<30;i++){
  const next=look.update(yaw,pitch,1/60);assert.ok(next.yaw<=yaw&&next.yaw>=-.22);assert.ok(next.pitch<=pitch&&next.pitch>=-.044);
  if(i===0){assert.ok(Math.abs(next.yaw)<.06);assert.ok(Math.abs(next.yaw)>.02);}
  if(i===10)assert.ok(Math.abs(next.yaw+.22)<.009,'95% of input settles within roughly 180 ms');
  yaw=next.yaw;pitch=next.pitch;
 }
 assert.ok(Math.abs(yaw+.22)<.0001);
});
test('small mouse movements have the same response at 30, 60 and 144 Hz',()=>{
 const results=[30,60,144].map(fps=>{const look=createCameraLook();look.input(60,20);let pose={yaw:0,pitch:0};for(let i=0;i<fps/2;i++)pose=look.update(pose.yaw,pose.pitch,1/fps);return pose;});
 for(const pose of results){assert.ok(Math.abs(pose.yaw-results[0].yaw)<1e-5);assert.ok(Math.abs(pose.pitch-results[0].pitch)<1e-5);}
});
test('outlier input is speed limited and focus loss cancels pending motion',()=>{
 const look=createCameraLook();look.input(10000,-10000);const first=look.update(0,0,1/60);
 assert.ok(Math.abs(first.yaw)<=3.2/60);assert.ok(Math.abs(first.pitch)<=2.4/60+1e-9);
 look.reset();assert.deepEqual(look.update(first.yaw,first.pitch,1/60),{yaw:first.yaw,pitch:first.pitch,changed:false});
 look.input(80,0);assert.equal(look.update(1,0,2).yaw,1);assert.equal(look.update(1,0,1/60).changed,false);
});
test('pitch stops at the limit without storing a delayed reversal; scripts can reposition the view',()=>{
 const look=createCameraLook();look.input(0,-1000);let pose=look.update(2,1.34,.1);assert.equal(pose.pitch,1.35);
 assert.equal(look.update(pose.yaw,pose.pitch,.1).changed,false);
 look.input(0,20);assert.ok(look.update(-Math.PI,1.35,1/60).pitch<1.35);
 look.reset();assert.equal(look.update(-Math.PI,0,1/60).yaw,-Math.PI);
});
test('touch input is smooth, and invalid pointer deltas cannot corrupt the camera',()=>{
 const look=createCameraLook();look.input(50,0,'touch');let pose={yaw:0,pitch:0};for(let i=0;i<60;i++)pose=look.update(pose.yaw,pose.pitch,1/60);
 assert.ok(Math.abs(pose.yaw+.13)<.0001);look.input(NaN,20);look.input(20,Infinity);assert.ok(Number.isFinite(look.update(pose.yaw,pose.pitch,1/60).yaw));
});
