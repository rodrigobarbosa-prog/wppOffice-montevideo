import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';
import {KTX2Loader} from '../vendor/addons/loaders/KTX2Loader.js';
import {avatarAsset} from './render-profile.js';

let decoder=null,loader=null,compressed=false;
export function configureAvatarAssets(renderer,{original=false}={}){
 decoder?.dispose();decoder=null;loader=new GLTFLoader();
 // UASTC → BC7/ASTC preserves detail much better than legacy DXT/ETC targets.
 // Keep PNGs on hardware without either high quality format.
 compressed=!original&&(renderer.extensions.has('EXT_texture_compression_bptc')||renderer.extensions.has('WEBGL_compressed_texture_astc'));
 if(compressed){decoder=new KTX2Loader().setTranscoderPath(new URL('../vendor/addons/libs/basis/',import.meta.url).href).setWorkerLimit(1).detectSupport(renderer);loader.setKTX2Loader(decoder);}
 return {compressed,dispose(){decoder?.dispose();decoder=null;}};
}
export async function loadAvatarAsset(url){
 const source=avatarAsset(url),active=loader||new GLTFLoader();
 return loadAvatarVariants(path=>active.loadAsync(path),source,{compressed});
}
export async function loadAvatarVariants(load,source,{compressed=false,onFallback=error=>console.warn('Compressed avatar unavailable; using original textures.',error)}={}){
 if(compressed){try{return await load(source.replace(/\.glb$/,'-ktx2.glb'));}catch(error){onFallback(error);}}
 return load(source);
}
