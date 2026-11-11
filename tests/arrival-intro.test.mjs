import test from 'node:test';
import assert from 'node:assert/strict';
import {createArrivalIntro,liftArrival,liftSeparates} from '../src/arrival-intro.js';
import {acceptsMovementKey} from '../src/movement-input.js';
import {readFileSync} from 'node:fs';

test('loading, boarding and ascent start on floor 10 and never go backwards',()=>{
 const html=readFileSync(new URL('../assets/visit.html',import.meta.url),'utf8');
 assert.match(html,/class="lift-preview-display">10<\/div>/);
 const intro=createArrivalIntro();assert.equal(intro.update(0).floor,10);
 intro.start(5.3);let previous=10;const floors=new Set([10]);
 for(let i=0;i<120;i++){
  const state=intro.update(.1,{audioFinished:i>=53});
  assert.ok(state.floor>=previous);previous=state.floor;floors.add(state.floor);
 }
 assert.deepEqual([...floors],[10,11,12,13,14]);
});
test('doors cannot open while audio is still loading, stalled or speaking, regardless of elapsed time',()=>{
 const intro=createArrivalIntro();intro.start(17);
 for(let i=0;i<100;i++){const state=intro.update(.1);assert.equal(state.phase,'rising');assert.equal(state.door,0);assert.equal(state.exit,0);}
 let state=intro.update(.1,{audioFinished:true});assert.equal(state.phase,'arriving');assert.equal(state.door,0);
 for(let i=0;i<2;i++)state=intro.update(.1,{audioFinished:true});assert.equal(state.door,0);
 let exited=false;
 for(let i=0;i<120;i++){state=intro.update(.1,{audioFinished:true});if(state.exit>0){exited=true;assert.equal(state.door,1);}}
 assert.equal(exited,true);assert.equal(intro.phase,'complete');assert.equal(intro.active,false);
 assert.ok(liftArrival.client.z>2.6&&liftArrival.exit.z<2.4);
});
test('movement remains available after clicking buttons, while typing and modified shortcuts are protected',()=>{
 assert.equal(acceptsMovementKey({target:{closest:()=>null}}),true);
 for(const match of ['input','textarea','select','editable'])assert.equal(acceptsMovementKey({target:{closest:()=>match}}),false);
 assert.equal(acceptsMovementKey({ctrlKey:true,target:{closest:()=>null}}),false);
});

test('elevator exit eases in and out and a stalled frame cannot teleport the visitor',()=>{
 const intro=createArrivalIntro();intro.start();intro.update(.1,{audioFinished:true});
 let previous=0,peak=0,first=0,last=0;
 for(let i=0;i<130;i++){
  const state=intro.update(.1,{audioFinished:true});const speed=(state.exit-previous)*1.85/.1;
  if(speed>0){if(!first)first=speed;last=speed;peak=Math.max(peak,speed);}
  previous=state.exit;
 }
 assert.ok(peak<1.3);assert.ok(first<.02);assert.ok(last<.02);
 const stalled=createArrivalIntro();stalled.start();stalled.update(.1,{audioFinished:true});
 const state=stalled.update(30,{audioFinished:true});assert.equal(state.door,0);assert.equal(state.exit,0);
});

test('closed elevator blocks person actions in both directions until the doors are fully open',()=>{
 const inside={x:0,y:1.68,z:3.85},outside={x:.45,y:1.2,z:.65};
 assert.equal(liftSeparates(inside,outside,0),true);assert.equal(liftSeparates(outside,inside,.8),true);
 assert.equal(liftSeparates(inside,outside,1),false);assert.equal(liftSeparates(outside,{x:2,y:1.2,z:1},0),false);
});
test('arrival keeps a continuous gentle camera reveal and greets only as the doors open',()=>{
 const intro=createArrivalIntro();intro.start(5.3);let previous=-.1;
 for(let i=0;i<52;i++){const p=intro.update(.1);assert.ok(Math.abs(p.cameraYaw-previous)<.02);previous=p.cameraYaw;assert.equal(p.greeting,false);assert.equal(p.sway,0);}
 let greeting=false;for(let i=0;i<60;i++){const p=intro.update(.1,{audioFinished:true});if(p.greeting){greeting=true;assert.ok(p.door>.85);}if(p.exit>0)assert.equal(p.door,1);}
 assert.ok(greeting);assert.equal(intro.phase,'complete');
});
