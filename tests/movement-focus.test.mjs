import test from 'node:test';import assert from 'node:assert/strict';
import {setupMovementKeyboard,movementKeyCode} from '../src/movement-input.js';
test('WASD works after losing focus without any joystick input, and missed keyup cannot keep walking',()=>{
 const events={},keys=new Set();let focused=0,released=0,active=true;
 setupMovementKeyboard({target:{addEventListener(name,fn,capture){events[name]=fn;if(name==='keydown')assert.equal(capture,true);}},keys,enabled:()=>active,focus:()=>focused++,onRelease:()=>released++});
 const key=(code,target=null)=>({code,key:code==='KeyW'?'w':code,target,preventDefault(){}});
 events.keydown(key('KeyW'));assert.ok(keys.has('KeyW'));
 events.blur();assert.equal(keys.size,0);events.focus();assert.ok(focused>=2);
 events.keydown(key('KeyW'));assert.ok(keys.has('KeyW'));events.keyup(key('KeyW'));assert.equal(keys.size,0);
 events.keydown(key('KeyW',{closest:()=>true}));assert.equal(keys.size,0);
 active=false;events.focus();events.keydown(key('KeyD'));assert.equal(keys.size,0);assert.ok(released>=3);
 assert.equal(movementKeyCode({key:'W'}),'KeyW');assert.equal(movementKeyCode({key:'ArrowLeft'}),'ArrowLeft');
});
