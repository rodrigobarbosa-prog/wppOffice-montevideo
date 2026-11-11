import * as THREE from '../vendor/three.module.js';

const smooth=(a,b,x)=>THREE.MathUtils.smoothstep(x,a,b);
export function beardCoverage(x,y,z){
 const ax=Math.abs(x),front=smooth(4.8,8.4,z),jaw=smooth(152.5,155.3,y)*(1-smooth(160.0,161.3,y));
 const cheek=smooth(3.0,4.7,ax)*(1-smooth(6.8,8.4,ax))*smooth(155.4,158.4,y)*(1-smooth(165.0,167.0,y));
 const chin=(1-smooth(3.5,5.4,ax))*smooth(153.6,155.4,y)*(1-smooth(159.3,160.2,y));
 const moustache=(1-smooth(2.8,3.6,ax))*smooth(162.8,163.5,y)*(1-smooth(164.7,165.5,y))*smooth(10.5,12.0,z);
 // Keep the lips and mouth opening clear; cheek and chin regions join naturally.
 return Math.min(.93,Math.max(jaw*.76,cheek*.83,chin*.91)*front+moustache*.90);
}

function stubbleTexture(){
 const size=512,data=new Uint8Array(size*size*4);let seed=74191;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<size*size;i++){
  const shade=.70+random()*.46;
  data[i*4]=Math.round(69*shade);data[i*4+1]=Math.round(48*shade);data[i*4+2]=Math.round(36*shade);
  data[i*4+3]=Math.round(150+random()*105);
 }
 const map=new THREE.DataTexture(data,size,size);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=16;map.needsUpdate=true;return map;
}

// Original geometry is retained; all additions share the existing skeleton/morphs.
export function preparePresenterIdentity(model){
 model.updateMatrixWorld(true);
 const originals=[];model.traverse(o=>{if(o.isSkinnedMesh)originals.push(o);});
 const point=new THREE.Vector3(),inverse=new THREE.Matrix4();
 for(const mesh of originals){
  const name=mesh.material.name||'';
  if(name.includes('opacity')){
   mesh.geometry=mesh.geometry.clone();const p=mesh.geometry.attributes.position;
   inverse.copy(mesh.matrixWorld).invert();
   for(const i of new Set(mesh.geometry.index.array)){
    point.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);
    const crown=smooth(173.5,181,point.y),sweep=(1-smooth(-5,5,point.x));
    point.y+=crown*(1.45+.55*sweep);
    point.x=point.x*(1+.06*crown)-crown*.75;
    point.z+=crown*.55;
    point.applyMatrix4(inverse);p.setXYZ(i,point.x,point.y,point.z);
   }
   p.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();
   mesh.boundingBox=null;mesh.boundingSphere=null;
  }
  if(name.includes('body')){
   mesh.geometry=mesh.geometry.clone();const p=mesh.geometry.attributes.position,tint=new Float32Array(p.count*4);
   const white=new THREE.Color('#f1eee7'),navy=new THREE.Color('#243655'),blue=new THREE.Color('#9abce9');
   for(let i=0;i<p.count;i++){
    point.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);
    const shoe=1-smooth(10.7,13.0,point.y),trouser=point.y<99&&Math.abs(point.x)<23;
    const colour=shoe>.01?white:trouser?navy:blue;
    tint.set([colour.r,colour.g,colour.b,shoe>.01?shoe:trouser?.38:Math.abs(point.x)<35&&point.y>100?.12:0],i*4);
   }
   mesh.geometry.setAttribute('identityTint',new THREE.BufferAttribute(tint,4));
  }
 }
 return originals;
}

export function identityMaterial(material,zone){
 material.onBeforeCompile=shader=>{
  if(zone==='body'){
   shader.vertexShader='attribute vec4 identityTint; varying vec4 vIdentityTint;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvIdentityTint=identityTint;');
   shader.fragmentShader='varying vec4 vIdentityTint;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat identityLuminance=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));\ndiffuseColor.rgb=mix(diffuseColor.rgb,vIdentityTint.rgb*(.92+.08*identityLuminance),vIdentityTint.a);');
  }
  if(zone==='head'){
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    #ifdef USE_MAP
    float irisRadius=length((vMapUv-vec2(.264,.068))*vec2(1.,1.));
    float irisMask=(1.-smoothstep(.018,.026,irisRadius))*smoothstep(.004,.009,irisRadius);
    float irisLight=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.24,.105,.035)*(.45+irisLight*2.),irisMask*.72);
    #endif`);
  }
 };
 material.customProgramCacheKey=()=>`reference-identity-${zone}-v1`;
}

export function addPresenterBeard(originals){
 const map=stubbleTexture(),material=new THREE.MeshPhysicalMaterial({name:'Reference · short brown beard',map,vertexColors:true,transparent:true,depthWrite:false,roughness:.88,metalness:0,sheen:.12,sheenColor:new THREE.Color('#79614d'),polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const beardMeshes=[],worldPoint=new THREE.Vector3();
 for(const mesh of originals.filter(o=>o.material.name.includes('head'))){
  const geometry=mesh.geometry.clone(),p=geometry.attributes.position,n=geometry.attributes.normal,colours=new Float32Array(p.count*4);
  let covered=0;
  for(const i of new Set(geometry.index.array)){
   worldPoint.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);
   const alpha=beardCoverage(worldPoint.x,worldPoint.y,worldPoint.z);
   colours.set([1,1,1,alpha],i*4);if(alpha>.1)covered++;
   // Half a millimetre of physical lift avoids z-fighting without a floating shell.
   p.setXYZ(i,p.getX(i)+n.getX(i)*.045,p.getY(i)+n.getY(i)*.045,p.getZ(i)+n.getZ(i)*.045);
  }
  if(covered<12){geometry.dispose();continue;}
  geometry.setAttribute('color',new THREE.BufferAttribute(colours,4));
  const beard=new THREE.SkinnedMesh(geometry,material);beard.name='Reference beard · '+mesh.name;
  beard.position.copy(mesh.position);beard.quaternion.copy(mesh.quaternion);beard.scale.copy(mesh.scale);
  beard.bind(mesh.skeleton,mesh.bindMatrix);beard.bindMode=mesh.bindMode;
  beard.morphTargetDictionary=mesh.morphTargetDictionary;beard.morphTargetInfluences=mesh.morphTargetInfluences;
  beard.frustumCulled=false;beard.castShadow=false;beard.renderOrder=2;mesh.parent.add(beard);beardMeshes.push(beard);
 }
 return beardMeshes;
}
