// Offline, CPU-only encoder. Originals, geometry, rigs and animation buffers stay untouched.
// Download @gpu-tex-enc/basis 1.16.4 into artifacts/texture-tools, or set BASISU_PATH.
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
const encoder=path.resolve(process.env.BASISU_PATH||'artifacts/texture-tools/package/bin/win32-x64/basisu.exe');
const mobileOnly=process.argv.includes('--mobile-only');
await mkdir('artifacts/texture-compression',{recursive:true});
const report=[];
for(const [folder,name] of [['mixamo','presenter'],['client','client'],['collaborator','collaborator']]){
 for(const suffix of mobileOnly?['-mobile']:['-mobile','']){
  const base=path.resolve('assets/avatars',folder),input=path.join(base,name+suffix+'.glb'),original=await readFile(input);
  const jsonSize=original.readUInt32LE(12),json=JSON.parse(original.subarray(20,20+jsonSize));
  const dataIndices=new Set(json.materials.flatMap(m=>[m.normalTexture?.index,m.occlusionTexture?.index,m.pbrMetallicRoughness?.metallicRoughnessTexture?.index]).filter(i=>i!==undefined).map(i=>json.textures[i].source));
  // Alpha-tested hair is visually sensitive. Keep its authored PNG, including
  // shared body/hair atlases, rather than accepting changed edge coverage.
  const protectedImages=new Set(json.materials.filter(m=>/hair/i.test(m.name||'')).map(m=>m.pbrMetallicRoughness?.baseColorTexture?.index).filter(i=>i!==undefined).map(i=>json.textures[i].source));
  const imageMap=new Map();
  for(const [i,image] of [...json.images].entries()){
   if(protectedImages.has(i))continue;
   const source=path.join(base,image.uri),png=await readFile(source),linear=dataIndices.has(i);
   const hash=createHash('sha256').update(png).update(linear?'linear-uastc3-v1':'srgb-uastc3-v1').digest('hex').slice(0,20);
   const uri='ktx2/'+hash+'.ktx2',output=path.join(base,uri);await mkdir(path.dirname(output),{recursive:true});
   let exists=false;try{exists=(await stat(output)).size>80;}catch{}
   if(!exists){
    const args=['-file',source,'-output_file',output,'-ktx2','-uastc','-uastc_level','3','-max_threads','2','-mipmap','-mip_slow','-ktx2_zstandard_level','6','-stats'];
    if(linear)args.push('-normal_map','-mip_renorm');
    const log=await new Promise((resolve,reject)=>{let log='';const child=spawn(encoder,args,{windowsHide:true});child.stdout.on('data',s=>log+=s);child.stderr.on('data',s=>log+=s);child.on('error',reject);child.on('exit',code=>code===0?resolve(log):reject(Error('Encoder failed: '+source+'\n'+log)));});
    await writeFile('artifacts/texture-compression/'+hash+'.log',log);
   }
   const ktx=await readFile(output);
   if(ktx.readUInt32LE(20)!==png.readUInt32BE(16)||ktx.readUInt32LE(24)!==png.readUInt32BE(20))throw Error('Texture resolution changed');
   imageMap.set(i,json.images.length);json.images.push({uri,mimeType:'image/ktx2'});
   report.push({model:name+suffix,source:image.uri,uri,linear,width:ktx.readUInt32LE(20),height:ktx.readUInt32LE(24),mipLevels:ktx.readUInt32LE(40),originalBytes:png.length,compressedBytes:ktx.length});
   console.log(name+suffix+' '+image.uri+' → '+(ktx.length/1048576).toFixed(2)+' MiB');
  }
  // PNG source is a standards-compliant fallback, compressed source is preferred by KTX2Loader.
  for(const texture of json.textures)if(imageMap.has(texture.source))texture.extensions={...texture.extensions,KHR_texture_basisu:{source:imageMap.get(texture.source)}};
  json.extensionsUsed=[...new Set([...(json.extensionsUsed||[]),'KHR_texture_basisu'])];
  const jsonBytes=Buffer.from(JSON.stringify(json)),padded=Buffer.alloc(Math.ceil(jsonBytes.length/4)*4,32);jsonBytes.copy(padded);
  const header=Buffer.from(original.subarray(0,20)),tail=original.subarray(20+jsonSize);header.writeUInt32LE(20+padded.length+tail.length,8);header.writeUInt32LE(padded.length,12);
  await writeFile(path.join(base,name+suffix+'-ktx2.glb'),Buffer.concat([header,padded,tail]));
 }
}
await writeFile('artifacts/texture-compression/report.json',JSON.stringify(report,null,2));
console.log('CPU compression complete. Original PNGs and binary geometry/animation chunks preserved.');
