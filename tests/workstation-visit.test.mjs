import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkstationVisit} from '../src/workstation-visit.js';

test('client walks to a clear place by Brian, arrives before viewing, and can resume following',()=>{
 const station={x:5,z:0},blocked=(x,z)=>x>2&&x<3&&Math.abs(z)<1;
 const visit=createWorkstationVisit({station,blocked});let client={x:0,z:0};
 assert.equal(visit.start(client),true);assert.equal(visit.phase,'approaching');
 let arrived=false;
 for(let i=0;i<1200&&!arrived;i++){const next=visit.update(.02,client);assert.equal(blocked(next.x,next.z),false);assert.ok(Math.hypot(next.x-client.x,next.z-client.z)<=1.65*.02+.0001);client=next;arrived=next.arrived;}
 assert.equal(arrived,true);assert.equal(visit.phase,'viewing');assert.ok(Math.hypot(client.x-station.x,client.z-station.z)<2);
 const still=visit.update(.1,client);assert.equal(still.speed,0);assert.equal(still.x,client.x);
 visit.cancel();assert.equal(visit.phase,'idle');
});
test('blocked workstation never teleports the client or opens the screen',()=>{
 const visit=createWorkstationVisit({station:{x:5,z:5},blocked:()=>true});
 assert.equal(visit.start({x:0,z:0}),false);assert.equal(visit.phase,'idle');
});
