import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {renderProfile} from './render-profile.js';
import {createAdaptiveQuality} from './adaptive-quality.js';
export function createVisuals(renderer,scene,camera,onFallback){
 // Avoid allocating the HDR/MSAA/SSAO buffers at all on mobile. Switching them
 // off after allocation is too late for browsers that terminate a memory-heavy tab.
 if(!renderProfile.postprocessing){
  const quality=()=>{renderer.setPixelRatio(Math.min(devicePixelRatio,renderProfile.pixelRatio));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=false;return false;};quality();
  return {quality,resize(){renderer.setSize(innerWidth,innerHeight);},render(){renderer.setRenderTarget(null);renderer.render(scene,camera);}};
 }
 const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:Math.min(4,renderer.capabilities.maxSamples||0)});
 const composer=new EffectComposer(renderer,target);composer.addPass(new RenderPass(scene,camera));
 const ao=new SSAOPass(scene,camera,innerWidth,innerHeight,16);ao.kernelRadius=.22;ao.minDistance=.002;ao.maxDistance=.16;composer.addPass(ao);composer.addPass(new OutputPass());
 let high=true,level=0;const adaptive=createAdaptiveQuality();
 function resize(){composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(innerWidth,innerHeight);ao.setSize(Math.ceil(innerWidth*renderer.getPixelRatio()*.7),Math.ceil(innerHeight*renderer.getPixelRatio()*.7));}
 function configure(){ao.enabled=high&&level===0;renderer.setPixelRatio(high?Math.min(devicePixelRatio,level>=2?1:1.5):1);renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=high;renderer.shadowMap.needsUpdate=true;resize();}
 function quality(enabled){high=enabled;level=0;adaptive.reset();configure();return high;}
 quality(true);
 // Main loop enables shadow updates while the animated host is visible and playing.
 renderer.shadowMap.autoUpdate=false;
 return {resize,quality,observeFrame(dt,active){const next=high&&adaptive.observe(dt,performance.now(),active&&document.visibilityState==='visible');if(next){level=next;configure();onFallback('balanced');}},render(dt){
  if(high&&ao.enabled){try{composer.render(dt);return;}catch(error){quality(false);onFallback('smooth');console.warn('Modo ligero activado.',error);}}
  renderer.setRenderTarget(null);renderer.autoClear=true;scene.overrideMaterial=null;renderer.render(scene,camera);
 }};
}
