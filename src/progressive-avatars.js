import * as THREE from '../vendor/three.module.js';

export function avatarLoadOrder(role){return role==='collaborator'?['collaborator','presenter','client']:['presenter','client','collaborator'];}
export function createProgressiveAvatars({scene,factories,prepare=async()=>{},onState=()=>{}}){
 const people={},pending=new Map();let queue=Promise.resolve();
 for(const role of ['presenter','client','collaborator']){
  const root=new THREE.Group();root.name='Loading '+role;root.userData.ready=false;
  root.userData.face=direction=>{root.rotation.y=direction;};root.userData.animate=()=>{};
  people[role]=root;scene.add(root);
 }
 function ensure(role){
  if(people[role].userData.ready)return Promise.resolve(people[role]);
  if(pending.has(role))return pending.get(role);
  const root=people[role],job=queue.then(async()=>{
   onState(role,'loading');
   // Keep the same navigation root, seat and network identity throughout loading.
   const existing=new Set(root.children);let children=[];
   try{
    await factories[role](scene,{root});children=root.children.filter(child=>!existing.has(child));
    children.forEach(child=>child.visible=false);
    await prepare(root);
    children.forEach(child=>child.visible=true);root.userData.ready=true;onState(role,'ready');return root;
   }catch(error){
    // Failed background loads never crash the visit; a later ensure() can retry.
    for(const child of root.children.filter(child=>!existing.has(child))){root.remove(child);child.traverse(object=>{object.geometry?.dispose();for(const m of [object.material].flat().filter(Boolean)){m.map?.dispose();m.normalMap?.dispose();m.dispose();}});}
    root.userData.ready=false;root.userData.animate=()=>{};onState(role,'failed',error);throw error;
   }finally{pending.delete(role);}
  });
  pending.set(role,job);queue=job.catch(()=>{});return job;
 }
 return {people,ensure,async essentials(role){for(const person of avatarLoadOrder(role).slice(0,role==='collaborator'?3:2))await ensure(person);},background(){return ensure('collaborator').catch(()=>null);}};
}

// Avoid uploading every large texture in a single frame. No background render loop.
export async function prepareAvatar(renderer,root,scene,camera,{yieldTask=()=>new Promise(resolve=>setTimeout(resolve,20))}={}){
 const textures=new Set();root.traverse(object=>{for(const material of [object.material].flat().filter(Boolean))for(const texture of [material.map,material.normalMap])if(texture)textures.add(texture);});
 for(const texture of textures){renderer.initTexture(texture);await yieldTask();}
 await renderer.compileAsync(root,camera,scene);
}
