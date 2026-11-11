import test from 'node:test';
import assert from 'node:assert/strict';
import {entryDoorPlan,createEntryDoorState,doorPanels} from '../src/entry-door-state.js';

test('entrance loads closed and only the marked left leaf rotates',()=>{
 const door=createEntryDoorState();
 assert.equal(door.angle,0);assert.equal(door.targetOpen,false);
 assert.ok(door.blocked(6.43,0));assert.ok(door.blocked(7.6,0));
 door.toggle();for(let i=0;i<120;i++)door.update(1/60,{x:6.43,z:1.4,radius:.24});
 assert.ok(Math.abs(door.angle-entryDoorPlan.openAngle)<.001);
 assert.equal(doorPanels(door.angle)[1].angle,0);
 const leaf=doorPanels(door.angle)[0];
 assert.ok(leaf.z-Math.sin(leaf.angle)*leaf.width<-.9,'left leaf opens into the office, away from the hall');
 assert.ok(door.blocked(leaf.x,-.55));
 assert.equal(door.blocked(leaf.x,.55),false);
 assert.equal(door.blocked(6.43,0),false);
 assert.equal(door.blocked(7.6,0),true);
});
test('interaction requires proximity and looking at the entrance from either side',()=>{
 const door=createEntryDoorState();
 assert.ok(door.canInteract(6.43,1.4,0));
 assert.ok(door.canInteract(6.43,-1.4,Math.PI));
 assert.equal(door.canInteract(6.43,1.4,Math.PI),false);
 assert.equal(door.canInteract(6.43,4,0),false);
});
test('door cannot close through a person in the threshold and resumes when clear',()=>{
 const door=createEntryDoorState();door.toggle();
 for(let i=0;i<120;i++)door.update(1/60);
 door.toggle();
 for(let i=0;i<120;i++)door.update(1/60,{x:6.43,z:0,radius:.24});
 assert.ok(door.obstructed);assert.ok(door.angle>.1);
 assert.equal(door.blocked(6.43,0),false);
 for(let i=0;i<120;i++)door.update(1/60,{x:6.43,z:-1.4,radius:.24});
 assert.equal(door.obstructed,false);assert.ok(door.angle<.001);
 assert.ok(door.blocked(6.43,0));
});

test('door sweep protects both the visitor and the visible companion',()=>{
 const door=createEntryDoorState();door.toggle();for(let i=0;i<120;i++)door.update(1/60);
 door.toggle();
 for(let i=0;i<120;i++)door.update(1/60,[{x:6.43,z:1.4,radius:.24},{x:6.43,z:0,radius:.30}]);
 assert.equal(door.obstructed,true);assert.ok(door.angle>.1);
 for(let i=0;i<120;i++)door.update(1/60,[{x:6.43,z:1.4,radius:.24}]);
 assert.ok(door.angle<.001);
});


test('remote door snapshot gives the guest the same opening and collision as the host',()=>{const host=createEntryDoorState(),guest=createEntryDoorState();host.toggle();for(let i=0;i<100;i++)host.update(.02);guest.applyRemote({angle:host.angle,open:host.targetOpen});assert.equal(guest.angle,host.angle);assert.equal(guest.targetOpen,true);for(const x of [6,6.5,7])assert.equal(guest.blocked(x,0),host.blocked(x,0));});
