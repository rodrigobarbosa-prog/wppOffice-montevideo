import test from 'node:test';import assert from 'node:assert/strict';import {createSeatMotion,seatStandPoint} from '../src/seating.js';
const seat={id:'chair-1',x:0,z:0,yaw:0};
test('each role can sit, reserve a chair, rise smoothly and release it without teleporting',()=>{
 for(const role of ['client','presenter','collaborator']){
  const motion=createSeatMotion({blocked:()=>false});assert.ok(motion.sit(seat,{x:.7,z:0}));let p;
  for(let i=0;i<16;i++){p=motion.update(.1);assert.ok(p.weight>=0&&p.weight<=1);}
  assert.equal(motion.state.phase,'seated');assert.equal(p.weight,1);assert.equal(p.id,seat.id);assert.equal(p.x,0);
  assert.ok(motion.stand());let previous=0;for(let i=0;i<14;i++){p=motion.update(.1);if(p){assert.ok(Math.abs(p.x-previous)<.2);previous=p.x;}}
  assert.equal(motion.active,false,role+' must release the chair');
 }
});
test('occupied chairs, unreachable chairs and blocked stand positions are rejected',()=>{
 assert.equal(createSeatMotion({blocked:()=>false,occupied:()=>true}).sit(seat,{x:.7,z:0}),false);
 assert.equal(createSeatMotion({blocked:()=>true}).sit(seat,{x:.7,z:0}),false);
 assert.equal(createSeatMotion({blocked:()=>false}).sit(seat,{x:4,z:0}),false);
 const motion=createSeatMotion({blocked:()=>true});motion.occupy(seat);assert.equal(motion.stand(),false);assert.equal(motion.state.phase,'seated');
 assert.equal(seatStandPoint(seat,seat,()=>true),null);
});
