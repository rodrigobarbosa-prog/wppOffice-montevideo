import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
export function createVisuals(renderer,scene,camera,onFallback){
 const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:Math.min(4,renderer.capabilities.maxSamples||0)});
 const composer=new EffectComposer(renderer,target);composer.addPass(new RenderPass(scene,camera));
 const ao=new SSAOPass(scene,camera,innerWidth,innerHeight,16);ao.kernelRadius=.22;ao.minDistance=.002;ao.maxDistance=.16;composer.addPass(ao);composer.addPass(new OutputPass());
 let high=true;
 function resize(){composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(innerWidth,innerHeight);ao.setSize(Math.ceil(innerWidth*renderer.getPixelRatio()*.7),Math.ceil(innerHeight*renderer.getPixelRatio()*.7));}
 function quality(enabled){high=enabled;renderer.setPixelRatio(enabled?Math.min(Math.max(devicePixelRatio,1.35),2):1);renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=enabled;renderer.shadowMap.needsUpdate=true;resize();}
 quality(true);
 // Main loop enables shadow updates while the animated host is visible and playing.
 renderer.shadowMap.autoUpdate=false;
 return {resize,quality,render(dt){
  if(high){try{composer.render(dt);return;}catch(error){quality(false);onFallback();console.warn('Modo ligero activado.',error);}}
  renderer.setRenderTarget(null);renderer.autoClear=true;scene.overrideMaterial=null;renderer.render(scene,camera);
 }};
}
