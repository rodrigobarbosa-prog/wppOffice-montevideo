import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
import * as THREE from '../vendor/three.module.js';
import {createHostMotion} from '../src/host-motion.js';
import {legPose} from '../src/host-animation.js';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {buildPresenter}=await import('../src/presenter-avatar.js');
const {GLTFLoader}=await import('../vendor/addons/loaders/GLTFLoader.js');

test('host walks out and back, clears obstacles and keeps space from the guest',()=>{
 const blocked=(x,z)=>x<-.35||x>2||z<-.6||z>.6;
 const motion=createHostMotion({x:0,z:0},{x:0,z:2.4},blocked);
 assert.ok(motion.distance>=.8);
 let farthest=0,walking=false;
 const gestures=new Set();
 for(let i=0;i<1800;i++){
  const pose=motion.update(.01);gestures.add(pose.gesture);
  assert.equal(blocked(pose.x,pose.z),false);
  assert.ok(Math.hypot(pose.x,pose.z-2.4)>1.05);
  farthest=Math.max(farthest,Math.hypot(pose.x,pose.z));walking||=pose.speed>.1;
 }
 const end=motion.update(.001);
 assert.ok(farthest>=.8&&walking);assert.ok(Math.hypot(end.x,end.z)<.001);
 assert.ok(gestures.has('welcome')&&gestures.has('explain')&&gestures.has('idle'));
});

test('host stays put and gestures when a safe walking route cannot fit',()=>{
 const motion=createHostMotion({x:0,z:0},{x:0,z:2},(x,z)=>Math.hypot(x,z)>.2);
 assert.equal(motion.distance,0);
 for(let i=0;i<200;i++){
  const pose=motion.update(.12);
  assert.deepEqual([pose.x,pose.z,pose.speed],[0,0,0]);
 }
});

test('leg IK plants the soles during stance and lifts a foot during swing',()=>{
 for(let phase=0;phase<Math.PI*2;phase+=.02){
  const pose=legPose(phase,1,-.035);
  const y=-.405*Math.cos(pose.hip)-.377*Math.cos(pose.hip+pose.knee);
  const z=-.405*Math.sin(pose.hip)-.377*Math.sin(pose.hip+pose.knee);
  assert.ok(Math.abs(y-(-.782+.035+pose.lift))<.0001);
  assert.ok(Math.abs(z-pose.z)<.0001);
  assert.ok(pose.knee>=0&&pose.knee<Math.PI);
  assert.ok(Math.abs(pose.hip+pose.knee+pose.ankle)<.0001);
 }
 assert.equal(legPose(1,1,-.035).lift,0);
 assert.ok(legPose(Math.PI*1.6,1,-.035).lift>.09);
});

test('textured skinned human and facial shapes animate through a full demo without invalid transforms',async()=>{
 const bytes=await readFile(new URL('../assets/avatars/rocketbox/presenter.glb',import.meta.url));
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const scene=new THREE.Scene(),avatar=buildPresenter(scene,gltf);
 let skinned,sprites=0,bones=0;avatar.traverse(o=>{if(o.isSkinnedMesh)skinned=o;if(o.isSprite)sprites++;if(o.isBone)bones++;});
 assert.ok(skinned&&bones>=80);assert.equal(sprites,0);
 assert.equal(Object.keys(skinned.morphTargetDictionary).length,6);
 assert.ok((Array.isArray(skinned.material)?skinned.material:[skinned.material]).every(m=>m.isMeshPhysicalMaterial));
 assert.deepEqual(avatar.userData.presentation.animations,['idle','walk','welcome','explain']);
 let hair;avatar.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.name.includes('opacity'))hair=m;});
 assert.ok(hair);assert.equal(hair.alphaToCoverage,true);assert.ok(hair.alphaTest<.3);
 assert.equal(avatar.userData.presentation.identity,'realistic-reference');
 assert.ok(avatar.userData.presentation.beardMeshes>0);
 avatar.userData.face(.8);assert.equal(avatar.rotation.y,.8);
 avatar.userData.animate(.1,{speaking:true});
 const jaw=Object.entries(skinned.morphTargetDictionary).find(([name])=>name.endsWith('AK_25_JawOpen'))[1];
 assert.ok(skinned.morphTargetInfluences[jaw]>.09);
 avatar.userData.animate(.1,{speaking:false});assert.equal(skinned.morphTargetInfluences[jaw],0);
 const motion=createHostMotion({x:0,z:0},{x:0,z:2.4},()=>false);
 const initial=new THREE.Box3().setFromObject(avatar);
 assert.ok(initial.max.y>1.7&&initial.max.y<1.9);
 let changed=false;const states=new Set();
 const elbow=avatar.getObjectByName('Bip01_L_Forearm'),rest=elbow.quaternion.clone();
 for(let i=0;i<1100;i++){
  const pose=motion.update(1/60);avatar.position.set(pose.x,0,pose.z);
  avatar.userData.animate(1/60,{...pose,lookAt:new THREE.Vector3(0,1.68,2.4)});
  avatar.updateMatrixWorld(true);
  avatar.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));
  changed||=elbow.quaternion.angleTo(rest)>.1;states.add(avatar.userData.animation.gesture);
 }
 assert.ok(changed);assert.ok(avatar.userData.animation.phase>1);
 assert.ok(states.has('walk')&&states.has('welcome')&&states.has('explain'));
});

test('character textures retain 2048px detail and authored clips leave navigation in control',async()=>{
 for(const name of ['body_color','body_normal','head_color','head_normal','opacity_color']){
  const image=await readFile(new URL('../assets/avatars/rocketbox/'+name+'.png',import.meta.url));
  assert.equal(image.readUInt32BE(16),2048);assert.equal(image.readUInt32BE(20),2048);
 }
 const bytes=await readFile(new URL('../assets/avatars/rocketbox/presenter.glb',import.meta.url));
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 for(const clip of gltf.animations){
  const track=clip.tracks.find(t=>t.name==='Bip01.position');assert.ok(track);
  for(let i=0;i<track.values.length;i+=3){assert.equal(track.values[i],0);assert.equal(track.values[i+2],0);}
 }
});
