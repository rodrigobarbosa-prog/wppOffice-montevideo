import test from 'node:test';import assert from 'node:assert/strict';import {segmentOccluded} from '../src/visibility-segment.js';
test('thin walls occlude avatar and seat actions, including parallel and reverse rays',()=>{
 const wall={x1:-1,x2:1,z1:2,z2:2.01,bottom:0,top:3};
 assert.equal(segmentOccluded({x:0,y:1.6,z:0},{x:0,y:1.4,z:4},[wall]),true);assert.equal(segmentOccluded({x:0,y:1.4,z:4},{x:0,y:1.6,z:0},[wall]),true);
 assert.equal(segmentOccluded({x:2,y:1.6,z:0},{x:2,y:1.4,z:4},[wall]),false);assert.equal(segmentOccluded({x:0,y:4,z:0},{x:0,y:4,z:4},[wall]),false);
 assert.equal(segmentOccluded({x:0,y:1,z:0},{x:1,y:1,z:0},[{...wall,seatId:'seat'}],'seat'),false);
});
