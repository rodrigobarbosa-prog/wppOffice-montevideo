import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {selectRenderProfile} from '../src/render-profile.js';
test('phones and iPads skip expensive startup passes; desktop retains detail',()=>{
 for(const device of [{userAgent:'iPhone'},{userAgent:'Android Mobile'},{platform:'MacIntel',maxTouchPoints:5},{deviceMemory:4}]){
  const profile=selectRenderProfile(device);assert.ok(profile.mobile);assert.equal(profile.postprocessing,false);assert.equal(profile.reflectionProbe,false);assert.equal(profile.pixelRatio,1);assert.equal(profile.avatarTextureSize,1024);assert.equal(profile.mirrorSamples,0);
 }
 assert.equal(selectRenderProfile({userAgent:'Windows NT 10.0',deviceMemory:16}).postprocessing,true);
});
test('mobile variants preserve geometry and animation and bound decoded texture memory',async()=>{
 for(const [folder,name] of [['mixamo','presenter'],['client','client'],['collaborator','collaborator']]){
  const base=new URL('../assets/avatars/'+folder+'/',import.meta.url);
  const original=await readFile(new URL(name+'.glb',base)),mobile=await readFile(new URL(name+'-mobile.glb',base));
  const originalSize=original.readUInt32LE(12),mobileSize=mobile.readUInt32LE(12);
  assert.deepEqual(original.subarray(20+originalSize),mobile.subarray(20+mobileSize));
  const json=JSON.parse(mobile.subarray(20,20+mobileSize));
  for(const image of json.images){
   assert.match(image.uri,/^mobile\//);const png=await readFile(new URL(image.uri,base));
   assert.ok(png.readUInt32BE(16)<=1024&&png.readUInt32BE(20)<=1024);
  }
 }
});
