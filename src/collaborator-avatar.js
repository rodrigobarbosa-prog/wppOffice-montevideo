import * as THREE from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';
import {buildMixamoPresenter} from './mixamo-presenter.js';
import {collaboratorStation} from './office-layout.js';
import {avatarAsset} from './render-profile.js';

export async function createCollaboratorAvatar(scene){
 const gltf=await new GLTFLoader().loadAsync(avatarAsset(new URL('../assets/avatars/collaborator/collaborator.glb',import.meta.url)));
 return buildCollaboratorAvatar(scene,gltf);
}
export function buildCollaboratorAvatar(scene,gltf){
 const root=buildMixamoPresenter(scene,gltf),animate=root.userData.animate;
 root.name='Collaborator · Brian';root.userData.presentation.source='Adobe Mixamo / Brian';
 root.userData.seated=1;
 root.position.set(collaboratorStation.x,0,collaboratorStation.z);root.userData.face(collaboratorStation.yaw);root.userData.animate(0);
 return root;
}
