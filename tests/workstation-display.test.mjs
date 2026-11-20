import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {collaboratorStation} from '../src/office-layout.js';
import {createWorkstationDisplay} from '../src/workstation-display.js';

for(const lightEnabled of [true,false]){
 test('a shared screen restores its idle material and '+(lightEnabled?'lights Brian only while active':'adds no light on mobile'),()=>{
  const scene=new THREE.Scene(),desk=new THREE.Group();
  desk.position.set(collaboratorStation.x+.8,0,collaboratorStation.z-.24);
  desk.rotation.y=-Math.PI/2;scene.add(desk);
  const idle=new THREE.MeshBasicMaterial(),screen=new THREE.Mesh(new THREE.PlaneGeometry(.48,.275),idle);
  screen.position.y=1.065;screen.userData.collaboratorScreen=true;desk.add(screen);
  const display=createWorkstationDisplay(scene,{lightEnabled});
  const texture=new THREE.Texture(),later=new THREE.Texture();
  assert.equal(display.lightOn,false);
  display.setLiveTexture(texture);
  assert.equal(screen.material.map,texture);
  assert.equal(display.lightOn,lightEnabled);
  const active=screen.material;
  if(lightEnabled){
   const light=scene.children.find(child=>child.isSpotLight);
   assert.ok(light.position.x<desk.position.x);
   assert.equal(light.target.position.x,collaboratorStation.x);
   assert.equal(light.castShadow,false);
  }
  display.setLiveTexture(later);
  assert.equal(screen.material,active);
  assert.equal(screen.material.map,later);
  display.setLiveTexture(null);
  assert.equal(screen.material,idle);
  assert.equal(display.lightOn,false);
  display.setPreview(true);
  assert.equal(display.lightOn,lightEnabled);
  assert.equal(screen.material,idle);
  display.dispose();
  assert.equal(display.lightOn,false);
 });
}
