import test from 'node:test';import assert from 'node:assert/strict';
import {createFollowSeating} from '../src/follow-seating.js';
import {createSeatMotion} from '../src/seating.js';
const seats=[{id:'host',x:0,z:0,yaw:0},{id:'occupied',x:1,z:0,yaw:0},{id:'free',x:2,z:0,yaw:0}];
test('following client walks to a free nearby chair, sits and stands to resume following',()=>{
 const motion=createSeatMotion({blocked:()=>false}),follow=createFollowSeating({seats,motion,blocked:()=>false,occupied:id=>id==='occupied'||id==='host'});
 let client={x:4,z:2};const presenter={x:0,z:0};
 for(let i=0;i<120;i++){
  const previous={...client},pose=follow.update(.1,{enabled:true,presenter,client,presenterSeat:'host'});
  if(pose)client={x:pose.x,z:pose.z};assert.ok(Math.hypot(client.x-previous.x,client.z-previous.z)<.18);
  if(motion.active){const seat=motion.update(.1);client={x:seat.x,z:seat.z};}
 }
 assert.equal(motion.state.phase,'seated');assert.equal(motion.state.seat.id,'free');
 for(let i=0;i<30;i++){follow.update(.1,{enabled:true,presenter,client,presenterSeat:null});if(motion.active)motion.update(.1);}
 assert.equal(motion.active,false);assert.equal(follow.active,false);
});
test('exploration never seats the client and manually chosen chairs are not released',()=>{
 const motion=createSeatMotion({blocked:()=>false}),follow=createFollowSeating({seats,motion,blocked:()=>false,occupied:()=>false});
 follow.update(.1,{enabled:false,presenter:seats[0],client:{x:2,z:1},presenterSeat:'host'});assert.equal(motion.active,false);
 motion.occupy(seats[2]);follow.update(.1,{enabled:false,presenter:seats[0],client:seats[2],presenterSeat:null});assert.equal(motion.state.phase,'seated');
});
test('no free reachable chair leaves the client waiting without teleporting',()=>{
 const motion=createSeatMotion({blocked:()=>true}),follow=createFollowSeating({seats,motion,blocked:()=>true,occupied:()=>false}),client={x:4,z:2};
 const pose=follow.update(.1,{enabled:true,presenter:seats[0],client,presenterSeat:'host'});assert.equal(pose.speed,0);assert.equal(pose.x,4);assert.equal(motion.active,false);
});
