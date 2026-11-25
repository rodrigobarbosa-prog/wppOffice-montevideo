import test from 'node:test';
import assert from 'node:assert/strict';
import {createMotionLook} from '../src/motion-look.js';
import {createCameraLook} from '../src/camera-look.js';

function settle(look,pose){
 for(let i=0;i<100;i++)pose=look.update(pose.yaw,pose.pitch,1/60,true);
 return pose;
}

test('motion look anchors to the current view and adds physical turns and tilts',()=>{
 const look=createMotionLook();
 assert.equal(look.input({alpha:359,beta:90,gamma:0}),true);
 const first=look.update(.8,-.2,1/60,true);
 assert.deepEqual(first,{yaw:.8,pitch:-.2,active:true,changed:false});
 look.input({alpha:1,beta:105,gamma:0});
 const pose=settle(look,first);
 assert.ok(Math.abs(pose.yaw-.8-2*Math.PI/180)<.001);
 assert.ok(Math.abs(pose.pitch+.2-15*Math.PI/180)<.001);
});

test('rotating the phone around the screen normal keeps the view steady',()=>{
 const look=createMotionLook();
 look.input({alpha:0,beta:90,gamma:0});
 const start=look.update(0,0,1/60,true);
 look.input({alpha:270,beta:0,gamma:90});
 const after=settle(look,start);
 assert.ok(Math.abs(after.yaw)<.001&&Math.abs(after.pitch)<.001);
});

test('pausing motion reanchors, invalid events are ignored, and phone held flat never flips the view',()=>{
 const look=createMotionLook();
 assert.equal(look.input({alpha:null,beta:90,gamma:0}),false);
 assert.equal(look.update(2,0,1/60,true).active,false);
 look.input({alpha:0,beta:90,gamma:0});look.update(2,0,1/60,true);
 look.update(2,0,1/60,false);
 look.input({alpha:180,beta:90,gamma:0});assert.equal(look.update(2,0,1/60,true).yaw,2);
 look.input({alpha:0,beta:0,gamma:0});assert.equal(look.update(2,0,1/60,true).yaw,2);
 look.input({alpha:0,beta:90,gamma:0});assert.equal(look.update(2,0,1/60,true).yaw,2);
});

test('touch owns the view through the drag and sensor movement resumes from the released angle',()=>{
 const motion=createMotionLook(),touch=createCameraLook(),dt=1/60;
 motion.input({alpha:0,beta:90,gamma:0});motion.update(0,0,dt,true);
 motion.rebase();
 touch.input(100,-30,'touch');
 assert.equal(touch.settling,true);
 let pose={yaw:0,pitch:0};
 for(let i=0;i<70&&touch.settling;i++){
  pose=touch.update(pose.yaw,pose.pitch,dt);
  motion.input({alpha:i*2,beta:100,gamma:0});
  assert.equal(motion.update(pose.yaw,pose.pitch,dt,false).changed,false);
 }
 assert.equal(touch.settling,false);
 assert.ok(pose.yaw<-.25&&pose.pitch>.07);
 const resumed=motion.update(pose.yaw,pose.pitch,dt,true);
 assert.equal(resumed.changed,false);
 motion.input({alpha:45,beta:110,gamma:0});
 assert.equal(motion.update(resumed.yaw,resumed.pitch,dt,true).changed,true);
});
