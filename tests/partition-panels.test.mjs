import test from 'node:test';import assert from 'node:assert/strict';
import {partition} from '../src/office-layout.js';
import {partitionProfile as profile,partitionSpans} from '../src/partition-panels.js';

test('long partition panels butt against the column and end post without overlapping caps',()=>{
 const spans=partitionSpans(partition);assert.equal(spans.length,1);
 assert.ok(Math.abs(spans[0].z1-(partition.z1+profile.endPostDepth/2))<1e-9);
 assert.ok(Math.abs(spans[0].z2-(profile.columnZ-profile.columnSize/2))<1e-9);
 assert.ok(spans[0].length>10,'keep the full meeting-office partition');
 for(const span of spans){assert.ok(span.z2<=profile.columnZ-profile.columnSize/2||span.z1>=profile.columnZ+profile.columnSize/2);}
});
test('metal rail clears both frame faces and glazing stops at the header',()=>{
 assert.ok((profile.railWidth-profile.frameWidth)/2>=.0149,'neither side may share the frame plane');
 assert.ok(Math.abs(profile.glassTop-(2.575-.55/2))<1e-9);
 assert.equal(profile.glassBottom,.66);
});
