import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {renderProfile} from './render-profile.js';
import {registerPlanarReflection} from './planar-reflections.js';
// The articulated cabin is separate from the office's static geometry batch.
export function buildArrivalLift(scene,steel){
 const group=new THREE.Group();group.name='Arrival lift C14 · mirrored cabin';scene.add(group);
 const metal=steel.clone();metal.color.set('#b5b3a8');metal.roughness=.64;
 const dark=new THREE.MeshStandardMaterial({color:'#263035',roughness:.75}),chrome=new THREE.MeshStandardMaterial({color:'#c5cccb',metalness:1,roughness:.24}),stone=new THREE.MeshStandardMaterial({color:'#757875',roughness:.63}),warm=new THREE.MeshStandardMaterial({color:'#fff7df',emissive:'#fff3d4',emissiveIntensity:1.2});
 function box(w,h,d,x,y,z,material=metal){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;}
 function rail(length,x,y,z,axis){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,length,24),chrome);if(axis==='x')mesh.rotation.z=Math.PI/2;else mesh.rotation.x=Math.PI/2;mesh.position.set(x,y,z);group.add(mesh);return mesh;}
 box(2.1,.06,2.2,0,-.02,3.65,dark);
 for(const x of [-.505,.505])for(const z of [3.1,4.18])box(1.003,.012,1.065,x,.016,z,stone);
 box(.08,2.55,2.2,-1.05,1.275,3.65);box(.08,2.55,2.2,1.05,1.275,3.65);box(2.1,2.55,.07,0,1.275,4.72);
 for(const x of [-1.001,1.001]){
  box(.012,.17,2.1,x,.12,3.65,chrome);
  for(const z of [2.85,3.6,4.36])box(.015,2.26,.012,x,1.36,z,dark);
  box(.012,2.22,.018,x,1.35,4.59,chrome);
  box(.014,2.12,.014,x*.992,1.4,4.56,warm);
  rail(1.5,x*.94,.97,3.8,'z');
  for(const z of [3.15,4.43])box(.065,.035,.035,x*.97,.97,z,chrome);
 }
 box(2.1,.08,2.2,0,2.55,3.65,dark);box(1.98,.025,2.08,0,2.495,3.65,metal);
 box(1.65,.018,1.45,0,2.465,3.65,warm);
 for(const x of [-.9,.9])box(.012,.018,1.9,x,2.46,3.65,warm);
 const light=new THREE.PointLight('#fff2df',5,5,2);light.position.set(0,2.28,3.65);group.add(light);
 // Real planar reflections, with other mirrors hidden during each reflection pass.
 function mirror(w,h,x,y,z,rotation){
  const object=new Reflector(new THREE.PlaneGeometry(w,h),{color:0xe4e9e7,textureWidth:renderProfile.mirrorWidth,textureHeight:renderProfile.mirrorHeight,clipBias:.003,multisample:renderProfile.mirrorSamples});
  object.name='Cabin mirror';object.position.set(x,y,z);object.rotation.y=rotation;group.add(object);
  return registerPlanarReflection(scene,object,{mobile:renderProfile.mobile,maxDistance:renderProfile.mobile?5:12});
 }
 box(1.86,1.77,.025,0,1.48,4.668,chrome);mirror(1.80,1.71,0,1.48,4.651,Math.PI);
 box(.025,1.77,1.45,1.0,1.48,3.78,chrome);mirror(1.39,1.71,.983,1.48,3.78,-Math.PI/2);
 rail(1.65,0,.97,4.59,'x');for(const x of [-.72,.72])box(.035,.035,.065,x,.97,4.63,chrome);
 // Side-mounted operating panel: tactile buttons, bell and emergency call.
 box(.025,.76,.21,.976,1.19,3.02,dark);
 for(let i=0;i<5;i++){const button=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.012,24),chrome);button.rotation.z=Math.PI/2;button.position.set(.956,.91+i*.125,3.02);group.add(button);}
 const selected=new THREE.Mesh(new THREE.TorusGeometry(.022,.003,8,32),warm);selected.rotation.y=Math.PI/2;selected.position.set(.948,1.41,3.02);group.add(selected);
 for(const x of [-.96,.96])box(.13,2.4,.22,x,1.2,2.60,chrome);
 box(2.05,.18,.22,0,2.34,2.60,chrome);box(1.82,.035,.25,0,.026,2.58,dark);
 for(const z of [2.51,2.57,2.63])box(1.8,.005,.009,0,.046,z,chrome);
 const doorMetal=metal.clone();doorMetal.roughness=.35;doorMetal.metalness=.92;
 const leaves=[box(.899,2.22,.07,-.45,1.11,2.67,doorMetal),box(.899,2.22,.07,.45,1.11,2.67,doorMetal)];
 for(const [i,leaf] of leaves.entries()){
  const edge=new THREE.Mesh(new THREE.BoxGeometry(.008,2.20,.012),chrome);edge.position.set((i?-.443:.443),0,.040);leaf.add(edge);
  const reveal=new THREE.Mesh(new THREE.BoxGeometry(.005,2.18,.009),dark);reveal.position.set((i?-.449:.449),0,.041);leaf.add(reveal);
 }
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 box(.78,.21,.02,0,2.32,2.718,dark);
 const display=new THREE.Mesh(new THREE.PlaneGeometry(.72,.18),new THREE.MeshBasicMaterial({map:texture}));display.position.set(0,2.32,2.734);group.add(display);
 let open=0,lastDisplay='';
 return {group,set(value,floorNumber=10,{phase='boarding',rideProgress=0}={}){
  open=value;leaves.forEach((leaf,i)=>leaf.position.x=(i?1:-1)*(.45+value*.91));
  const key=floorNumber+':'+phase+':'+Math.floor(rideProgress*40);
  if(key!==lastDisplay){lastDisplay=key;ctx.fillStyle='#101c20';ctx.fillRect(0,0,1024,256);ctx.textAlign='left';ctx.fillStyle='#9eafa7';ctx.font='500 28px sans-serif';ctx.fillText(phase==='rising'?'ASCENDING':'MONTEVIDEO',45,55);ctx.fillStyle='#c7f6df';ctx.font='400 140px sans-serif';ctx.fillText(String(floorNumber).padStart(2,'0'),40,205);ctx.font='400 28px sans-serif';ctx.fillStyle='#adc3b7';ctx.fillText('WPP PRODUCTION',340,100);ctx.fillText(phase==='opening'||phase==='exiting'?'WELCOME':'FLOOR 14',340,147);
   ctx.fillStyle='#2b413c';ctx.fillRect(340,181,580,4);ctx.fillStyle='#9de3c0';ctx.fillRect(340,181,580*(phase==='boarding'?0:rideProgress),4);texture.needsUpdate=true;
  }
 },blocks(x,z,r=.24){return open<.96&&Math.abs(x)<.95+r&&Math.abs(z-2.67)<.065+r;}};
}
