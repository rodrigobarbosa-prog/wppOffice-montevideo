import test from 'node:test';
import assert from 'node:assert/strict';
import {arrival,entryBrandWall,entryVestibule} from '../src/arrival-layout.js';
import {officeShiftZ,passageDesks,officeDesks,aisleEndDesk} from '../src/office-layout.js';
import {entryDoorPlan,doorPanels} from '../src/entry-door-state.js';
import {ceilingPlan} from '../src/ceiling-layout.js';

test('hall has facing lift banks, both end doors and full-height mirror bays',()=>{
 assert.ok(arrival.lifts.some(l=>l.side==='near')&&arrival.lifts.some(l=>l.side==='far'));
 assert.ok(arrival.lifts.some(l=>l.id==='C14'&&l.x===0));
 assert.deepEqual(arrival.endDoors.map(d=>Math.sign(d.x)),[-1,1]);
 for(const m of arrival.mirrors){
  assert.ok(m.x-m.width/2>=arrival.x1&&m.x+m.width/2<=arrival.x2);
  for(const l of arrival.lifts.filter(l=>l.side===m.side))assert.ok(Math.abs(m.x-l.x)>(m.width+2.35)/2);
 }
});

test('new fixtures leave the office entry and cross aisle clear',()=>{
 for(const bay of [...arrival.lifts.map(l=>({...l,width:2.35})),...arrival.woodDoors,...arrival.mirrors]){
  if(bay.side==='near')assert.ok(bay.x+bay.width/2+.08<5.8||bay.x-bay.width/2>8.1);
 }
 const b=entryBrandWall;
 assert.equal(b.origin.x,8.2);assert.equal(b.rotation,Math.PI/2);
 assert.ok(b.x2<b.pierX);
 // Both pieces face the cross aisle, with their backs against the missing return.
 for(const piece of [b.cabinet,b.printer]){
  assert.equal(piece.rotation,-Math.PI/2);
  assert.ok(piece.x-piece.depth/2>b.x2+.07);
  assert.ok(piece.z-piece.width/2>0);
  assert.ok(piece.z+piece.width/2<b.returnDepth);
 }
 assert.ok(b.cabinet.z+b.cabinet.width/2<b.printer.z-b.printer.width/2);
});

test('hall ceiling uses rectangular tiles and paired rows of downlights',()=>{
 const plan=ceilingPlan({x1:arrival.x1,x2:arrival.x2,z1:0,z2:2.6,hall:true});
 const cross=plan.rails.filter(r=>r.x1===r.x2).map(r=>r.x1);
 for(let i=1;i<cross.length;i++)assert.ok(Math.abs(cross[i]-cross[i-1]-1.2)<1e-9);
 assert.equal(new Set(plan.fixtures.map(f=>f.z.toFixed(2))).size,2);
 for(const f of plan.fixtures)assert.ok(f.z-f.depth/2>0&&f.z+f.depth/2<2.6);
});

test('long corridor meets the inner entry return and keeps the inward leaf clear',()=>{
 assert.equal(officeShiftZ,entryVestibule.z1);
 assert.ok(entryVestibule.x+entryVestibule.thickness/2<entryDoorPlan.x-entryDoorPlan.halfSpan-.10);
 const leaf=doorPanels(entryDoorPlan.openAngle)[0];
 const tipZ=leaf.z-Math.sin(leaf.angle)*leaf.width;
 assert.ok(tipZ>entryVestibule.fireZ+.3);
 for(const row of [...passageDesks,...officeDesks,aisleEndDesk]){
  const nearEnd=row.z+row.length/2+officeShiftZ;
  assert.ok(officeShiftZ-nearEnd>2,'cross aisle retains space beyond the connected wall');
 }
});
