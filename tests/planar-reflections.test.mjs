import test from 'node:test';import assert from 'node:assert/strict';import {reflectionGate,registerPlanarReflection} from '../src/planar-reflections.js';
test('shared guard prevents nested cabin/hall rendering and restores hidden states after a failure',()=>{
 const scene={children:[]},renderer={},camera={matrixWorld:{elements:Array(16).fill(0)}},matrixWorld={elements:Array(16).fill(0)};let calls=0;
 const a={visible:true,matrixWorld,onBeforeRender(){calls++;b.onBeforeRender(renderer,scene,camera);throw Error('test render');}},b={visible:true,matrixWorld,onBeforeRender(){calls++;}};
 const self={visible:false,userData:{mirrorSelf:true}};scene.children=[self];
 registerPlanarReflection(scene,a);registerPlanarReflection(scene,b);
 assert.throws(()=>a.onBeforeRender(renderer,scene,camera),/test render/);assert.equal(calls,1);assert.equal(b.visible,true);assert.equal(self.visible,false);
 b.onBeforeRender(renderer,scene,camera);assert.equal(calls,2);
});
test('reflection scheduling rejects nested calls and bounds update cadence',()=>{const gate=reflectionGate(33);assert.equal(gate.enter(0),true);assert.equal(gate.enter(100),false);gate.leave();assert.equal(gate.enter(20),false);assert.equal(gate.enter(34),true);});
test('arrival mirrors skip reflection passes through the office wall',()=>{
 const scene={children:[]},renderer={};
 const matrix=(x,y,z)=>({elements:[1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1]});
 const camera={matrixWorld:matrix(-9.5,1.68,-3.6)};
 let draws=0;
 const mirror={visible:true,matrixWorld:matrix(1.48,1.205,2.491),onBeforeRender(){draws++;}};
 registerPlanarReflection(scene,mirror,{maxDistance:14});
 mirror.onBeforeRender(renderer,scene,camera);
 assert.equal(draws,0);
 camera.matrixWorld=matrix(-10,1.68,.15);
 mirror.onBeforeRender(renderer,scene,camera);
 assert.equal(draws,0);
 camera.matrixWorld=matrix(2,1.68,1.3);
 mirror.onBeforeRender(renderer,scene,camera);
 assert.equal(draws,1);
});
