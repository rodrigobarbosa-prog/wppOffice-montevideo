import {registerHooks} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const THREE=await import('../vendor/three.module.js');
const {FBXLoader}=await import('../vendor/addons/loaders/FBXLoader.js');
const {TGALoader}=await import('../vendor/addons/loaders/TGALoader.js');
const {GLTFExporter}=await import('../vendor/addons/exporters/GLTFExporter.js');
globalThis.window={URL};
globalThis.FileReader=class {
 readAsArrayBuffer(blob){blob.arrayBuffer().then(r=>{this.result=r;this.onloadend?.();});}
 readAsDataURL(blob){blob.arrayBuffer().then(r=>{this.result='data:'+blob.type+';base64,'+Buffer.from(r).toString('base64');this.onloadend?.();});}
};
THREE.TextureLoader.prototype.load=function(url){const t=new THREE.Texture();t.name=String(url).split(/[\\/]/).pop();return t;};
const source=new URL('../artifacts/rocketbox-source/',import.meta.url);
const output=new URL('../assets/avatars/rocketbox/',import.meta.url);
await mkdir(output,{recursive:true});
async function fbx(name){const b=await readFile(new URL(name,source));return new FBXLoader().parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
const model=await fbx('Male_Adult_08_facial.fbx');
const keepMorphs=['AK_09_EyeBlinkLeft','AK_10_EyeBlinkRight','AK_44_MouthSmileLeft','AK_45_MouthSmileRight','AK_03_BrowInnerUp','AK_25_JawOpen'];
model.traverse(o=>{
 if(!o.isMesh)return;
 const entries=Object.entries(o.morphTargetDictionary||{}).filter(([n])=>keepMorphs.some(k=>n.endsWith(k)));
 for(const key of Object.keys(o.geometry.morphAttributes))o.geometry.morphAttributes[key]=entries.map(([,i])=>o.geometry.morphAttributes[key][i]);
 o.morphTargetDictionary=Object.fromEntries(entries.map(([name],i)=>[name,i]));o.morphTargetInfluences=entries.map(()=>0);
 const convert=m=>new THREE.MeshStandardMaterial({name:m.name,color:0xffffff,roughness:.72});
 o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);
 if(o.isSkinnedMesh)o.normalizeSkinWeights();
});
const clips=[];
for(const [label,file] of [['idle','m_idle_breathe_01.max.fbx'],['walk','m_walk_neutral_01.max.fbx'],['welcome','m_wave_01.max.fbx'],['explain','m_gestic_talk_neutral_01.max.fbx']]){
 const a=await fbx(file),original=a.animations[0],tracks=[];
 for(const t of original.tracks){
  const node=t.name.slice(0,t.name.lastIndexOf('.'));
  if(!model.getObjectByName(node))continue;
  if(t.name.endsWith('.quaternion'))tracks.push(t.clone());
  if(t.name==='Bip01.position'){
   const track=t.clone(),base=track.values[1],height=model.getObjectByName('Bip01').position.y;
   for(let i=0;i<track.values.length;i+=3){track.values[i]=0;track.values[i+1]=height+track.values[i+1]-base;track.values[i+2]=0;}
   tracks.push(track);
  }
 }
 clips.push(new THREE.AnimationClip(label,original.duration,tracks).optimize());
}
const binary=await new GLTFExporter().parseAsync(model,{binary:true,animations:clips,onlyVisible:true});
await writeFile(new URL('presenter.glb',output),Buffer.from(binary));
// TGALoader decodes the original 2048px maps. PNG output keeps the original channels and orientation.
function crc32(b){let c=0xffffffff;for(const n of b){c^=n;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(type,data){const tag=Buffer.from(type),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([tag,data])));return Buffer.concat([len,tag,data,crc]);}
function png(width,height,rgba){
 const head=Buffer.alloc(13);head.writeUInt32BE(width,0);head.writeUInt32BE(height,4);head[8]=8;head[9]=6;
 const rows=Buffer.alloc(height*(width*4+1));
 for(let y=0;y<height;y++)Buffer.from(rgba.buffer,rgba.byteOffset+y*width*4,width*4).copy(rows,y*(width*4+1)+1);
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',head),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}
for(const name of ['body_color','body_normal','body_specular','head_color','head_normal','head_specular','opacity_color']){
 const b=await readFile(new URL('m014_'+name+'.tga',source));
 const image=new TGALoader().parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
 await writeFile(new URL(name+'.png',output),png(image.width,image.height,image.data));
}
console.log(JSON.stringify({bytes:binary.byteLength,clips:clips.map(c=>({name:c.name,duration:c.duration,tracks:c.tracks.length})),morphs:keepMorphs}));

