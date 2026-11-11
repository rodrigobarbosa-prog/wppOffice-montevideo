import {loadAvatarAsset} from './avatar-assets.js';
import {buildMixamoPresenter} from './mixamo-presenter.js';

export async function createClientAvatar(scene,options={}){
 const gltf=await loadAvatarAsset(new URL('../assets/avatars/client/client.glb',import.meta.url));
 return buildMixamoPresenter(scene,gltf,{...options,client:true});
}
