import * as THREE from '../vendor/three.module.js';
import {fitClientWardrobe} from './client-wardrobe.js';
export function prepareNeutralClient(model,wardrobe){
 if(!wardrobe)throw Error('A modelled corporate outfit is required for the client');
 model.updateWorldMatrix(true,true);
 const head=model.getObjectByName('mixamorigHead'),chest=model.getObjectByName('mixamorigSpine2');
 if(!head||!chest)throw Error('Client skeleton is missing its head or chest');
 const skin=new THREE.MeshPhysicalMaterial({name:'Neutral client hands',color:'#c8ccc8',roughness:.63,metalness:0,specularIntensity:.22});
 // Return to the untouched base asset. Only the hands remain visible underneath
 // separately modelled garments; the anatomical body is never used as clothing.
 model.traverse(mesh=>{
  if(!mesh.isMesh)return;mesh.visible=false;
  if(!mesh.isSkinnedMesh||!mesh.name.startsWith('mesh_4')||mesh.material.name==='Reflectors')return;
  const geometry=mesh.geometry.clone(),position=geometry.attributes.position,index=geometry.index,weights=geometry.attributes.skinWeight,joints=geometry.attributes.skinIndex,kept=[];
  const isHand=i=>{let hand=0;for(let j=0;j<4;j++){const name=mesh.skeleton.bones[joints.getComponent(i,j)]?.name||'';if(/Hand/.test(name))hand+=weights.getComponent(i,j);}return hand>.75;};
  for(let i=0;i<(index?.count||position.count);i+=3){const triangle=[0,1,2].map(j=>index?index.getX(i+j):i+j);if(triangle.every(isHand))kept.push(...triangle);}
  if(!kept.length)return;geometry.setIndex(kept);geometry.clearGroups();mesh.geometry=geometry;mesh.material=skin;mesh.visible=true;
 });
 const fitted=fitClientWardrobe(model,wardrobe);
 function attachAt(bone,mesh,point){mesh.position.copy(bone.worldToLocal(model.localToWorld(point)));mesh.quaternion.copy(bone.getWorldQuaternion(new THREE.Quaternion()).invert());bone.add(mesh);mesh.castShadow=mesh.receiveShadow=true;return mesh;}
 const faceGeometry=new THREE.SphereGeometry(1,64,48),p=faceGeometry.attributes.position;
 for(let i=0;i<p.count;i++){const y=p.getY(i),lower=Math.max(0,-y);p.setX(i,p.getX(i)*(1-.23*lower));if(p.getZ(i)>0)p.setZ(i,p.getZ(i)*(1-.12*lower));}faceGeometry.computeVertexNormals();
 const face=new THREE.Mesh(faceGeometry,new THREE.MeshPhysicalMaterial({name:'Featureless neutral face',color:'#c8ccc8',roughness:.58,metalness:0,specularIntensity:.25}));
 face.name='Client · featureless head';face.scale.set(8.2,11.5,8.1);attachAt(head,face,new THREE.Vector3(0,166.0,.3));
 const neck=new THREE.Mesh(new THREE.CylinderGeometry(4.1,4.6,8,32),skin);attachAt(head,neck,new THREE.Vector3(0,151.5,-2));
 let texture=null;if(typeof document!=='undefined'){const canvas=document.createElement('canvas');canvas.width=768;canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#edf1eb';c.fillRect(0,0,768,256);c.fillStyle='#143d3e';c.textAlign='center';c.font='600 110px Arial';c.fillText('WPP',384,115);c.font='500 70px Arial';c.fillText('Production',384,205);texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;}
 const badge=new THREE.Mesh(new THREE.BoxGeometry(13,4.3,.22),new THREE.MeshStandardMaterial({name:'WPP Production chest logo',map:texture,color:'#ffffff',roughness:.68}));badge.name='WPP Production · client suit logo';attachAt(chest,badge,new THREE.Vector3(9,137,fitted.frontZ(9,137)+2));
 model.userData.neutralClient={featureless:true,sourceBrandRemoved:true,logo:'WPP Production',garments:fitted.garments.map(g=>g.name),wardrobe:'Authored Mixamo Leonard garments fitted to Passive Marker Man'};
}
