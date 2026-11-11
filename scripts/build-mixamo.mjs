// Offline conversion of the user's own Mixamo download. No account or remote asset access.
import {registerHooks} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const T=await import('../vendor/three.module.js');
const {FBXLoader}=await import('../vendor/addons/loaders/FBXLoader.js');
const {GLTFLoader}=await import('../vendor/addons/loaders/GLTFLoader.js');
const {GLTFExporter}=await import('../vendor/addons/exporters/GLTFExporter.js');
const client=process.argv.includes('--client');
const collaborator=process.argv.includes('--collaborator');
const sourceFile=collaborator?(process.argv.find(a=>/^Ch\d+_nonPBR\.fbx$/.test(a))||'Ch01_nonPBR.fbx'):client?'passive_marker_man.fbx':'Ch31_nonPBR.fbx';
const output=new URL(collaborator?'../assets/avatars/collaborator/':client?'../assets/avatars/client/':'../assets/avatars/mixamo/',import.meta.url);
await mkdir(output,{recursive:true});
const blobs=new Map();
globalThis.window={URL:{createObjectURL(blob){const key='blob:embedded-'+blobs.size;blobs.set(key,blob);return key;}}};
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(r=>{this.result=r;this.onloadend?.();});}readAsDataURL(b){b.arrayBuffer().then(r=>{this.result='data:'+b.type+';base64,'+Buffer.from(r).toString('base64');this.onloadend?.();});}};
T.TextureLoader.prototype.load=function(url){const texture=new T.Texture();texture.userData.url=url;return texture;};
const bytes=await readFile(new URL('../artifacts/mixamo-source/'+sourceFile,import.meta.url));
const model=new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const primary=new Map(),duplicates=[];
model.traverse(o=>{if(o.isBone){if(primary.has(o.name))duplicates.push(o);else primary.set(o.name,o);}});
// FBXLoader creates identity child bones for each additional clothing skin. Unique names
// keep the animation binding on the actual joint; their bind matrices stay untouched.
duplicates.forEach((o,i)=>o.name+='__skin'+i);
model.updateMatrixWorld(true);
const sourceBytes=await readFile(new URL('../assets/avatars/rocketbox/presenter.glb',import.meta.url));
const source=await new GLTFLoader().parseAsync(sourceBytes.buffer.slice(sourceBytes.byteOffset,sourceBytes.byteOffset+sourceBytes.byteLength),'');
source.scene.updateMatrixWorld(true);
const pairs={Hips:'Bip01',Spine:'Bip01_Spine',Spine1:'Bip01_Spine1',Spine2:'Bip01_Spine2',Neck:'Bip01_Neck',Head:'Bip01_Head'};
for(const [side,short] of [['Left','L'],['Right','R']]){
 for(const [target,original] of [['Shoulder','Clavicle'],['Arm','UpperArm'],['ForeArm','Forearm'],['Hand','Hand'],['UpLeg','Thigh'],['Leg','Calf'],['Foot','Foot'],['ToeBase','Toe0']])pairs[side+target]='Bip01_'+short+'_'+original;
 for(const [finger,index] of [['Thumb',0],['Index',1],['Middle',2],['Ring',3],['Pinky',4]])for(let j=1;j<=3;j++)pairs[side+'Hand'+finger+j]='Bip01_'+short+'_Finger'+index+(j===1?'':j-1);
}
const targetRest=new Map(),sourceRest=new Map();
for(const [name,bone] of primary){targetRest.set(bone,{p:bone.position.clone(),q:bone.quaternion.clone(),world:bone.getWorldQuaternion(new T.Quaternion())});}
source.scene.traverse(o=>{sourceRest.set(o.name,o.getWorldQuaternion(new T.Quaternion()).invert());});
const mapping=[...primary].map(([name,bone])=>({bone,source:source.scene.getObjectByName(pairs[name.replace(/^mixamorig\d*/, '')])})).filter(p=>p.source);
// Match joint directions as well as rotation deltas: the two characters have
// different arm rest poses. Applying rotation deltas alone leaves a T-pose offset.
for(const pair of mapping){
 const restPosition=pair.bone.getWorldPosition(new T.Vector3());
 const child=mapping.find(p=>p.bone.parent===pair.bone&&p.bone.getWorldPosition(new T.Vector3()).distanceTo(restPosition)>.5);
 if(child){pair.child=child.source;pair.restDirection=child.bone.getWorldPosition(new T.Vector3()).sub(restPosition).normalize();}
}
if(mapping.length<20)throw new Error('Incomplete joint mapping: '+mapping.length);
const joint=suffix=>[...primary].find(([name])=>name.replace(/^mixamorig\d*/, '')===suffix)?.[1];
const hip=joint('Hips'),srcHip=source.scene.getObjectByName('Bip01');
const srcBase=srcHip.getWorldPosition(new T.Vector3()),targetBase=hip.position.clone(),heightRatio=targetBase.y/srcBase.y;
const leftFoot=joint('LeftFoot'),rightFoot=joint('RightFoot');
const footBase=Math.min(leftFoot.getWorldPosition(new T.Vector3()).y,rightFoot.getWorldPosition(new T.Vector3()).y);
const mixer=new T.AnimationMixer(source.scene),q=new T.Quaternion(),parentQ=new T.Quaternion(),v=new T.Vector3(),deltaQ=new T.Quaternion(),correctionQ=new T.Quaternion();
const clips=[];
for(const clip of source.animations){
 const action=mixer.clipAction(clip);action.reset().play();
 const times=[],values=new Map(mapping.map(({bone})=>[bone,[]])),positions=[];
 const count=Math.ceil(clip.duration*30);
 for(let frame=0;frame<=count;frame++){
  const time=frame*clip.duration/count;times.push(time);mixer.setTime(Math.min(time,clip.duration-1e-6));source.scene.updateMatrixWorld(true);
  for(const [bone,rest] of targetRest){bone.position.copy(rest.p);bone.quaternion.copy(rest.q);}
  model.updateMatrixWorld(true);
  for(const {bone,source:original,child,restDirection} of mapping){
   original.getWorldQuaternion(deltaQ);deltaQ.multiply(sourceRest.get(original.name));q.copy(deltaQ).multiply(targetRest.get(bone).world);
   if(child&&bone!==hip){
    const desired=child.getWorldPosition(new T.Vector3()).sub(original.getWorldPosition(new T.Vector3())).normalize();
    const predicted=restDirection.clone().applyQuaternion(deltaQ).normalize();
    correctionQ.setFromUnitVectors(predicted,desired);q.premultiply(correctionQ);
   }
   bone.parent.getWorldQuaternion(parentQ);bone.quaternion.copy(parentQ.invert().multiply(q));bone.updateWorldMatrix(false,true);
   values.get(bone).push(...bone.quaternion.toArray());
  }
  srcHip.getWorldPosition(v);hip.position.copy(targetBase);hip.position.y+=(v.y-srcBase.y)*heightRatio;model.updateMatrixWorld(true);
  // Ground the support foot after differing leg lengths have been retargeted.
  const footY=Math.min(leftFoot.getWorldPosition(v).y,rightFoot.getWorldPosition(new T.Vector3()).y);
  hip.position.y+=footBase-footY;positions.push(...hip.position.toArray());
 }
 const tracks=mapping.map(({bone})=>new T.QuaternionKeyframeTrack(bone.name+'.quaternion',times,values.get(bone)));
 tracks.push(new T.VectorKeyframeTrack(hip.name+'.position',times,positions));
 clips.push(new T.AnimationClip(clip.name,clip.duration,tracks).optimize());action.stop();
}
for(const [bone,rest] of targetRest){bone.position.copy(rest.p);bone.quaternion.copy(rest.q);}model.updateMatrixWorld(true);
const materialDefs=new Map();
model.traverse(o=>{if(!o.isMesh)return;o.normalizeSkinWeights?.();
 // The original FBX uses bottom-origin UVs. Images are copied byte-for-byte,
 // so flip V in geometry (ImageBitmap ignores Texture.flipY at runtime).
 const uv=o.geometry.attributes.uv;
 if(uv)for(let i=0;i<uv.count;i++)uv.setY(i,1-uv.getY(i));
 const convert=m=>{if(!materialDefs.has(m.name))materialDefs.set(m.name,{map:m.map?.userData.url,normal:m.normalMap?.userData.url,hair:m.name.includes('hair'),color:m.color.toArray()});return new T.MeshStandardMaterial({name:m.name,color:0xffffff,roughness:.75});};
 o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);
});
const binary=Buffer.from(await new GLTFExporter().parseAsync(model,{binary:true,animations:clips}));
const jsonLength=binary.readUInt32LE(12),json=JSON.parse(binary.subarray(20,20+jsonLength).toString());
const bin=binary.subarray(20+jsonLength+8);
json.images=[];json.textures=[];json.samplers=[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}];
const textureIndices=new Map();
for(const [url,blob] of blobs){
 const name='texture-'+url.split('-').pop()+'.png';const data=Buffer.from(await blob.arrayBuffer());await writeFile(new URL(name,output),data);
 textureIndices.set(url,json.textures.length);json.images.push({uri:name});json.textures.push({sampler:0,source:json.images.length-1});
 console.log(name,data.length,data.readUInt32BE(16)+'x'+data.readUInt32BE(20));
}
for(const m of json.materials){const def=materialDefs.get(m.name);if(!def)continue;
 m.pbrMetallicRoughness={baseColorFactor:def.map?[1,1,1,1]:[...def.color,1],metallicFactor:0,roughnessFactor:def.hair?.74:.78};
 if(def.map)m.pbrMetallicRoughness.baseColorTexture={index:textureIndices.get(def.map)};
 if(def.normal)m.normalTexture={index:textureIndices.get(def.normal),scale:.65};
 if(def.hair){m.alphaMode='MASK';m.alphaCutoff=.38;m.doubleSided=true;}
}
const paddedJson=Buffer.from(JSON.stringify(json).padEnd(Math.ceil(Buffer.byteLength(JSON.stringify(json))/4)*4,' '));
const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(20+paddedJson.length+8+bin.length,8);header.writeUInt32LE(paddedJson.length,12);header.writeUInt32LE(0x4e4f534a,16);
const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(bin.length);binHeader.writeUInt32LE(0x004e4942,4);
await writeFile(new URL(collaborator?'collaborator.glb':client?'client.glb':'presenter.glb',output),Buffer.concat([header,paddedJson,binHeader,bin]));
await writeFile(new URL('manifest.json',output),JSON.stringify({character:collaborator?'Adobe Mixamo / Brian':client?'Adobe Mixamo / Passive Marker Man':'Adobe Mixamo Leonard / Ch31',source:sourceFile+', downloaded by user',license:'Adobe Mixamo commercial project use; not a standalone asset redistribution',facialRig:false,bones:primary.size,mappedBones:mapping.length,animations:clips.map(c=>({name:c.name,duration:c.duration,tracks:c.tracks.length})),motionSource:'Microsoft Rocketbox, MIT; retargeted to Mixamo skeleton'},null,2));
console.log('Built Mixamo presenter',mapping.length,clips.map(c=>c.name));
