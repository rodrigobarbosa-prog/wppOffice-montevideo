import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {primaryVisitAction,setupAvatarInteractions} from '../src/avatar-interactions.js';
import {setupSeatInteractions} from '../src/seat-interactions.js';
function element(){return {hidden:true,disabled:false,textContent:'',dataset:{},style:{},events:{},addEventListener(type,fn){this.events[type]=fn;},matches:()=>false,contains:()=>false,setAttribute(){},focus(){document.activeElement=this;},click(){this.onclick?.();}};}
function ui(){const nodes=new Map();globalThis.document={activeElement:null,getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);},addEventListener(){}};globalThis.innerWidth=1000;globalThis.innerHeight=700;return {nodes,canvas:element()};}
test('avatar actions use center aim while looking, and F never selects a person outside the reticle',()=>{
 const {nodes,canvas}=ui(),camera=new THREE.PerspectiveCamera(65,1,.1,20);camera.position.set(0,1.2,3);
 const person=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(.6,1.8,.3),new THREE.MeshBasicMaterial());body.position.y=.9;body.isSkinnedMesh=true;person.add(body);
 const interaction=setupAvatarInteractions({canvas,camera,people:{presenter:person},solids:[],getRole:()=> 'client',isActive:()=>true,onAction(){}});
 interaction.update(1000);assert.equal(interaction.target,'presenter');assert.equal(nodes.get('avatar-actions').hidden,true);
 assert.equal(primaryVisitAction({role:'client',following:true,target:interaction.target}).label,'Get attention');
 assert.equal(primaryVisitAction({role:'client',following:false,target:interaction.target}).label,'Follow presenter');
 assert.equal(canvas.events.pointermove,undefined,'mouse position must not select avatars');
 camera.rotation.y=Math.PI/2;interaction.update(1100);assert.equal(interaction.target,null);
 assert.equal(primaryVisitAction({role:'client',following:true,target:interaction.target}).label,'Explore office');
 assert.equal(interaction.activateAttentionShortcut(),false);
});
test('chair actions follow center aim and cannot be offered through a wall',()=>{
 const {canvas}=ui(),camera=new THREE.PerspectiveCamera(65,1,.1,20);camera.position.set(0,1.68,0);camera.lookAt(0,.7,-1.2);
 const seat={id:'chair',x:0,z:-1.2,yaw:0},motion={active:false,canSit:()=>true};
 const args={canvas,camera,seats:[seat],isActive:()=>true,getMotion:()=>motion,getPosition:()=>({x:0,z:0}),onSit(){},onStand(){}};
 const interaction=setupSeatInteractions(args);interaction.update();assert.equal(interaction.target,seat);
 const context={role:'client',following:false,seatAction:interaction.action};
 assert.equal(primaryVisitAction(context).label,'Sit here');
 assert.equal(interaction.use(),true);assert.equal(canvas.events.pointermove,undefined);
 camera.lookAt(3,1.68,0);interaction.update();assert.equal(interaction.target,null);
 camera.lookAt(0,.7,-1.2);const wall=setupSeatInteractions({...args,solids:[{x1:-2,x2:2,z1:-.8,z2:-.6,bottom:0,top:3}]});wall.update();assert.equal(wall.target,null);
 motion.active=true;motion.state={phase:'sitting'};interaction.update();
 assert.equal(primaryVisitAction({...context,seatAction:interaction.action}).disabled,true);
 assert.equal(interaction.use(),false);
 motion.state.phase='seated';interaction.update();
 assert.equal(primaryVisitAction({...context,seatAction:interaction.action}).label,'Stand up');
 assert.equal(interaction.use(),true);
});

test('Brian replaces navigation with one action button that opens both choices',()=>{
 const {nodes,canvas}=ui(),camera=new THREE.PerspectiveCamera(65,1,.1,20);
 camera.position.set(0,1.2,3);
 const person=new THREE.Group(),requested=[];
 const interaction=setupAvatarInteractions({canvas,camera,people:{collaborator:person},solids:[],getRole:()=> 'client',isActive:()=>true,onAction:(target,kind)=>requested.push([target,kind])});
 interaction.update(1000);
 const action=()=>primaryVisitAction({role:'client',following:false,target:interaction.target});
 assert.equal(action().label,'Brian’s actions');
 assert.equal(nodes.get('avatar-actions').hidden,true);
 let viewed=0;nodes.get('screen-open').onclick=()=>viewed++;
 assert.equal(interaction.activateScreenShortcut(),false);
 assert.equal(interaction.activateAttentionShortcut(),false);
 interaction.toggleBrianActions();
 assert.equal(interaction.brianMenuOpen,true);
 nodes.get('avatar-attention').focus();
 assert.equal(interaction.activateScreenShortcut(),true);
 assert.equal(viewed,1);
 assert.deepEqual(requested,[]);
 assert.equal(nodes.get('avatar-actions').hidden,false);
 assert.equal(nodes.get('screen-open').hidden,false);
 assert.equal(nodes.get('avatar-attention-label').textContent,'Get Brian’s attention');
 assert.equal(interaction.activateAttentionShortcut(),true);
 assert.deepEqual(requested,[['collaborator','attention']]);
 assert.equal(viewed,1);
 assert.equal(interaction.brianMenuOpen,false);
 assert.equal(nodes.get('avatar-actions').hidden,true);
 assert.equal(action().label,'Follow presenter');
});
