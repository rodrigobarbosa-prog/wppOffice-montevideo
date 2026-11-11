import * as THREE from '../vendor/three.module.js';
import {applySeatedPose} from './seated-pose.js';
import {applyAttentionGesture} from './attention-gesture.js';
import {renderProfile} from './render-profile.js';

// Keep the downloaded character's authored clothing, hair geometry and texture colors.
export function buildMixamoPresenter(scene,gltf,{client=false,root=new THREE.Group()}={}){
 root.name=client?'Client · Passive Marker Man':'Presenter · Leonard';
 const visual=new THREE.Group(),model=gltf.scene;visual.add(model);root.add(visual);
 model.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(model),scale=1.8/(box.max.y-box.min.y);
 visual.scale.setScalar(scale);visual.position.y=-box.min.y*scale;
 model.traverse(mesh=>{
  if(!mesh.isMesh)return;
  mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;
  const convert=old=>{
   const hair=old.name.includes('hair');
   const material=new THREE.MeshPhysicalMaterial({name:old.name,color:old.color.clone(),map:old.map,normalMap:old.normalMap,
    roughness:hair?.74:.78,metalness:0,normalScale:new THREE.Vector2(.55,.55),
    envMapIntensity:.65,specularIntensity:hair?.15:.25,sheen:hair?.08:.16,sheenRoughness:.8,
    sheenColor:new THREE.Color('#a8b2bc'),side:hair?THREE.DoubleSide:THREE.FrontSide,
    alphaTest:hair?.38:0,alphaToCoverage:hair,dithering:true});
   for(const texture of [material.map,material.normalMap])if(texture){texture.flipY=false;texture.anisotropy=renderProfile.mobile?2:16;texture.needsUpdate=true;}
   return material;
  };
  mesh.material=Array.isArray(mesh.material)?mesh.material.map(convert):convert(mesh.material);
 });
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(.30,64),new THREE.MeshBasicMaterial({color:'#18232a',transparent:true,opacity:.10,depthWrite:false}));
 shadow.rotation.x=-Math.PI/2;shadow.position.y=.008;root.add(shadow);
 const mixer=new THREE.AnimationMixer(model),actions=Object.fromEntries(gltf.animations.map(clip=>[clip.name,mixer.clipAction(clip)]));
 for(const name of ['idle','walk','welcome','explain'])if(!actions[name])throw new Error('Missing presenter animation: '+name);
 actions.welcome.setLoop(THREE.LoopOnce,1);actions.welcome.clampWhenFinished=true;
 let current='idle',heading=root.rotation.y,phase=0,headYaw=0;
 actions.idle.play();mixer.update(0);
 let head;model.traverse(o=>{if(o.isBone&&/^mixamorig\d*Head$/.test(o.name))head=o;});
 const animatedHead=head?.quaternion.clone();
 const axisY=new THREE.Vector3(0,1,0),world=new THREE.Quaternion(),parentWorld=new THREE.Quaternion(),turn=new THREE.Quaternion();
 root.userData.face=direction=>{heading=direction;root.rotation.y=direction;};
 root.userData.animate=(dt,{speed=0,gesture='idle',lookAt=null,direction=null,speaking=false,seated=root.userData.seated||0}={})=>{
  if(root.userData.welcomeRemaining>0){if(speed<.025)gesture='welcome';root.userData.welcomeRemaining=Math.max(0,root.userData.welcomeRemaining-dt);}
  if(seated>0){speed=0;gesture='idle';}
  phase+=speed*dt*10.2;
  const next=speed>.025?'walk':gesture in actions?gesture:'idle';
  if(next!==current){const blend=next==='welcome'||current==='welcome'?.55:.28;actions[current].fadeOut(blend);actions[next].reset().setEffectiveWeight(1).fadeIn(blend).play();if(next==='welcome')actions[next].setEffectiveTimeScale(.9);current=next;}
  // PropertyMixer can skip writing unchanged keyframes. Restore the authored
  // pose before updating, so procedural looking never accumulates on itself.
  if(head)head.quaternion.copy(animatedHead);
  actions.walk.setEffectiveTimeScale(Math.max(.04,speed/1));mixer.update(dt);
  if(head)animatedHead.copy(head.quaternion);
  if(direction!==null){const delta=Math.atan2(Math.sin(direction-heading),Math.cos(direction-heading));heading+=delta*(1-Math.exp(-dt*6));root.rotation.y=heading;}
  if(head&&lookAt){
   const angle=Math.atan2(lookAt.x-root.position.x,lookAt.z-root.position.z)-heading;
   headYaw=THREE.MathUtils.damp(headYaw,THREE.MathUtils.clamp(Math.atan2(Math.sin(angle),Math.cos(angle)),-.32,.32),5,dt);
   root.updateMatrixWorld(true);head.getWorldQuaternion(world);head.parent.getWorldQuaternion(parentWorld);
   turn.setFromAxisAngle(axisY,headYaw);world.premultiply(turn);head.quaternion.copy(parentWorld.invert().multiply(world));
  }
  root.userData.animation={gesture:next,speed,phase,speaking};applySeatedPose(root,seated);
  applyAttentionGesture(root,(performance.now()-(root.userData.actionUntil||0)+3200)/1000);
 };
 root.userData.presentation={type:'skinned-human',source:client?'Adobe Mixamo / Passive Marker Man':'Adobe Mixamo / Leonard (Ch31)',identity:'authored-mixamo',height:1.8,textureResolution:client?null:4096,facialRig:false,animations:gltf.animations.map(c=>c.name)};
 scene.add(root);return root;
}
