import * as THREE from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';
import {preparePresenterIdentity,identityMaterial,addPresenterBeard} from './presenter-identity.js';
import {buildMixamoPresenter} from './mixamo-presenter.js';
import {loadAvatarAsset} from './avatar-assets.js';

const assetRoot=new URL('../assets/avatars/rocketbox/',import.meta.url);
export async function createPresenterAvatar(scene,options={}){
 const gltf=await loadAvatarAsset(new URL('../assets/avatars/mixamo/presenter.glb',import.meta.url));
 return buildMixamoPresenter(scene,gltf,options);
}

// Previous asset retained for comparison and existing regression coverage.
export async function createRocketboxPresenterAvatar(scene){
 const names=['body_color','body_normal','body_specular','head_color','head_normal','head_specular','opacity_color'];
 const loader=new THREE.TextureLoader();
 const [gltf,images]=await Promise.all([
  new GLTFLoader().loadAsync(new URL('presenter.glb',assetRoot).href),
  Promise.all(names.map(name=>loader.loadAsync(new URL(name+'.png',assetRoot).href)))
 ]);
 return buildPresenter(scene,gltf,Object.fromEntries(names.map((name,i)=>[name,images[i]])));
}

// Exported independently so the real skinned asset and animation can be tested without a browser.
export function buildPresenter(scene,gltf,textures={}){
 const root=new THREE.Group();root.name='Presenter · studio human';
 const visual=new THREE.Group();root.add(visual);
 const model=gltf.scene;visual.add(model);
 const identityMeshes=preparePresenterIdentity(model);
 const box=new THREE.Box3().setFromObject(model),scale=1.8/(box.max.y-box.min.y);
 visual.scale.setScalar(scale);visual.position.y=-box.min.y*scale;
 for(const [name,texture] of Object.entries(textures)){
  texture.colorSpace=name.endsWith('color')?THREE.SRGBColorSpace:THREE.NoColorSpace;
  texture.flipY=true;texture.anisotropy=16;
 }
 const morphMeshes=[];
 model.traverse(mesh=>{
  if(!mesh.isMesh)return;
  mesh.castShadow=mesh.receiveShadow=true;
  // Character deformation can extend beyond the bind-pose bounds, especially the greeting.
  mesh.frustumCulled=false;
  const convert=old=>{
   const zone=old.name.includes('opacity')?'opacity':old.name.includes('head')?'head':'body';
   const material=new THREE.MeshPhysicalMaterial({
    name:old.name,color:'#ffffff',map:textures[zone+'_color']||null,
    normalMap:textures[zone+'_normal']||null,
    roughness:zone==='body'?.73:zone==='head'?.59:.58,
    metalness:0,envMapIntensity:zone==='opacity'?1.0:zone==='head'?.9:.75,
    sheen:zone==='body'?.24:zone==='opacity'?.32:0,sheenRoughness:.68,
    sheenColor:new THREE.Color(zone==='opacity'?'#785946':'#c3d4e3'),
    specularIntensity:zone==='head'?.28:zone==='opacity'?.18:.24,
    specularIntensityMap:textures[zone+'_specular']||null,
    clearcoat:0,clearcoatRoughness:.65,
    side:zone==='opacity'?THREE.DoubleSide:THREE.FrontSide,
    alphaTest:zone==='opacity'?.24:0,
    alphaToCoverage:zone==='opacity',dithering:true
   });
   material.normalScale.set(zone==='head'?.42:.55,zone==='head'?-.42:-.55);
   if(zone==='opacity')material.shadowSide=THREE.FrontSide;
   identityMaterial(material,zone);
   return material;
  };
  mesh.material=Array.isArray(mesh.material)?mesh.material.map(convert):convert(mesh.material);
  if(mesh.morphTargetDictionary)morphMeshes.push(mesh);
 });
 const beardMeshes=addPresenterBeard(identityMeshes);
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(.30,64),new THREE.MeshBasicMaterial({color:'#18232a',transparent:true,opacity:.10,depthWrite:false}));
 shadow.rotation.x=-Math.PI/2;shadow.position.y=.008;root.add(shadow);
 const mixer=new THREE.AnimationMixer(model);
 const actions=Object.fromEntries(gltf.animations.map(clip=>[clip.name,mixer.clipAction(clip)]));
 for(const name of ['idle','walk','welcome','explain'])if(!actions[name])throw new Error('Missing presenter animation: '+name);
 actions.welcome.setLoop(THREE.LoopOnce,1);actions.welcome.clampWhenFinished=true;
 let current='idle',heading=0,clock=0,phase=0,headYaw=0;
 actions.idle.play();mixer.update(0);
 root.userData.face=direction=>{heading=direction;root.rotation.y=direction;};
 const head=model.getObjectByName('Bip01_Head');
 const axisY=new THREE.Vector3(0,1,0),world=new THREE.Quaternion(),parentWorld=new THREE.Quaternion(),turn=new THREE.Quaternion();
 function morph(suffix,value){
  for(const mesh of morphMeshes){
   const entry=Object.keys(mesh.morphTargetDictionary).find(n=>n.endsWith(suffix));
   if(entry!==undefined)mesh.morphTargetInfluences[mesh.morphTargetDictionary[entry]]=value;
  }
 }
 root.userData.animate=(dt,{speed=0,gesture='idle',lookAt=null,direction=null,speaking=false}={})=>{
  clock+=dt;phase+=speed*dt*10.2;
  const next=speed>.025?'walk':gesture in actions?gesture:'idle';
  if(next!==current){
   actions[current].fadeOut(.28);
   actions[next].reset().setEffectiveWeight(1).fadeIn(.28).play();current=next;
  }
  actions.walk.setEffectiveTimeScale(Math.max(.04,speed/1.0));
  mixer.update(dt);
  if(direction!==null){
   const delta=Math.atan2(Math.sin(direction-heading),Math.cos(direction-heading));
   heading+=delta*(1-Math.exp(-dt*6));root.rotation.y=heading;
  }
  // Small gaze adjustments are added after the authored body animation.
  if(head&&lookAt){
   const targetAngle=Math.atan2(lookAt.x-root.position.x,lookAt.z-root.position.z)-heading;
   const target=THREE.MathUtils.clamp(Math.atan2(Math.sin(targetAngle),Math.cos(targetAngle)),-.32,.32);
   headYaw=THREE.MathUtils.damp(headYaw,target,5,dt);
   root.updateMatrixWorld(true);
   head.getWorldQuaternion(world);head.parent.getWorldQuaternion(parentWorld);
   turn.setFromAxisAngle(axisY,headYaw);world.premultiply(turn);
   head.quaternion.copy(parentWorld.invert().multiply(world));
  }
  const blinkTime=clock%4.1;
  const blink=blinkTime>3.92?Math.max(0,1-Math.abs(blinkTime-4.01)/.09):0;
  morph('AK_09_EyeBlinkLeft',blink);morph('AK_10_EyeBlinkRight',blink);
  const smile=(speaking?.17:.27)+.035*Math.sin(clock*.7);
  morph('AK_44_MouthSmileLeft',smile);morph('AK_45_MouthSmileRight',smile);
  morph('AK_25_JawOpen',speaking?.10+.12*Math.max(0,Math.sin(clock*15.7))+.035*Math.sin(clock*29)**2:0);
  morph('AK_03_BrowInnerUp',gesture==='welcome'?.08:.025);
  root.userData.animation={gesture:next,speed,phase,speaking};
 };
 root.userData.presentation={type:'skinned-human',source:'Microsoft Rocketbox / Male Adult 08',identity:'realistic-reference',beardMeshes:beardMeshes.length,height:1.8,textureResolution:2048,animations:gltf.animations.map(c=>c.name)};
 scene.add(root);return root;
}

