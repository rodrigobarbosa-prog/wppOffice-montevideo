import test from 'node:test';
import assert from 'node:assert/strict';
import {stickVector,movementAxes} from '../src/joystick.js';
test('stick has a dead zone, analogue strength and bounded diagonal movement',()=>{
 assert.deepEqual(stickVector(.05,.05),{side:0,forward:0});
 const half=stickVector(.56,0);assert.ok(Math.abs(half.side-.5)<1e-9);
 const full=stickVector(3,-3);assert.ok(Math.abs(Math.hypot(full.side,full.forward)-1)<1e-9);assert.ok(full.forward>0);
});
test('WASD and arrows drive the same stick direction and cannot double the speed',()=>{
 assert.deepEqual(movementAxes(new Set(['KeyW'])),{side:0,forward:1});
 assert.deepEqual(movementAxes(new Set(['ArrowRight'])),{side:1,forward:0});
 assert.deepEqual(movementAxes(new Set(['KeyW','ArrowUp'])),{side:0,forward:1});
 const diagonal=movementAxes(new Set(['KeyW','KeyD']));assert.ok(Math.abs(Math.hypot(diagonal.side,diagonal.forward)-1)<1e-9);
 assert.deepEqual(movementAxes(new Set(['KeyW','KeyS'])),{side:0,forward:0});
 assert.deepEqual(movementAxes(new Set(['KeyW']),{side:0,forward:1}),{side:0,forward:1});
});
