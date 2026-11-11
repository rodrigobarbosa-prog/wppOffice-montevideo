import test from 'node:test';
import assert from 'node:assert/strict';
import {meetingRooms,passageDesks} from '../src/office-layout.js';
import {entryBrandWall} from '../src/arrival-layout.js';

test('room 01 glass is recessed behind the perpendicular storage return',()=>{
 const [entry,far]=meetingRooms;
 assert.deepEqual(meetingRooms.map(r=>r.id),['01','02']);
 assert.notEqual(entry.frontAxis,'x');assert.equal(entry.x1,entryBrandWall.origin.x+entryBrandWall.returnDepth);
 assert.equal(entry.z2,-entryBrandWall.x2);
 assert.ok(entry.doorZ < (entry.z1+entry.z2)/2);
 assert.equal(entryBrandWall.rotation,Math.PI/2);
 assert.equal(far.x2,15);assert.equal(far.z1,-13.6);
 assert.equal(far.x1,entry.x1);assert.equal(far.z2,entry.z1);
 assert.ok(far.z2-far.z1>4);
});
test('meeting room doors leave a human-width opening within each glass front',()=>{
 const radius=.24;
 for(const r of meetingRooms){
  if(r.frontAxis==='x'){
   assert.ok(r.doorX-r.doorWidth/2>r.x1+.06);
   assert.ok(r.doorX+r.doorWidth/2<r.x2-.06);
   assert.equal(r.doorZ,r.z1);
  }else{
   assert.ok(r.doorZ-r.doorWidth/2>r.z1+.06);
   assert.ok(r.doorZ+r.doorWidth/2<r.z2-.06);
  }
  assert.ok(r.doorWidth/2-.07>radius);
 }
});
test('tables and occupied chairs fit the corrected room orientations',()=>{
 for(const r of meetingRooms){
  const cx=r.tableX??(r.x1+r.x2)/2,cz=(r.z1+r.z2)/2;
  if(r.frontAxis==='x'){
   assert.ok(cx-r.tableLength/2-.55-.27>r.x1+.06);
   assert.ok(cx+r.tableLength/2+.55+.27<r.x2-.06);
   assert.ok(cz-.90-.27>r.z1+.06&&cz+.90+.27<r.z2-.06);
  }else{
   assert.ok(cz-r.tableLength/2-.55-.27>r.z1+.06);
   assert.ok(cz+r.tableLength/2+.55+.27<r.z2-.06);
   assert.ok(cx-.98-.27>r.x1+.5);
   assert.ok(cx+.98+.27<r.x2-.5);
  }
 }
 assert.ok(passageDesks.every(row=>row.x<6));
});

