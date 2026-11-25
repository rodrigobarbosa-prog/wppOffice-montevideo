import * as THREE from '../vendor/three.module.js';
import {collaboratorStation} from './office-layout.js';

export function createWorkstationDisplay(scene,{lightEnabled=true}={}){
 const screens=[];
 scene.traverse(mesh=>{if(mesh.isMesh&&mesh.userData.collaboratorScreen)screens.push({mesh,material:mesh.material});});
 const surface=screens[0]?.mesh,screenPosition=surface?.getWorldPosition(new THREE.Vector3());
 let light=null,liveTexture=null,preview=false;
 const liveMaterial=surface?new THREE.MeshBasicMaterial():null;
 if(surface&&lightEnabled){
  const front=new THREE.Vector3(0,0,1).applyQuaternion(surface.getWorldQuaternion(new THREE.Quaternion()));
  light=new THREE.SpotLight('#d3e6ff',1.4,1.55,.72,.68,2);
  light.name='Brian’s monitor light';
  light.position.copy(screenPosition).addScaledVector(front,.05);
  light.target.position.set(collaboratorStation.x,1.16,collaboratorStation.z);
 }
 function updateLight(){
  if(!light)return;
  if(liveTexture||preview){if(!light.parent)scene.add(light,light.target);}
  else if(light.parent){light.removeFromParent();light.target.removeFromParent();}
 }
 return {
  screenPosition,
  get lightOn(){return Boolean(light?.parent);},
  setLiveTexture(texture){
   if(!liveMaterial||texture===liveTexture)return;
   liveTexture=texture;liveMaterial.map=texture;liveMaterial.needsUpdate=true;
   for(const {mesh,material} of screens)mesh.material=texture?liveMaterial:material;
   updateLight();
  },
  setPreview(enabled){preview=enabled;updateLight();},
  dispose(){this.setPreview(false);this.setLiveTexture(null);liveMaterial?.dispose();}
 };
}
