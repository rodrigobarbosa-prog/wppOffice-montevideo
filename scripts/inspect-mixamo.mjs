import {registerHooks} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const THREE=await import('../vendor/three.module.js');
const {FBXLoader}=await import('../vendor/addons/loaders/FBXLoader.js');
globalThis.window={URL};
const blobs=new Map();
window.URL={createObjectURL(blob){const name='blob:embedded-'+blobs.size;blobs.set(name,blob);return name;}};
THREE.TextureLoader.prototype.load=function(url){const t=new THREE.Texture();t.userData.url=url;return t;};
const bytes=await readFile('C:/Users/Barbosaro/Downloads/Ch31_nonPBR.fbx');
const model=new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
await mkdir(new URL('../artifacts/mixamo-source/',import.meta.url),{recursive:true});
await writeFile(new URL('../artifacts/mixamo-source/Ch31_nonPBR.fbx',import.meta.url),bytes);
const bones=[],meshes=[];
model.updateMatrixWorld(true);
model.traverse(o=>{if(o.isBone)bones.push({name:o.name,parent:o.parent.name,p:o.getWorldPosition(new THREE.Vector3()).toArray()});if(o.isMesh)meshes.push({name:o.name,vertices:o.geometry.attributes.position.count,morphs:o.morphTargetDictionary,materials:(Array.isArray(o.material)?o.material:[o.material]).map(m=>({name:m.name,map:m.map?.userData,normal:m.normalMap?.userData,alpha:m.alphaMap?.userData,transparent:m.transparent}))});});
const body=model.getObjectByName('Ch31_Body'),uvs=[];
for(let i=0;i<body.geometry.attributes.position.count;i++){const p=new THREE.Vector3().fromBufferAttribute(body.geometry.attributes.position,i);if(p.y>160&&p.z>0)uvs.push({p:p.toArray(),uv:[body.geometry.attributes.uv.getX(i),body.geometry.attributes.uv.getY(i)]});}
console.log(JSON.stringify({attributes:Object.keys(body.geometry.attributes),texture:body.material.map?{repeat:body.material.map.repeat,offset:body.material.map.offset,channel:body.material.map.channel}:null,uv:uvs.slice(0,4),uv1:body.geometry.attributes.uv1?.array.slice(0,12),summary:meshes},null,2));
