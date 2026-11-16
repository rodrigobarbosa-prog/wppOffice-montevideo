import test from 'node:test';import assert from 'node:assert/strict';import {avatarStepBlocked} from '../src/avatar-collision.js';
test('overlapping people can escape but cannot push deeper into one another',()=>{
 const self={position:{x:0,z:0},visible:true},peer={position:{x:.1,z:0},visible:true},people=[self,peer];
 assert.equal(avatarStepBlocked(self.position,{x:-.03,z:0},people,self),false);
 assert.equal(avatarStepBlocked(self.position,{x:.03,z:0},people,self),true);
 assert.equal(avatarStepBlocked({x:-1,z:0},{x:-.4,z:0},people,self),true);
 peer.position.x=0;assert.equal(avatarStepBlocked(self.position,{x:.03,z:0},people,self),false);
});
