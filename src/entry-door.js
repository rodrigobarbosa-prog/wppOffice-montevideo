import * as THREE from 'three';
import {createEntryDoorState,entryDoorPlan} from './entry-door-state.js';

export function buildEntryDoor({scene,box,cylinder,rounded,label,wood,steel,black,brandMat}){
 const state=createEntryDoorState(),root=new THREE.Group();root.name='Office entrance · interactive';scene.add(root);
 const hinges=[];
 for(const panel of state.panels){
  const hinge=new THREE.Group();hinge.position.set(panel.x,0,panel.z);root.add(hinge);hinges.push(hinge);
  const width=entryDoorPlan.leafWidth,side=panel.side;
  box(width,entryDoorPlan.height,.065,-side*width/2,entryDoorPlan.height/2+.015,0,wood,false,hinge);
  for(const face of [-1,1]){
   const hx=-side*(width-.14);
   for(const y of [.39,1.59])rounded(.025,.025,.055,hx,y,face*.05,steel,hinge,.007);
   cylinder(.012,1.35,hx,.99,face*.085,steel,hinge);
   const rose=cylinder(.026,.012,hx-side*.05,1.0,face*.04,steel,hinge);rose.rotation.x=Math.PI/2;
  }
  if(side<0){
   const badge=new THREE.Mesh(new THREE.PlaneGeometry(.43,.32),brandMat);badge.position.set(width*.37,1.62,.035);hinge.add(badge);
  }
  // Hinges and reader are attached to the moving leaf, not left on the unrelated side bay.
  for(const y of [.32,1.95])cylinder(.014,.10,0,y,.035,steel,hinge);
  if(side>0){
   rounded(.07,.17,.035,-width+.15,1.06,.061,black,hinge,.007);
   const number=label('1401',.15,.10,-width*.24,2.06,.036,0,'#eeeae2','#30374a',170);hinge.add(number);
  }
 }
 function sync(){for(let i=0;i<hinges.length;i++)hinges[i].rotation.y=state.panels[i].angle;}
 sync();
 const actionRay=new THREE.Raycaster(),center=new THREE.Vector2(0,0);
 return {
  aimedAt(camera){camera.updateMatrixWorld();root.updateWorldMatrix(true,true);actionRay.setFromCamera(center,camera);return actionRay.intersectObject(root,true).some(hit=>hit.distance<entryDoorPlan.reach);},
  blocked:(x,z,r)=>state.blocked(x,z,r),
  canInteract:(x,z,yaw)=>state.canInteract(x,z,yaw),
  toggle:()=>state.toggle(),
  applyRemote(snapshot){state.applyRemote(snapshot);sync();},
  update(dt,occupant){const changed=state.update(dt,occupant);if(changed)sync();return changed;},
  get targetOpen(){return state.targetOpen;},
  get obstructed(){return state.obstructed;},
  get angle(){return state.angle;}
 };
}

