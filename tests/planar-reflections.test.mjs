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
