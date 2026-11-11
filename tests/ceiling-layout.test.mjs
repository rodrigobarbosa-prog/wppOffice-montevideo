import test from 'node:test';
import assert from 'node:assert/strict';
import {ceilingPlan} from '../src/ceiling-layout.js';
import {partition,officeWest,cornerColumn,meetingColumn} from '../src/office-layout.js';

const obstacles=[{x1:partition.x-.075,x2:partition.x+.075,z1:partition.z1,z2:partition.z2},
 ...[[partition.x,-2.4],[3.3,-12.95],[meetingColumn.x,meetingColumn.z],[cornerColumn.x,cornerColumn.z]].map(([x,z])=>({x1:x-.335,x2:x+.335,z1:z-.335,z2:z+.335}))];
const bounds={x1:officeWest,x2:15,z1:-13.6,z2:0,obstacles};
const plan=ceilingPlan(bounds);
test('ceiling fixtures stay clear of the partition and full-height columns',()=>{
 assert.ok(plan.fixtures.length>20);
 for(const f of plan.fixtures)for(const b of obstacles){
  assert.ok(f.x+f.width/2<=b.x1||f.x-f.width/2>=b.x2||f.z+f.depth/2<=b.z1||f.z-f.depth/2>=b.z2);
 }
});
test('recessed office fixtures align with the ceiling module',()=>{
 const onGrid=value=>Math.abs(value-Math.round(value))<1e-8;
 for(const f of plan.fixtures){
  assert.ok(onGrid((f.x-.6-bounds.x1)/.6));
  assert.ok(onGrid((f.z-.3-bounds.z1)/.6));
  assert.ok(f.x-f.width/2>bounds.x1&&f.x+f.width/2<bounds.x2);
  assert.ok(f.z-f.depth/2>bounds.z1&&f.z+f.depth/2<bounds.z2);
 }
});
test('ceiling profiles stop before the coloured border instead of crossing it',()=>{
 for(const r of plan.rails)for(const b of obstacles){
  assert.ok(r.x2<=b.x1||r.x1>=b.x2||r.z2<=b.z1||r.z1>=b.z2);
 }
});
