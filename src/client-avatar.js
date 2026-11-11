import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';
import {buildMixamoPresenter} from './mixamo-presenter.js';
import {avatarAsset} from './render-profile.js';

export async function createClientAvatar(scene){
 const gltf=await new GLTFLoader().loadAsync(avatarAsset(new URL('../assets/avatars/client/client.glb',import.meta.url)));
 return buildMixamoPresenter(scene,gltf,{client:true});
}
