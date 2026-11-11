import test from 'node:test';import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {loadAvatarVariants}=await import('../src/avatar-assets.js');
test('unsupported hardware uses the original model without attempting compressed resources',async()=>{
 const requests=[];await loadAvatarVariants(async url=>requests.push(url),'/client-mobile.glb');assert.deepEqual(requests,['/client-mobile.glb']);
});
test('decoder/download failure falls back to the exact original variant',async()=>{
 const requests=[];let reported=false;const model={scene:'original'};
 const result=await loadAvatarVariants(async url=>{requests.push(url);if(url.endsWith('-ktx2.glb'))throw Error('decoder unavailable');return model;},'/client-mobile.glb',{compressed:true,onFallback:()=>reported=true});
 assert.equal(result,model);assert.ok(reported);assert.deepEqual(requests,['/client-mobile-ktx2.glb','/client-mobile.glb']);
});
