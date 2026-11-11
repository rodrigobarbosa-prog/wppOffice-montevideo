import {readFile,writeFile} from 'node:fs/promises';
const records=[];
for(const [folder,name] of [['mixamo','presenter'],['client','client'],['collaborator','collaborator']])for(const mobile of [false,true]){
 const base='assets/avatars/'+folder+'/',file=base+name+(mobile?'-mobile':'')+'.glb',bytes=await readFile(file),json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
 let triangles=0,vertices=0;for(const mesh of json.meshes)for(const p of mesh.primitives){triangles+=(json.accessors[p.indices??p.attributes.POSITION].count)/3;vertices+=json.accessors[p.attributes.POSITION].count;}
 let transfer=bytes.length,textureMemory=0;for(const image of json.images||[]){const png=await readFile(base+image.uri);transfer+=png.length;textureMemory+=png.readUInt32BE(16)*png.readUInt32BE(20)*4*4/3;}
 records.push({avatar:name,mobile,meshes:json.meshes.length,triangles,vertices,transferMiB:+(transfer/1048576).toFixed(2),textureMemoryMiB:+(textureMemory/1048576).toFixed(2)});
}
await writeFile('artifacts/avatar-performance-audit.json',JSON.stringify(records,null,2));console.table(records);
