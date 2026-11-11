import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';
import {buildMixamoPresenter} from './mixamo-presenter.js';

export async function createClientAvatar(scene){
 const gltf=await new GLTFLoader().loadAsync(new URL('../assets/avatars/client/client.glb',import.meta.url).href);
 return buildMixamoPresenter(scene,gltf,{client:true});
}
