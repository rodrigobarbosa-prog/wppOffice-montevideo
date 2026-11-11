import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createProgressiveAvatars,avatarLoadOrder,prepareAvatar} from '../src/progressive-avatars.js';

test('arrival prioritizes its two visible people; Brian starts with his own character',()=>{
 assert.deepEqual(avatarLoadOrder('client'),['presenter','client','collaborator']);
 assert.equal(avatarLoadOrder('collaborator')[0],'collaborator');
});
test('progressive preparation serializes models, keeps identity and excludes unfinished visuals',async()=>{
 const scene=new THREE.Scene(),events=[];let active=0;
 const factories=Object.fromEntries(['presenter','client','collaborator'].map(role=>[role,async(s,{root})=>{
  assert.equal(++active,1,'never decode two people together');events.push(role);await new Promise(r=>setTimeout(r,2));
  root.add(new THREE.Group());active--;return root;
 }]));
 const loader=createProgressiveAvatars({scene,factories,prepare:async root=>{assert.ok(root.children.every(child=>!child.visible));assert.equal(root.userData.ready,false);}});
 const brian=loader.people.collaborator;brian.position.set(4,0,2);brian.userData.seatId='desk';brian.rotation.y=.7;
 await loader.essentials('client');assert.deepEqual(events,['presenter','client']);assert.equal(brian.userData.ready,false);
 const a=loader.ensure('collaborator'),b=loader.ensure('collaborator');assert.equal(a,b);await a;
 assert.equal(brian,loader.people.collaborator);assert.equal(brian.userData.ready,true);assert.equal(brian.userData.seatId,'desk');assert.equal(brian.position.x,4);assert.equal(brian.rotation.y,.7);
 assert.deepEqual(events,['presenter','client','collaborator']);
});
test('a failed deferred character cleans up and retries without losing navigation state',async()=>{
 let attempts=0,disposed=0;const scene=new THREE.Scene();
 const loader=createProgressiveAvatars({scene,factories:{collaborator:async(s,{root})=>{const geometry=new THREE.BoxGeometry();geometry.addEventListener('dispose',()=>disposed++);root.add(new THREE.Mesh(geometry,new THREE.MeshBasicMaterial()));if(++attempts===1)throw Error('network');return root;}}});
 const root=loader.people.collaborator;root.userData.seatId='seat-19';
 assert.equal(await loader.background(),null);assert.equal(root.children.length,0);assert.equal(disposed,1);
 await loader.ensure('collaborator');assert.ok(root.userData.ready);assert.equal(root.userData.seatId,'seat-19');
});
test('texture uploads are deduplicated and yield between GPU submissions',async()=>{
 const root=new THREE.Group(),map=new THREE.Texture(),normalMap=new THREE.Texture(),events=[];
 for(let i=0;i<2;i++)root.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial({map})));
 root.children[0].material.normalMap=normalMap;
 const renderer={initTexture:t=>events.push(t),compileAsync:async()=>events.push('compile')};
 await prepareAvatar(renderer,root,new THREE.Scene(),new THREE.Camera(),{yieldTask:async()=>events.push('yield')});
 assert.deepEqual(events,[map,'yield',normalMap,'yield','compile']);
});
