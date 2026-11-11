import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
import * as THREE from '../vendor/three.module.js';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {buildMixamoPresenter}=await import('../src/mixamo-presenter.js');
const {GLTFLoader}=await import('../vendor/addons/loaders/GLTFLoader.js');
const {buildCollaboratorAvatar}=await import('../src/collaborator-avatar.js');
const {applyAttentionGesture}=await import('../src/attention-gesture.js');
globalThis.ProgressEvent=class{constructor(type,options){this.type=type;Object.assign(this,options);}};
async function load(path='../assets/avatars/mixamo/presenter.glb'){
 const b=await readFile(new URL(path,import.meta.url));
 const size=b.readUInt32LE(12),json=JSON.parse(b.subarray(20,20+size));
 // Node has no image decoder. Preserve the real geometry, skins and animation data;
 // material texture orientation and appearance are checked in the browser.
 delete json.images;delete json.textures;delete json.samplers;
 for(const m of json.materials){delete m.normalTexture;delete m.pbrMetallicRoughness.baseColorTexture;}
 json.buffers[0].uri='data:application/octet-stream;base64,'+b.subarray(28+size).toString('base64');
 return new GLTFLoader().parseAsync(JSON.stringify(json),'');
}

test('welcome head tracking stays bounded instead of accumulating two complete spins',async()=>{
 for(const path of ['../assets/avatars/mixamo/presenter.glb','../assets/avatars/client/client.glb','../assets/avatars/collaborator/collaborator.glb']){
  const root=buildMixamoPresenter(new THREE.Scene(),await load(path));root.userData.animate(0);let head;root.traverse(o=>{if(o.isBone&&/^mixamorig\d*Head$/.test(o.name))head=o;});
  const rest=head.quaternion.clone(),last=rest.clone();let travel=0;root.userData.welcomeRemaining=3.6;
  for(let i=0;i<360;i++){
   root.userData.animate(1/60,{lookAt:new THREE.Vector3(1,0,2)});
   assert.ok(rest.angleTo(head.quaternion)<.65,path+' must keep a natural head pose');
   const step=last.angleTo(head.quaternion);assert.ok(step<.12,'no sudden head snaps');travel+=step;last.copy(head.quaternion);
  }
  assert.ok(travel<3,'greeting must not accumulate rotations');
 }
});

test('all three real rigs raise and wave a hand above the head, including when seated',async()=>{
 for(const path of ['../assets/avatars/mixamo/presenter.glb','../assets/avatars/client/client.glb','../assets/avatars/collaborator/collaborator.glb']){
  const root=buildMixamoPresenter(new THREE.Scene(),await load(path));let hand,head;
  root.traverse(b=>{if(b.isBone&&/^mixamorig\d*RightHand$/.test(b.name))hand=b;if(b.isBone&&/^mixamorig\d*Head$/.test(b.name))head=b;});
  for(const seated of [0,1]){
   root.userData.animate(.1,{seated});applyAttentionGesture(root,1);root.updateMatrixWorld(true);
   const first=hand.getWorldPosition(new THREE.Vector3());assert.ok(first.y>head.getWorldPosition(new THREE.Vector3()).y+.1,path+' must visibly raise the hand');
   root.userData.animate(.1,{seated});applyAttentionGesture(root,1.3);root.updateMatrixWorld(true);
   assert.ok(first.distanceTo(hand.getWorldPosition(new THREE.Vector3()))>.02,'hand must wave');assert.equal(root.userData.animation.gesture,'attention');
   root.traverse(b=>assert.ok(b.matrixWorld.elements.every(Number.isFinite)));
  }
 }
});
test('Mixamo clothes share animated joints, arms leave T-pose and feet stay grounded',async()=>{
 const gltf=await load(),scene=new THREE.Scene(),avatar=buildMixamoPresenter(scene,gltf);
 assert.equal(avatar.userData.presentation.source,'Adobe Mixamo / Leonard (Ch31)');
 assert.equal(avatar.userData.presentation.facialRig,false);
 assert.deepEqual(gltf.animations.map(c=>c.name),['idle','walk','welcome','explain']);
 let skins=0;avatar.traverse(o=>{if(o.isSkinnedMesh)skins++;});assert.equal(skins,7);
 const arm=avatar.getObjectByName('mixamorig9LeftArm'),hand=avatar.getObjectByName('mixamorig9LeftHand');
 avatar.userData.animate(.1);avatar.updateMatrixWorld(true);
 const a=arm.getWorldPosition(new THREE.Vector3()),h=hand.getWorldPosition(new THREE.Vector3());
 assert.ok(h.y<a.y-.3,'idle arm must hang beside the torso, not stay in T-pose');
 const rotations=new Map();
 for(const gesture of ['idle','walk','welcome','explain']){
  let lowest=Infinity,highest=-Infinity;
  for(let frame=0;frame<120;frame++){
   avatar.userData.animate(1/30,{gesture,speed:gesture==='walk'?1:0,speaking:gesture==='explain'});avatar.updateMatrixWorld(true);
   avatar.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));
   const feet=['LeftFoot','RightFoot'].map(n=>avatar.getObjectByName('mixamorig9'+n).getWorldPosition(new THREE.Vector3()).y);
   lowest=Math.min(lowest,...feet);highest=Math.max(highest,Math.min(...feet));
  }
  assert.ok(lowest>-.02&&highest<.2,'support ankle must stay near the floor');rotations.set(gesture,hand.quaternion.clone());
 }
 assert.ok(rotations.get('walk').angleTo(rotations.get('welcome'))>.1);
 assert.equal(avatar.userData.animation.speaking,true);
});

test('all three avatars preserve original finger joints during body animations, seating and attention',async()=>{
 for(const path of ['../assets/avatars/mixamo/presenter.glb','../assets/avatars/client/client.glb','../assets/avatars/collaborator/collaborator.glb']){
 const gltf=await load(path),fingers=[];gltf.scene.traverse(b=>{if(b.isBone&&/Hand(Thumb|Index|Middle|Ring|Pinky)\d$/.test(b.name))fingers.push({bone:b,rest:b.quaternion.clone()});});
 assert.equal(fingers.length,40);
 for(const clip of gltf.animations)assert.ok(clip.tracks.every(track=>! /Hand(Thumb|Index|Middle|Ring|Pinky)/.test(track.name)),'foreign finger axes must not deform the native hand');
 const avatar=buildMixamoPresenter(new THREE.Scene(),gltf);
 for(const gesture of ['idle','walk','welcome','explain'])for(let i=0;i<100;i++){
  avatar.userData.animate(1/30,{gesture,speed:gesture==='walk'?1:0});
  for(const {bone,rest} of fingers)assert.ok(bone.quaternion.angleTo(rest)<1e-6);
 }
 for(const seated of [0,1]){avatar.userData.animate(.1,{seated});applyAttentionGesture(avatar,1.2);for(const {bone,rest} of fingers)assert.ok(bone.quaternion.angleTo(rest)<1e-6);}
 }
});

test('Passive Marker Man has an independent animated body and natural resting arms',async()=>{
 const gltf=await load('../assets/avatars/client/client.glb'),scene=new THREE.Scene();
 const client=buildMixamoPresenter(scene,gltf,{client:true});
 assert.equal(client.userData.presentation.source,'Adobe Mixamo / Passive Marker Man');
 let head,arm,hand;client.traverse(o=>{if(!o.isBone)return;if(/^mixamorig\d*Head$/.test(o.name))head=o;if(/^mixamorig\d*LeftArm$/.test(o.name))arm=o;if(/^mixamorig\d*LeftHand$/.test(o.name))hand=o;});
 assert.ok(head&&arm&&hand);
 assert.equal(client.getObjectByName('MocapGuy_Eyes').visible,true);
 assert.equal(client.getObjectByName('Client · featureless head'),undefined);
 assert.equal(client.getObjectByName('WPP Production · client suit logo'),undefined);
 const before=arm.quaternion.clone();let changed=false;
 for(let i=0;i<180;i++){
  client.userData.animate(1/30,{gesture:'idle'});client.updateMatrixWorld(true);
  client.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));
  changed||=arm.quaternion.angleTo(before)>.0001;
 }
 assert.ok(changed);assert.ok(hand.getWorldPosition(new THREE.Vector3()).y<arm.getWorldPosition(new THREE.Vector3()).y-.3);
 client.userData.seated=1;for(let i=0;i<50;i++)client.userData.animate(1/30);client.updateMatrixWorld(true);assert.equal(client.userData.animation.gesture,'seated');
 const hip=client.getObjectByName('mixamorigHips');assert.ok(Math.abs(hip.getWorldPosition(new THREE.Vector3()).y-.55)<.02);
 client.userData.seated=0;for(let i=0;i<50;i++)client.userData.animate(1/30);client.updateMatrixWorld(true);assert.ok(hip.getWorldPosition(new THREE.Vector3()).y>.9);
 client.traverse(o=>{if(o.isSkinnedMesh&&o.name.startsWith('Client tailored')){const bounds=new THREE.Box3().setFromObject(o);assert.ok([...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite));}});
 const bounds=new THREE.Box3().setFromObject(client);assert.ok(bounds.max.y>1.7&&bounds.max.y<1.9);
});

test('Brian stays seated at the Pasillo 1 workstation with bent knees and finite skin transforms',async()=>{
 const gltf=await load('../assets/avatars/collaborator/collaborator.glb');
 const brian=buildCollaboratorAvatar(new THREE.Scene(),gltf);let hip,leftKnee,leftFoot;
 brian.traverse(o=>{if(/^mixamorig\d*Hips$/.test(o.name))hip=o;if(/^mixamorig\d*LeftLeg$/.test(o.name))leftKnee=o;if(/^mixamorig\d*LeftFoot$/.test(o.name))leftFoot=o;});
 for(let i=0;i<120;i++){brian.userData.animate(1/30);brian.updateMatrixWorld(true);brian.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));}
 const h=hip.getWorldPosition(new THREE.Vector3()),k=leftKnee.getWorldPosition(new THREE.Vector3()),f=leftFoot.getWorldPosition(new THREE.Vector3());
 assert.ok(Math.abs(h.y-.55)<.02);assert.ok(Math.abs(h.y-k.y)<.12);assert.ok(k.y-f.y>.3);assert.ok(f.y>-.05&&f.y<.22);
 assert.equal(brian.userData.animation.gesture,'seated');assert.equal(brian.userData.presentation.source,'Adobe Mixamo / Brian');
});

test('presenter and Brian can use the same seated pose and return to standing',async()=>{
 for(const [path,isBrian] of [['../assets/avatars/mixamo/presenter.glb',false],['../assets/avatars/collaborator/collaborator.glb',true]]){
  const gltf=await load(path),root=isBrian?buildCollaboratorAvatar(new THREE.Scene(),gltf):buildMixamoPresenter(new THREE.Scene(),gltf);
  let hip;root.traverse(o=>{if(o.isBone&&/^mixamorig\d*Hips$/.test(o.name))hip=o;});
  for(let i=0;i<40;i++)root.userData.animate(1/30,{seated:1});root.updateMatrixWorld(true);assert.ok(Math.abs(hip.getWorldPosition(new THREE.Vector3()).y-.55)<.02);
  for(let i=0;i<40;i++)root.userData.animate(1/30,{seated:0});root.updateMatrixWorld(true);assert.ok(hip.getWorldPosition(new THREE.Vector3()).y>.85);
 }
});
