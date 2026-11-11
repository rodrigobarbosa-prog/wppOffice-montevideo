import test from 'node:test';import assert from 'node:assert/strict';import {createShadowRefresh} from '../src/shadow-refresh.js';
test('idle people reuse static shadows, moving and gesturing people refresh on a bounded cadence',()=>{
 const refresh=createShadowRefresh(33),actor={visible:true,position:{x:0,y:0,z:0},userData:{animation:{gesture:'idle',speed:0}}};
 assert.equal(refresh.update(0,[actor]),true);assert.equal(refresh.update(100,[actor]),false);actor.position.x=1;assert.equal(refresh.update(110,[actor]),true);actor.position.x=2;assert.equal(refresh.update(120,[actor]),false);assert.equal(refresh.update(150,[actor]),true);
 actor.userData.animation.gesture='attention';assert.equal(refresh.update(200,[actor]),true);assert.equal(refresh.update(240,[actor]),true);actor.userData.animation.gesture='idle';assert.equal(refresh.update(300,[actor]),true);assert.equal(refresh.update(400,[actor]),false);
});
