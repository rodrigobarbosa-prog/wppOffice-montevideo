import test from 'node:test';
import assert from 'node:assert/strict';
import {fromGame,passageDesks,officeDesks,partition,exteriorDesk,aisleEndDesk,deskEndLimit,chairYawForSide,serviceWall,kitchen,perimeterDesk,kitchenWindowDesk,kitchenWindowBay,officeWest,cornerColumn} from '../src/office-layout.js';

test('one workstation fills the kitchen-side window up to the J&J wall',()=>{
 assert.equal(kitchenWindowDesk.seats,1);
 assert.ok(Math.abs(kitchenWindowDesk.z-kitchenWindowDesk.length/2-kitchenWindowBay.z1)<1e-9);
 assert.ok(Math.abs(kitchenWindowDesk.z+kitchenWindowDesk.length/2-(-.15))<1e-9);
 assert.ok(Math.abs(perimeterDesk.z+perimeterDesk.length/2-kitchenWindowBay.z1)<1e-9);
 assert.equal(kitchenWindowDesk.wallSide,perimeterDesk.wallSide);
});
test('game doorway coincides with the pilot doorway',()=>{
 const door=fromGame(28.9,10.18);assert.equal(door.x,7);assert.equal(door.z,0);
});

test('marked room-side block is absent and a double module fills the near-end gap',()=>{
 assert.ok(passageDesks.every(row=>row.x!==8.1));
 const row=passageDesks.find(row=>row.x===aisleEndDesk.x);
 assert.ok(row);
 // seats counts modules along the row; a non-single module renders both sides.
 assert.equal(aisleEndDesk.seats,1);assert.equal(aisleEndDesk.single,false);
 assert.equal(aisleEndDesk.rotation,row.rotation);
 assert.ok(Math.abs(aisleEndDesk.z-aisleEndDesk.length/2-(row.z+row.length/2))<1e-9);
 assert.ok(Math.abs(aisleEndDesk.z+aisleEndDesk.length/2-deskEndLimit)<1e-9);
 assert.ok(aisleEndDesk.length>1.3);
});
test('all long desks stop before the partition end, without projecting into the aisle',()=>{
 for(const row of [...passageDesks,...officeDesks]){
  assert.ok(row.z+row.length/2<=deskEndLimit+1e-9);
  assert.ok(row.z-row.length/2>=partition.z1);
 }
});
test('main office is compact while keeping room between occupied chairs',()=>{
 const ordered=officeDesks.toSorted((a,b)=>a.x-b.x);
 for(let i=1;i<ordered.length;i++){
  const gap=ordered[i].x-ordered[i-1].x;
  // 1.08 m from table centre to chair, plus 27 cm chair half-width, both sides.
  assert.ok(gap-2*(1.08+.27)>.5);
  assert.ok(gap<3.5);
 }
});
test('original desk rows are long north-south, parallel to the partition',()=>{
 assert.equal(passageDesks.length,3);assert.equal(officeDesks.length,4);
 for(const row of [...passageDesks,...officeDesks]){
  const projectedX=Math.abs(Math.cos(row.rotation)*row.length);
  const projectedZ=Math.abs(Math.sin(row.rotation)*row.length);
  assert.ok(projectedX<.001);assert.ok(projectedZ>row.seats*1.35);
 }
 assert.ok(officeDesks.every(row=>row.x+(row.wall?0:.75)<partition.x));
 assert.ok(passageDesks.every(row=>row.x-(row.wall?0:.75)>partition.x));
});
test('chairs on both sides face their monitors, including rotated and single-sided rows',()=>{
 for(const row of [...passageDesks,...officeDesks,exteriorDesk,perimeterDesk,aisleEndDesk]){
  for(const side of row.wall?[row.wallSide]:row.single?[1]:[-1,1]){
   const yaw=chairYawForSide(side)+row.rotation;
   const facing={x:Math.sin(yaw),z:Math.cos(yaw)};
   // Target is from chair to monitor, transformed by the actual desk rotation.
   const toward={x:-side*Math.sin(row.rotation),z:-side*Math.cos(row.rotation)};
   assert.ok(facing.x*toward.x+facing.z*toward.z>.99999);
  }
 }
});
test('both sides of the partition have matching flush single-sided runs',()=>{
 const west=officeDesks.find(row=>row.wall),east=passageDesks.find(row=>row.wall);
 assert.equal(west.wallSide,-1);assert.equal(east.wallSide,1);
 assert.ok(Math.abs(west.x+east.x-2*partition.x)<1e-8);
 assert.equal(west.z,east.z);assert.equal(west.length,east.length);
 const ordered=passageDesks.toSorted((a,b)=>a.x-b.x);
 for(let i=1;i<ordered.length;i++)assert.ok(ordered[i].x-ordered[i-1].x-2*(1.08+.27)>.5);
});
test('partition run is single sided and exterior desk keeps its different orientation',()=>{
 const wallRuns=officeDesks.filter(row=>row.wall);assert.equal(wallRuns.length,1);
 assert.ok(Math.abs(partition.x-wallRuns[0].x-.1)<1e-8);
 assert.equal(exteriorDesk.single,true);assert.equal(exteriorDesk.seats,1);assert.equal(exteriorDesk.rotation,0);
 assert.ok(exteriorDesk.x-exteriorDesk.length/2>officeWest);
 assert.ok(exteriorDesk.z<perimeterDesk.z-perimeterDesk.length/2);
});
test('partition and desk ends leave the entrance-side connecting aisle clear',()=>{
 const walkingZ=-1.05,radius=.24;
 assert.ok(partition.z2<walkingZ-radius);
 for(const row of [...passageDesks,...officeDesks])assert.ok(row.z+row.length/2<walkingZ-radius);
});
test('service door is close to the partition and the slogan faces both passages',()=>{
 assert.equal(serviceWall.mottoX,partition.x);
 assert.ok(partition.x-serviceWall.doorX<3.1);
 assert.ok(serviceWall.doorX+serviceWall.doorWidth/2<serviceWall.mottoX-serviceWall.mottoWidth/2);
 // The complete text clears the near partition column from each passage.
 for(const side of [-1,1])for(const textSide of [-1,1]){
  const cameraX=partition.x+side*1.7,cameraZ=-3.6;
  const targetX=serviceWall.mottoX+textSide*serviceWall.mottoWidth/2,targetZ=-.151;
  const columnFront=-2.4+.325;
  const t=(columnFront-cameraZ)/(targetZ-cameraZ),crossingX=cameraX+(targetX-cameraX)*t;
  assert.ok(side*(crossingX-partition.x)>.325);
 }
});
test('new window run is single sided and leaves the connecting aisle open',()=>{
 assert.equal(perimeterDesk.wall,true);assert.equal(perimeterDesk.wallSide,1);
 assert.equal(perimeterDesk.rotation,Math.PI/2);
 assert.ok(perimeterDesk.x>=officeWest&&perimeterDesk.x+.75<officeWest+1);
 const nearEnd=perimeterDesk.z+perimeterDesk.length/2;
 const lastChairZ=nearEnd-perimeterDesk.length/perimeterDesk.seats/2;
 // The added window-side station clears the cross-aisle in front of the chairs.
 assert.ok(lastChairZ+.27<-1.05-.24);
 assert.ok(perimeterDesk.z-perimeterDesk.length/2>-13.6+.7);
});
test('kitchen alcove has a walk-in opening beside the bar and clears the service door',()=>{
 assert.ok(kitchen.x2<serviceWall.doorX-serviceWall.doorWidth/2);
 assert.ok(kitchen.x2-kitchen.x1-2.2>1.1);
 assert.ok(kitchen.openingHeight>2.3&&kitchen.z2>2);
 assert.ok(kitchen.x1>officeWest&&kitchen.x2<-2);
});
test('corner desk and shortened window run clear the new structural column',()=>{
 const farEnd=perimeterDesk.z-perimeterDesk.length/2;
 assert.ok(farEnd>cornerColumn.z+cornerColumn.size/2+.5);
 assert.ok(exteriorDesk.z+.465<cornerColumn.z-cornerColumn.size/2);
 assert.ok(exteriorDesk.z-.465>-13.6);
 const nearChair=perimeterDesk.x+1.08,mainChair=officeDesks[0].x-1.08;
 assert.ok(mainChair-nearChair-.54>.5);
 assert.ok(kitchen.x1-officeWest<3.2);
});
