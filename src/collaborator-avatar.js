import * as THREE from '../vendor/three.module.js';
import {loadAvatarAsset} from './avatar-assets.js';
import {buildMixamoPresenter} from './mixamo-presenter.js';
import {collaboratorStation} from './office-layout.js';

export async function createCollaboratorAvatar(scene,options={}){
 const gltf=await loadAvatarAsset(new URL('../assets/avatars/collaborator/collaborator.glb',import.meta.url));
 return buildCollaboratorAvatar(scene,gltf,options);
}
export function buildCollaboratorAvatar(scene,gltf,options={}){
 const root=buildMixamoPresenter(scene,gltf,options);
 root.name='Collaborator · Brian';root.userData.presentation.source='Adobe Mixamo / Brian';
 if(!options.root){root.userData.seated=1;root.position.set(collaboratorStation.x,0,collaboratorStation.z);root.userData.face(collaboratorStation.yaw);}
 root.userData.animate(0);
 return root;
}
