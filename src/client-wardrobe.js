import * as THREE from '../vendor/three.module.js';
import {mergeVertices} from '../vendor/addons/utils/BufferGeometryUtils.js';
const key=name=>name.replace(/^mixamorig\d*/,'').replace(/__skin\d+$/,'');
// Fit actual authored garment meshes to the original client's bind skeleton.
// Each garment keeps its own topology, UVs, fabric maps and skin weights.
export function fitClientWardrobe(model,wardrobe){
 model.updateWorldMatrix(true,true);wardrobe.updateMatrixWorld(true);
 const primary=new Map();model.traverse(o=>{if(o.isBone&&!o.name.includes('__skin'))primary.set(key(o.name),o);});
 const inverseModel=model.matrixWorld.clone().invert(),rests=new Map([...primary].map(([name,bone])=>[name,new THREE.Matrix4().multiplyMatrices(inverseModel,bone.matrixWorld)]));
 const names=new Set(['Ch31_Pants','Ch31_Sweater','Ch31_Collar','Ch31_Shoes']),garments=[];
 wardrobe.traverse(mesh=>{
  if(!mesh.isSkinnedMesh)return;let owner=mesh;while(owner&&!names.has(owner.name))owner=owner.parent;if(!owner)return;
  const geometry=mesh.geometry.clone(),position=geometry.attributes.position,normal=geometry.attributes.normal,indices=geometry.attributes.skinIndex,weights=geometry.attributes.skinWeight;
  const transforms=mesh.skeleton.bones.map((bone,i)=>new THREE.Matrix4().multiplyMatrices(rests.get(key(bone.name))||rests.get('Hips'),mesh.skeleton.boneInverses[i]));
  const v=new THREE.Vector3(),n=new THREE.Vector3(),p=new THREE.Vector3(),sum=new THREE.Vector3(),sumNormal=new THREE.Vector3(),matrixNormal=new THREE.Matrix3();
  for(let i=0;i<position.count;i++){
   v.fromBufferAttribute(position,i).applyMatrix4(mesh.bindMatrix);n.fromBufferAttribute(normal,i);sum.set(0,0,0);sumNormal.set(0,0,0);
   for(let j=0;j<4;j++){
    const weight=weights.getComponent(i,j);if(!weight)continue;const transform=transforms[indices.getComponent(i,j)];
    sum.addScaledVector(p.copy(v).applyMatrix4(transform),weight);matrixNormal.getNormalMatrix(transform);sumNormal.addScaledVector(p.copy(n).applyMatrix3(matrixNormal),weight);
   }
   position.setXYZ(i,sum.x,sum.y,sum.z);sumNormal.normalize();normal.setXYZ(i,sumNormal.x,sumNormal.y,sumNormal.z);
  }
  position.needsUpdate=normal.needsUpdate=true;geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const materials=(Array.isArray(mesh.material)?mesh.material:[mesh.material]).map(original=>{
   const material=new THREE.MeshPhysicalMaterial({name:'Client garment · '+owner.name,color:original.color,map:original.map,normalMap:original.normalMap,roughness:owner.name==='Ch31_Shoes'?.55:.83,metalness:0,sheen:.18,sheenRoughness:.8,specularIntensity:.18});
   if(material.map){material.map.flipY=false;material.map.anisotropy=8;}if(material.normalMap){material.normalMap.flipY=false;material.normalScale.set(.45,.45);}return material;
  });
  const garment=new THREE.SkinnedMesh(geometry,materials.length===1?materials[0]:materials);garment.name='Client tailored '+owner.name;garment.castShadow=garment.receiveShadow=true;garment.frustumCulled=false;model.add(garment);garment.updateWorldMatrix(true,false);
  const bones=mesh.skeleton.bones.map(b=>primary.get(key(b.name))||primary.get('Hips'));garment.bind(new THREE.Skeleton(bones),garment.matrixWorld.clone());garments.push(garment);
 });
 if(garments.length<4)throw Error('The corporate wardrobe is incomplete');
 const sweater=garments.find(g=>g.name.endsWith('Ch31_Sweater'));
 const frontZ=(x,y)=>{const p=sweater.geometry.attributes.position;let best=Infinity,z=10;for(let i=0;i<p.count;i++){const score=(p.getX(i)-x)**2+(p.getY(i)-y)**2;if(p.getZ(i)>0&&score<best){best=score;z=p.getZ(i);}}return z;};
 function skinMesh(geometry,material,name){
  const p=geometry.attributes.position,base=sweater.geometry.attributes.position,baseJoints=sweater.geometry.attributes.skinIndex,baseWeights=sweater.geometry.attributes.skinWeight,indices=[],weights=[];
  for(let i=0;i<p.count;i++){let nearest=0,best=Infinity;for(let j=0;j<base.count;j++){const score=(base.getX(j)-p.getX(i))**2+(base.getY(j)-p.getY(i))**2+(base.getZ(j)-p.getZ(i))**2;if(score<best){best=score;nearest=j;}}for(let j=0;j<4;j++){indices.push(baseJoints.getComponent(nearest,j));weights.push(baseWeights.getComponent(nearest,j));}}
  geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));const mesh=new THREE.SkinnedMesh(geometry,material);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;model.add(mesh);mesh.updateWorldMatrix(true,false);mesh.bind(sweater.skeleton,sweater.bindMatrix.clone());garments.push(mesh);return mesh;
 }
 function panel(points,offset,thickness,material,name){
  const vertices=[],surface=[];
  function triangle(a,b,c,depth=0){const edges=[[a,b,c],[b,c,a],[c,a,b]],longest=edges.sort((u,v)=>Math.hypot(v[0][0]-v[1][0],v[0][1]-v[1][1])-Math.hypot(u[0][0]-u[1][0],u[0][1]-u[1][1]))[0];if(depth<6&&Math.hypot(longest[0][0]-longest[1][0],longest[0][1]-longest[1][1])>3){const [u,v,w]=longest,m=[(u[0]+v[0])/2,(u[1]+v[1])/2];triangle(u,m,w,depth+1);triangle(m,v,w,depth+1);return;}surface.push([a,b,c]);}
  for(const tri of THREE.ShapeUtils.triangulateShape(points.map(p=>new THREE.Vector2(...p)),[]))triangle(...tri.map(i=>points[i]));
  for(const tri of surface){for(const [x,y] of tri)vertices.push(x,y,frontZ(x,y)+offset);for(const [x,y] of [...tri].reverse())vertices.push(x,y,frontZ(x,y)+offset-thickness);}
  for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],steps=Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/2);for(let j=0;j<steps;j++){const u=[a[0]+(b[0]-a[0])*j/steps,a[1]+(b[1]-a[1])*j/steps],v=[a[0]+(b[0]-a[0])*(j+1)/steps,a[1]+(b[1]-a[1])*(j+1)/steps];for(const [p,d] of [[u,0],[v,0],[v,1],[u,0],[v,1],[u,1]])vertices.push(p[0],p[1],frontZ(...p)+offset-thickness*d);}}
  let geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry=mergeVertices(geometry,.0001);geometry.computeVertexNormals();return skinMesh(geometry,material,name);
 }
 const jacketMaterial=new THREE.MeshPhysicalMaterial({name:'Tailored navy lapel fabric',color:'#0b1019',side:THREE.DoubleSide,roughness:.82,sheen:.22,sheenRoughness:.9,specularIntensity:.16});
 const shirtMaterial=new THREE.MeshStandardMaterial({name:'Separate cotton shirt front',color:'#e2e7e7',side:THREE.DoubleSide,roughness:.92});
 panel([[-5,148],[-5,133],[0,117],[5,133],[5,148]],1.8,.18,shirtMaterial,'Client · cotton shirt front');
 for(const side of [-1,1]){
  panel([[side*5,148],[side*15,140],[side*12,136],[side*15,133],[side*2.2,115],[side*.7,123]],1.45,.42,jacketMaterial,'Client · tailored lapel '+side);
  panel([[side*5,113],[side*15,113],[side*15,111.8],[side*5,111.8]],.55,.30,jacketMaterial,'Client · welt pocket '+side);
 }
 const buttonMaterial=new THREE.MeshStandardMaterial({name:'Jacket buttons',color:'#101820',roughness:.42});
 for(const y of [109,103]){const geometry=new THREE.SphereGeometry(.65,16,12);geometry.scale(1,1,.45);geometry.translate(1.8,y,frontZ(1.8,y)+.65);skinMesh(geometry,buttonMaterial,'Client · jacket button');}
 for(const side of ['Left','Right']){
  const wrist=new THREE.Vector3().setFromMatrixPosition(rests.get(side+'Hand')),elbow=new THREE.Vector3().setFromMatrixPosition(rests.get(side+'ForeArm')),direction=elbow.sub(wrist).normalize();
  const geometry=new THREE.CylinderGeometry(4.4,4.0,10,32,4);geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction));geometry.translate(...wrist.clone().addScaledVector(direction,4).toArray());
  const cuff=skinMesh(geometry,jacketMaterial,'Client · tailored cuff '+side),joints=cuff.geometry.attributes.skinIndex,weights=cuff.geometry.attributes.skinWeight,handIndex=sweater.skeleton.bones.indexOf(primary.get(side+'Hand'));
  for(let i=0;i<joints.count;i++){joints.setXYZW(i,handIndex,0,0,0);weights.setXYZW(i,1,0,0,0);}joints.needsUpdate=weights.needsUpdate=true;
 }
 return {garments,primary,rests,frontZ};
}
