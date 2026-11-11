import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {read as readKTX} from '../vendor/addons/libs/ktx-parse.module.js';

test('compressed avatars preserve every geometry/rig/animation byte, resolution, color space and mip chain',async()=>{
 for(const [folder,name] of [['mixamo','presenter'],['client','client'],['collaborator','collaborator']])for(const suffix of ['','-mobile']){
  const base=new URL('../assets/avatars/'+folder+'/',import.meta.url);
  const original=await readFile(new URL(name+suffix+'.glb',base)),compressed=await readFile(new URL(name+suffix+'-ktx2.glb',base));
  const size=original.readUInt32LE(12),size2=compressed.readUInt32LE(12),before=JSON.parse(original.subarray(20,20+size)),after=JSON.parse(compressed.subarray(20,20+size2));
  assert.deepEqual(original.subarray(20+size),compressed.subarray(20+size2),'binary data must stay identical');
  for(const field of ['meshes','nodes','skins','animations','accessors','bufferViews','materials'])assert.deepEqual(before[field],after[field],field+' must stay identical');
  const normalIndices=new Set(before.materials.flatMap(m=>[m.normalTexture?.index]).filter(i=>i!==undefined));
  for(const [index,texture] of after.textures.entries()){
   assert.equal(texture.source,before.textures[index].source,'retain PNG fallback');
   const hair=after.materials.some(m=>/hair/i.test(m.name||'')&&m.pbrMetallicRoughness?.baseColorTexture?.index===index);
   if(hair){assert.equal(texture.extensions?.KHR_texture_basisu,undefined,'hair must retain original PNG alpha');continue;}
   const png=await readFile(new URL(after.images[texture.source].uri,base)),source=texture.extensions.KHR_texture_basisu.source;
   const ktx=readKTX(new Uint8Array(await readFile(new URL(after.images[source].uri,base))));
   assert.equal(ktx.pixelWidth,png.readUInt32BE(16));assert.equal(ktx.pixelHeight,png.readUInt32BE(20));
   assert.equal(ktx.levels.length,Math.floor(Math.log2(Math.max(ktx.pixelWidth,ktx.pixelHeight)))+1);
   const dfd=ktx.dataFormatDescriptor[0];assert.equal(dfd.colorModel,166,'UASTC');
   assert.equal(dfd.transferFunction,normalIndices.has(index)?1:2,'linear normals / sRGB color');
   assert.equal(dfd.flags,0,'no premultiplied alpha');
  }
 }
});
