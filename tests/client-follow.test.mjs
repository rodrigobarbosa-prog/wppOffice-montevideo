import test from 'node:test';
import assert from 'node:assert/strict';
import {createClientFollower} from '../src/client-follow.js';

test('client follows a walking presenter at a human distance and navigates around a wall',()=>{
 const follow=createClientFollower(),client={x:0,z:0},host={x:5,z:0};
 const blocked=(x,z)=>x>1.5&&x<2.5&&Math.abs(z)<1.1;
 let walking=false,detoured=false;
 for(let i=0;i<500;i++){
  const pose=follow.update(.04,client,host,blocked);assert.equal(blocked(pose.x,pose.z),false);
  walking||=pose.speed>.1;detoured||=Math.abs(pose.z)>1.1;Object.assign(client,{x:pose.x,z:pose.z});
 }
 assert.ok(walking&&detoured);assert.ok(Math.hypot(host.x-client.x,host.z-client.z)>1.6);assert.ok(Math.hypot(host.x-client.x,host.z-client.z)<2.2);
});
test('a closed door stops the follower and opening it allows movement without teleporting',()=>{
 const follow=createClientFollower(),client={x:0,z:0},host={x:5,z:0};let closed=true;
 const blocked=(x,z)=>Math.abs(z)>1||closed&&x>1&&x<2;
 for(let i=0;i<40;i++){const pose=follow.update(.05,client,host,blocked);assert.ok(pose.x<=1);Object.assign(client,pose);}
 closed=false;let moved=false;
 for(let i=0;i<120;i++){const pose=follow.update(.05,client,host,blocked);assert.ok(Math.hypot(pose.x-client.x,pose.z-client.z)<.084);moved||=pose.speed>0;Object.assign(client,pose);}
 assert.ok(moved&&client.x>2.8);
});
