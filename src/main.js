import * as THREE from 'three';
import {renderProfile} from './render-profile.js';
import {createCameraLook} from './camera-look.js';
import {visitAudioOutput,VisitAudio} from './visit-audio-output.js';
import {configureAvatarAssets} from './avatar-assets.js';
import {createProgressiveAvatars,prepareAvatar} from './progressive-avatars.js';
import {createShadowRefresh} from './shadow-refresh.js';
import {createPoseRate} from './pose-rate.js';
import {createSeatMotion} from './seating.js';
import {createFollowSeating} from './follow-seating.js';
import {presenterWaitState} from './presenter-wait.js';
import {setupSeatInteractions} from './seat-interactions.js';
import {setupJoystick} from './joystick.js';
import {acceptsMovementKey,setupMovementKeyboard} from './movement-input.js';
import {createArrivalIntro,liftArrival,liftSeparates} from './arrival-intro.js';
import {createArrivalVoice} from './arrival-voice.js';
import {createLoadingProgress} from './loading-progress.js';
import {setupAvatarInteractions,thirdPersonPosition} from './avatar-interactions.js';
import {buildRouteWorld} from './route-world.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createVisuals} from './visuals.js';
import {createPresenterAvatar} from './presenter-avatar.js';
import {createClientAvatar} from './client-avatar.js';
import {createCollaboratorAvatar} from './collaborator-avatar.js';
import {createWorkstationVisit} from './workstation-visit.js';
import {createClientFollower} from './client-follow.js';
import {setupVisitControls} from './visit-controls.js';
import {visitRoles,avatarVisibility,findCollaboratorView} from './visit-views.js';
import {createHostMotion} from './host-motion.js';
import {findCompanionPlacement} from './companion-placement.js';
import {createTourVoice,narrationPolicy} from './tour-voice.js';
import {partition,serviceWall,kitchen,officeWest,meetingRooms,officeShiftZ,collaboratorStation} from './office-layout.js';

const $=id=>document.getElementById(id),canvas=$('scene'),keys=new Set();
let renderer,world,camera,yaw=0,pitch=0,dragging=false,high=!renderProfile.mobile;
let lookPointer=null,lastLookX=0,lastLookY=0;
const cameraLook=createCameraLook();
const eyeHeight=1.68,radius=.24;
const joystick=setupJoystick($('joystick'));
const connectedVisit=new URL(location.href).searchParams.get('joined')==='1';
const needsArrivalVoice=!new URL(location.href).searchParams.has('vista');
const loadingInLift=needsArrivalVoice&&(!new URL(location.href).searchParams.get('modo')||new URL(location.href).searchParams.get('modo')==='client');
if(loadingInLift){document.body.dataset.liftPreview='true';$('lift-loading-preview').hidden=false;$('welcome-title').textContent='Your visit starts here.';$('dialog-copy').textContent='Settle into the elevator while we prepare your visit. Your welcome plays during the ride; the doors open when it finishes.';}
let arrivalAudio=null,loadStage='office';
const loading=createLoadingProgress(({percent,message})=>{$('loading-bar').value=percent;$('loading-percent').textContent=percent+'%';if(message){$('loading-stage').textContent=message;$('status').textContent=message;}});
THREE.DefaultLoadingManager.onProgress=(url,loaded,total)=>{if(['office','people'].includes(loadStage))loading.set(loadStage,Math.min(.95,loaded/Math.max(1,total)),(loadStage==='office'?'Loading the office':'Loading people')+' · '+loaded+'/'+total+' resources');};
function fail(error){$('welcome').hidden=false;$('tour-ui').hidden=true;$('welcome-title').textContent='Unable to open the visit.';$('dialog-copy').textContent='Please reload and try again.';$('status').textContent=error?.message||'Office unavailable.';$('enter').disabled=true;}
window.addEventListener('error',e=>fail(e.error||new Error(e.message)));
window.addEventListener('unhandledrejection',e=>fail(e.reason));
try{
 renderer=new THREE.WebGLRenderer({canvas,antialias:!renderProfile.mobile,powerPreference:renderProfile.mobile?'default':'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,renderProfile.mobile?1:1.25));renderer.setSize(innerWidth,innerHeight);canvas.dataset.graphicsProfile=renderProfile.mobile?'mobile':'desktop';
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
 renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const avatarAssets=configureAvatarAssets(renderer,{original:new URL(location.href).searchParams.get('textures')==='original'});
 window.addEventListener('pagehide',()=>avatarAssets.dispose(),{once:true});
 canvas.dataset.avatarTextures=avatarAssets.compressed?'uastc':'original';
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer.setAnimationLoop(null);fail(new Error('Graphics context lost. Please reload the visit.'));});
 const scene=new THREE.Scene();scene.background=new THREE.Color('#c5dce6');scene.fog=new THREE.Fog('#c5dce6',350,1800);
 camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.08,2800);camera.rotation.order='YXZ';
 loading.set('office',0,'Loading the office…');world=await buildRouteWorld(scene);loading.set('office',1,'Office ready');loadStage='lighting';loading.set('lighting',0,'Preparing lighting and reflections…');
 if(loadingInLift){camera.position.set(liftArrival.client.x,eyeHeight,liftArrival.client.z);camera.rotation.set(liftArrival.client.pitch,liftArrival.client.yaw,0);world.arrivalLift.set(0,10);renderer.render(scene,camera);$('lift-loading-preview').hidden=true;canvas.dataset.loadingPreview='live';}
 const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),env=pmrem.fromScene(room,.04);scene.environment=env.texture;scene.environmentIntensity=.55;room.dispose();
 // Bake one reflection probe of this actual static office for metals, glass and varnish.
 if(renderProfile.reflectionProbe){const reflectionTarget=new THREE.WebGLCubeRenderTarget(128,{type:THREE.HalfFloatType});
 const reflectionCamera=new THREE.CubeCamera(.08,80,reflectionTarget);reflectionCamera.position.set(-6.6,1.7,-6);reflectionCamera.update(renderer,scene);
 const officeEnvironment=pmrem.fromCubemap(reflectionTarget.texture);scene.environment=officeEnvironment.texture;scene.environmentIntensity=.7;
 env.dispose();reflectionTarget.dispose();}pmrem.dispose();
 loading.set('lighting',1,'Lighting ready');loadStage='people';loading.set('people',0,'Loading your presenter and visitors…');
 const visuals=createVisuals(renderer,scene,camera,(mode='smooth')=>{high=mode!=='smooth';$('quality').textContent='Image: '+mode;});
 // One model and one transcoder worker at a time, including desktop. Brian is
 // prepared after the welcome assets rather than blocking the arrival screen.
 const avatars=createProgressiveAvatars({scene,factories:{presenter:createPresenterAvatar,client:createClientAvatar,collaborator:createCollaboratorAvatar},prepare:root=>prepareAvatar(renderer,root,scene,camera),onState:(person,state)=>{canvas.dataset[person+'Asset']=state;if(state==='ready')renderer.shadowMap.needsUpdate=true;}});
 const {presenter:presenterAvatar,client:clientAvatar,collaborator:collaboratorAvatar}=avatars.people;
 collaboratorAvatar.position.set(collaboratorStation.x,0,collaboratorStation.z);collaboratorAvatar.userData.seated=1;collaboratorAvatar.userData.face(collaboratorStation.yaw);
 await avatars.essentials(new URL(location.href).searchParams.get('modo')||'client');
 loading.set('people',.98,'Preparing the scene for a smooth entrance…');
 await renderer.compileAsync(scene,camera);
 loading.set('people',1,'People ready');loadStage='welcome';loading.set('welcome',0,'Loading the English welcome…');
 if(needsArrivalVoice){arrivalAudio=createArrivalVoice({AudioClass:VisitAudio,onProgress:fraction=>loading.set('welcome',fraction,'Preparing your English welcome…')});window.addEventListener('pagehide',()=>arrivalAudio.destroy(),{once:true});await arrivalAudio.load();}
 loading.set('welcome',1,'Ready to begin');$('loading-detail').textContent=needsArrivalVoice?'Office, people and English welcome are ready.':'Your office and people are ready.';
 // Begin in the next task so setup and the entry UI can finish first.
 setTimeout(()=>{void avatars.background();},250);
 const follower=createClientFollower();let visitControls,following=true,clientSpeed=0,presenterSpeed=0,lastManualLook=0,aimedDoor=false;
 const people={client:clientAvatar,presenter:presenterAvatar,collaborator:collaboratorAvatar};
 const attentionRings=[];
 for(const avatar of Object.values(people)){
  const ring=new THREE.Mesh(new THREE.RingGeometry(.34,.40,48),new THREE.MeshBasicMaterial({color:'#5ff2c5',transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.018;ring.visible=false;avatar.add(ring);attentionRings.push({avatar,ring,until:0});
 }
 function blocked(x,z,ignoreSeat=null){
  // Human-height swept movement; the presenter stays on this floor.
  // Check the union of floor pieces, so joins and door thresholds remain walkable.
  for(const [dx,dz] of [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]]){
   if(!world.office.surfaces.some(s=>Math.abs(s.y)<.08&&x+dx>=s.x1&&x+dx<=s.x2&&z+dz>=s.z1&&z+dz<=s.z2))return true;
  }
  return world.arrivalLift.blocks(x,z,radius)||world.entryDoor.blocked(x,z,radius)||world.office.solids.some(s=>s.seatId!==ignoreSeat&&s.top>.12&&s.bottom<eyeHeight+.08&&x+radius>s.x1&&x-radius<s.x2&&z+radius>s.z1&&z-radius<s.z2);
 }
 const seatMotions=Object.fromEntries(visitRoles.map(person=>[person,createSeatMotion({blocked,occupied:id=>Object.entries(people).some(([other,avatar])=>other!==person&&avatar.userData.seatId===id)})]));
 const followSeating=createFollowSeating({seats:world.seats,motion:seatMotions.client,blocked,occupied:id=>Object.entries(people).some(([person,avatar])=>person!=='client'&&avatar.userData.seatId===id)});
 const brianSeat=world.seats.reduce((best,seat)=>!best||Math.hypot(seat.x-collaboratorAvatar.position.x,seat.z-collaboratorAvatar.position.z)<Math.hypot(best.x-collaboratorAvatar.position.x,best.z-collaboratorAvatar.position.z)?seat:best,null);
 if(brianSeat){seatMotions.collaborator.occupy(brianSeat);collaboratorAvatar.userData.seatId=brianSeat.id;}
 const reviewViews={
  pasillo2:{x:-3.65,z:-1.8,yaw:.6,pitch:-.08},
  mampara:{x:3.15,z:-7.6,yaw:Math.PI/2,pitch:.06},
  puerto:{x:-.18,z:-11.9,yaw:0,pitch:-.14},
  madera:{x:4.4,z:1.45,yaw:0,pitch:.02},
  plantaEntrada:{x:3.6,z:-1.9,yaw:Math.PI,pitch:-.15},
  pared:{x:partition.x+1.7,z:-2.15,yaw:Math.PI-.6,pitch:.06},
  pared1:{x:partition.x+1.7,z:-3.6,yaw:Math.PI-.46,pitch:.04},
  pared2:{x:partition.x-1.7,z:-3.6,yaw:Math.PI+.46,pitch:.04},
  servicios:{x:serviceWall.doorX-.2,z:-2,yaw:2.8,pitch:.04},
  cocina:{x:-10.45,z:-3.8,yaw:Math.PI-.12,pitch:-.02},
  jj:{x:-11.3,z:-2.2,yaw:2.42,pitch:.01},
  accesoCocina:{x:kitchen.x2-.6,z:-.8,yaw:Math.PI,pitch:0},
  fondo2:{x:officeWest+2.2,z:-6.8,yaw:Math.PI/2,pitch:-.04},
  puestoVentana:{x:officeWest+2.3,z:-3.2,yaw:2.2,pitch:-.10},
  sillaBrian:{x:collaboratorStation.x+1,z:collaboratorStation.z-officeShiftZ+1,yaw:.8,pitch:-.1},
  sala01:{x:6.25,z:-6.7,yaw:-1.96,pitch:-.07},
  pantallaSala01:{x:10.6,z:-6.5,yaw:-.78,pitch:.04},
  presentador:{x:7.5,z:-.5,yaw:1.55,pitch:-.04},
  colaborador:{x:collaboratorStation.x+1.7,z:collaboratorStation.z+1.6-officeShiftZ,yaw:.9,pitch:-.18},
  salasAlineadas:{x:6.9,z:-7.9,yaw:-Math.PI/2,pitch:-.025},
  puestosRetirados:{x:8.1,z:-6.4,yaw:0,pitch:-.06},
  puestoAgregado:{x:8.1,z:-1.65,yaw:1.02,pitch:-.13},
  sala02:{x:9.95,z:-12.3,yaw:-2.0,pitch:-.06},
  accesoSala01:{x:7.25,z:meetingRooms[0].doorZ,yaw:-Math.PI/2,pitch:0},
  accesoSala02:{x:10.55,z:meetingRooms[1].doorZ,yaw:-Math.PI/2,pitch:0},
  rincon:{x:officeWest+3.25,z:-9.1,yaw:.40,pitch:-.04},
  paredCocina:{x:officeWest+1.7,z:-3.5,yaw:Math.PI,pitch:.02},
  pasillo2Marca:{x:6,z:-4.1,yaw:Math.PI+.86,pitch:-.025},
  entrada:{x:6.43,z:1.4,yaw:0,pitch:0},
  pasilloContinuo:{x:7.5,z:-2.55,yaw:1.55,pitch:-.035},
  paredEntrada:{x:7.4,z:-1.4,yaw:Math.PI/2,pitch:-.025},
  hallBanos:{x:5.25,z:1.3,yaw:-Math.PI/2,pitch:.07},
  hallEspejos:{x:6.8,z:1.3,yaw:Math.PI/2,pitch:.035}
 };
 // Review cameras follow the translated office; hall and entry cameras stay fixed.
 const fixedReviews=new Set(['madera','plantaEntrada','pasillo2Marca','entrada','pasilloContinuo','paredEntrada','hallBanos','hallEspejos']);
 for(const [name,view] of Object.entries(reviewViews))if(!fixedReviews.has(name))view.z+=officeShiftZ;
 const reviewView=new URL(location.href).searchParams.get('vista'),previewOffice=Object.hasOwn(reviewViews,reviewView);
 const initialView=previewOffice?reviewViews[reviewView]:liftArrival.client;
 const arrivalIntro=createArrivalIntro();let arrivalDoor=0;
 function reset(){camera.position.set(initialView.x,eyeHeight,initialView.z);yaw=initialView.yaw;pitch=initialView.pitch||0;camera.rotation.set(pitch,yaw,0);keys.clear();}
 reset();
 const requestedRole=new URL(location.href).searchParams.get('modo');
 let role='client',clientPose={...initialView},collaboratorPose=null,hostMotion,hostPlaying=true,presenterAvailable=true,hasStarted=false;
 let cameraView='first',thirdPersonCamera=null,arrivalLookManual=false,arrivalGreetingSeen=false;
 let speechState={speaking:false},captionsVisible=false,voiceListKey='',pendingNarration='',narrationDwell=0;
 const narrator=createTourVoice({recorded:true,AudioClass:VisitAudio,synth:window.speechSynthesis,Utterance:window.SpeechSynthesisUtterance,onChange:state=>{
  speechState=state;
  arrivalAudio?.setVolume(state.enabled?state.volume:0);
  $('voice-toggle').textContent=state.enabled?(state.needsActivation?'Voice: tap to enable':state.error?'Voice unavailable':'Voice: on'):'Voice: off';
  $('voice-toggle').setAttribute('aria-pressed',String(state.enabled));
  $('narration-state').textContent=state.error||(state.speaking?'Speaking · WPP Production':state.paused?'Voice guide paused':'WPP Production · Voice guide');
  $('narration-caption').textContent=narrationPolicy(role).captions?state.text:'';
  $('narration-panel').hidden=!narrationPolicy(role).captions||!captionsVisible||!state.text;
  document.body.classList.toggle('has-captions',narrationPolicy(role).captions&&captionsVisible&&Boolean(state.text));
  $('narration-language').value=state.language;
  const list=state.voices.filter(v=>v.lang.toLowerCase().startsWith(state.language)),key=state.language+list.map(v=>v.voiceURI).join('|');
  if(key!==voiceListKey){voiceListKey=key;$('narration-voice').replaceChildren(new Option('Automatic · local neural voice',''),...list.map(v=>new Option(v.name+' · '+v.lang,v.voiceURI)));}
  $('narration-voice').value=state.voiceURI;
  canvas.dataset.voiceState=!state.audible?'disabled-for-presenter':state.error?'unavailable':!state.enabled?'muted':state.paused?'paused':state.speaking?'speaking':'ready';
 }});
 if(previewOffice)narrator.setEnabled(false);
 function updateCaptions(){const state=narrator.state();$('narration-panel').hidden=!narrationPolicy(role).captions||!captionsVisible||!state.text;$('captions-toggle').textContent=captionsVisible?'Disable subtitles':'Enable subtitles';$('captions-toggle').setAttribute('aria-pressed',String(captionsVisible));document.body.classList.toggle('has-captions',narrationPolicy(role).captions&&captionsVisible&&Boolean(state.text));}
 $('camera-view').onchange=e=>{cameraView=e.target.value;canvas.focus();};
 $('voice-toggle').onclick=()=>{const retry=narrator.state().needsActivation;void visitAudioOutput.unlock().then(()=>{if(retry)narrator.replay();else narrator.setEnabled(!narrator.state().enabled);});};
 const enableAudio=document.createElement('button');enableAudio.textContent='Enable audio';enableAudio.hidden=true;enableAudio.id='audio-enable';$('voice-toggle').parentElement.append(enableAudio);
 visitAudioOutput.subscribe(({needsTap})=>{enableAudio.hidden=!needsTap;});
 enableAudio.onclick=()=>{void visitAudioOutput.unlock().then(ok=>{if(ok&&narrator.state().needsActivation)narrator.replay();});};
 $('narration-language').onchange=e=>narrator.setLanguage(e.target.value);
 $('narration-voice').onchange=e=>narrator.setVoice(e.target.value);
 $('voice-volume').oninput=e=>narrator.setVolume(e.target.value);
 $('voice-replay').onclick=()=>{void visitAudioOutput.unlock().then(()=>narrator.replay());};
 $('captions-toggle').onclick=()=>{captionsVisible=!captionsVisible;updateCaptions();};
 $('caption-close').onclick=()=>{captionsVisible=false;updateCaptions();};
 window.addEventListener('pagehide',()=>narrator.destroy(),{once:true});
 function clientView(){
  const placement=findCompanionPlacement(clientPose,blocked);
  camera.position.set(clientPose.x,eyeHeight,clientPose.z);
  clientAvatar.position.set(clientPose.x,0,clientPose.z);
  presenterAvailable=Boolean(placement);presenterAvatar.visible=presenterAvailable;hostMotion=null;
  if(!placement){yaw=clientPose.yaw;pitch=clientPose.pitch||0;camera.rotation.set(pitch,yaw,0);canvas.dataset.companion='no-space';return;}
  presenterAvatar.position.set(placement.host.x,0,placement.host.z);
  presenterAvatar.userData.face(Math.atan2(camera.position.x-placement.host.x,camera.position.z-placement.host.z));
  yaw=placement.yaw;pitch=placement.pitch;camera.rotation.set(pitch,yaw,0);
  clientPose.yaw=yaw;clientPose.pitch=pitch;clientAvatar.userData.face(yaw+Math.PI);
  follower.reset();
  hostMotion=createHostMotion(placement.host,camera.position,blocked);
  canvas.dataset.companion='beside';
  renderer.shadowMap.needsUpdate=true;
  $('host-demo').hidden=false;
  $('host-demo').textContent=hostPlaying?'Pause host':'Resume host';
 }
 function updateRole(){
  narrator.setRole(role);
  const policy=narrationPolicy(role);
  for(const id of ['voice-toggle','narration-language','narration-voice','voice-volume','voice-replay']){const control=$(id);control.hidden=!policy.audio||['narration-language','narration-voice'].includes(id);const label=document.querySelector('label[for="'+id+'"]');if(label)label.hidden=control.hidden;}
  $('captions-toggle').hidden=!policy.captions;updateCaptions();
  $('view-label').textContent={client:'Client view',presenter:'Presenter view',collaborator:'Collaborator view'}[role];
  $('role-switch').innerHTML='<small>DEV</small> Switch to '+(role==='client'?'Presenter':'Client');
  $('view-role').value=role;
  const visible=avatarVisibility(role,presenterAvailable);
  clientAvatar.visible=visible.client;presenterAvatar.visible=visible.presenter;
  collaboratorAvatar.visible=role!=='collaborator';
  $('walk-controls').hidden=seatMotions[role].active||(role==='client'&&following);canvas.dataset.role=role;document.body.dataset.role=role;
  visitControls?.setRole(role);
  $('host-demo').hidden=role==='presenter'||!presenterAvatar.visible;
  renderer.shadowMap.needsUpdate=true;
 }
 function switchRole(next){
  if(connectedVisit&&next!==requestedRole)return;
  if(!visitRoles.includes(next)||next===role)return;
  if(!people[next].userData.ready){void avatars.ensure(next).then(()=>switchRole(next)).catch(()=>{$('status').textContent='Character unavailable. Please try again.';});return;}
  const current={x:camera.position.x,z:camera.position.z,yaw,pitch};
  let destination;
  if(next==='collaborator')destination={x:collaboratorAvatar.position.x,z:collaboratorAvatar.position.z,yaw:collaboratorAvatar.rotation.y-Math.PI,pitch:-.10};
  if(next==='collaborator'&&!destination){$('view-role').value=role;return;}
  if(role==='client'){clientPose=current;clientAvatar.position.set(current.x,0,current.z);clientAvatar.userData.face(yaw+Math.PI);}
  if(role==='presenter'){presenterAvatar.position.set(current.x,0,current.z);presenterAvatar.userData.face(yaw+Math.PI);}
  if(role==='collaborator')collaboratorPose=current;
  if(next==='client')destination=clientPose;
  if(next==='presenter'){
   const p=presenterAvailable?presenterAvatar.position:findCompanionPlacement(clientPose,blocked)?.host;
   if(!p){$('view-role').value=role;return;}
   destination={x:p.x,z:p.z,yaw:Math.atan2(p.x-clientPose.x,p.z-clientPose.z),pitch:-.04};presenterAvailable=true;
  }
  role=next;camera.position.set(destination.x,seatMotions[role].active?1.20:eyeHeight,destination.z);yaw=destination.yaw;pitch=destination.pitch||0;
  camera.fov=65;camera.updateProjectionMatrix();camera.rotation.set(pitch,yaw,0);
  if(role!=='presenter'&&presenterAvailable)hostMotion=createHostMotion(presenterAvatar.position,clientAvatar.position,blocked);
  if(role==='collaborator')presenterAvatar.userData.face(Math.atan2(clientAvatar.position.x-presenterAvatar.position.x,clientAvatar.position.z-presenterAvatar.position.z));
  keys.clear();stopLooking();updateRole();narrator.setPaused(!hasStarted||(role!=='presenter'&&!hostPlaying));canvas.focus();
  if(role==='client'&&!previewOffice&&hasStarted&&arrivalIntro.active){arrivalIntro.start(arrivalAudio.state().duration);if(!arrivalAudio.state().finished)void arrivalAudio.play();}
 }
 clientView();
 if(!previewOffice){presenterAvatar.position.set(liftArrival.host.x,0,liftArrival.host.z);presenterAvatar.userData.face(0);presenterAvailable=true;hostMotion=null;yaw=liftArrival.client.yaw;pitch=liftArrival.client.pitch;camera.rotation.set(pitch,yaw,0);}
 if(visitRoles.includes(requestedRole)&&requestedRole!=='client')switchRole(requestedRole);
 if(role==='presenter'&&!previewOffice){camera.position.set(liftArrival.host.x,eyeHeight,liftArrival.host.z);presenterAvatar.position.set(liftArrival.host.x,0,liftArrival.host.z);yaw=Math.PI;camera.rotation.set(0,yaw,0);}
 if(reviewView==='presentador'&&role==='client'&&presenterAvatar.visible){
  camera.fov=30;camera.position.y=1.55;camera.updateProjectionMatrix();
  yaw=Math.atan2(camera.position.x-presenterAvatar.position.x,camera.position.z-presenterAvatar.position.z);pitch=-.035;camera.rotation.set(pitch,yaw,0);
 }
 updateRole();
 const workstationVisit=createWorkstationVisit({station:collaboratorStation,blocked:(x,z)=>blocked(x,z)||[presenterAvatar,collaboratorAvatar].some(a=>a.visible&&Math.hypot(x-a.position.x,z-a.position.z)<.70)});
 visitControls=setupVisitControls({scene,onScreenVisit:begin=>{if(begin&&!workstationVisit.start(clientAvatar.position))return false;if(!begin)workstationVisit.cancel();narrator.setPaused(begin||!hasStarted||!hostPlaying);following=!begin;follower.reset();updateRole();return true;},onExplore:explore=>{following=!explore;follower.reset();updateRole();},onAttention:(target,from)=>{
  const item=attentionRings.find(a=>a.avatar===people[target]);if(item)item.until=performance.now()+6000;
  const actor=people[from];if(actor){actor.userData.actionUntil=performance.now()+3200;actor.userData.actionTarget=target;const signal=attentionRings.find(a=>a.avatar===actor);if(signal)signal.until=performance.now()+3200;}
  people[target].userData.attentionFrom=from;people[target].userData.attentionUntil=performance.now()+6000;
 }});
 const avatarInteractions=setupAvatarInteractions({canvas,camera,people,solids:world.office.solids,getRole:()=>role,isActive:()=>$('welcome').hidden&&$('screen-panel').hidden&&!(role==='client'&&!previewOffice&&arrivalDoor<.999),isDragging:()=>dragging,extraOcclusion:(from,to)=>liftSeparates(from,to,arrivalDoor),onAction:(target,kind)=>{if(role==='client'&&!previewOffice&&arrivalDoor<.999)return;visitControls.interact(target,kind);}});
 const seatInteractions=setupSeatInteractions({canvas,camera,seats:world.seats,isActive:()=>!avatarInteractions.target&&$('welcome').hidden&&$('screen-panel').hidden&&!(role==='client'&&(!previewOffice&&arrivalIntro.active||workstationVisit.phase!=='idle')),solids:world.office.solids,extraOcclusion:(from,to)=>liftSeparates(from,to,arrivalDoor),getMotion:()=>seatMotions[role],getPosition:()=>people[role].position,onSit:seat=>{if(seatMotions[role].sit(seat,people[role].position)){people[role].userData.seatId=seat.id;keys.clear();}},onStand:()=>{if(seatMotions[role].stand())keys.clear();}});
 visitControls.setRole(role);
 narrator.visit(world.locationAt(camera.position.x,camera.position.z));
 if(needsArrivalVoice)narrator.reserveArrivalForVoiceover();
 const enter=$('enter');let dialogMode='intro';
 if(connectedVisit)$('host-demo').hidden=true;
 enter.disabled=visitControls.rejected();enter.textContent=enter.disabled?'Esperando admisión…':'Start visit';
 $('status').textContent='Local visit · Microphones start off';
 enter.focus();
 function showDialog(mode){
  narrator.setPaused(true);
  arrivalAudio?.pause();$('arrival-loading').hidden=mode!=='intro';
  dialogMode=mode;$('welcome').dataset.mode=mode;keys.clear();stopLooking();
  joystick.reset();
  $('welcome').hidden=false;$('tour-ui').hidden=true;$('crosshair').hidden=true;
  $('guide-toggle').hidden=mode!=='pause';
  if(mode==='guide'){
   $('dialog-step').textContent=role.toUpperCase()+' VIEW';$('welcome-title').textContent='Make yourself comfortable.';
   $('dialog-copy').textContent=role==='client'?'You follow the presenter automatically. Choose Explore office to walk freely, or Follow presenter to rejoin.':'Drag to look. Use People & communication for your microphone, attention requests and Brian’s screen. Brian works seated at a workstation in Pasillo 1 / Office East Wing.';
   enter.textContent='Back to visit';
  }else if(mode==='pause'){
   $('dialog-step').textContent='TAKE YOUR TIME';$('welcome-title').textContent='Visit paused.';
   $('dialog-copy').textContent='Continue whenever you’re ready.';enter.textContent='Continue';
  }
  enter.focus();
 }
 function stopLooking({settle=false}={}){
  const pointer=lookPointer;lookPointer=null;dragging=false;canvas.style.cursor='grab';
  if(!settle)cameraLook.reset();
  if(pointer!==null&&canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);
 }
 function pause(){if(hasStarted&&$('welcome').hidden)showDialog('pause');}
 enter.onclick=()=>{
  if(visitControls.rejected())return;
  if(loadingInLift&&!hasStarted){$('welcome').classList.add('departing');setTimeout(()=>$('welcome').classList.remove('departing'),700);}
  hasStarted=true;$('welcome').hidden=true;$('tour-ui').hidden=false;$('crosshair').hidden=false;
  canvas.style.cursor='grab';canvas.focus();
  visitControls.unlock();
  if(role==='client'&&!previewOffice&&arrivalIntro.active){arrivalIntro.start(arrivalAudio.state().duration);narrator.setPaused(true);if(!arrivalAudio.state().finished)void arrivalAudio.play();}else{narrator.visit(world.locationAt(camera.position.x,camera.position.z));narrator.setPaused(role!=='presenter'&&!hostPlaying);}
 };
 $('arrival-audio-retry').onclick=()=>{void visitAudioOutput.unlock().then(()=>arrivalAudio?.retry());canvas.focus();};
 $('pause').onclick=pause;$('help').onclick=()=>showDialog('guide');$('guide-toggle').onclick=()=>showDialog('guide');
 function useDoor(){if(seatInteractions.use())return;if(role==='client'&&!previewOffice&&arrivalDoor<.999)return;if(connectedVisit&&role!=='presenter')return;if($('welcome').hidden&&aimedDoor)world.entryDoor.toggle();}
 $('door-action').onclick=()=>{useDoor();canvas.focus();};
 $('host-demo').onclick=()=>{hostPlaying=!hostPlaying;$('host-demo').textContent=hostPlaying?'Pause host':'Resume host';narrator.setPaused(!hostPlaying);if(arrivalAudio&&arrivalIntro.active){if(!hostPlaying)arrivalAudio.pause();else if(hasStarted&&!arrivalAudio.state().finished)void arrivalAudio.play();}canvas.focus();};
 $('role-switch').onclick=()=>{
  keys.clear();stopLooking();$('settings').open=false;
  switchRole(role==='client'?'presenter':'client');
 };
 $('view-role').onchange=e=>{switchRole(e.target.value);};
 $('welcome').addEventListener('keydown',e=>{if(e.key!=='Tab')return;const focusable=[...$('welcome').querySelectorAll('button:not(:disabled)')].filter(b=>!b.hidden);const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
 document.addEventListener('keydown',e=>{if(e.code==='Escape'){if(visitControls.screenPhase()!=='idle'||!$('screen-panel').hidden){$('screen-close').click();return;}if($('settings').open){$('settings').open=false;return;}pause();}});
 document.addEventListener('keydown',e=>{if(e.code==='KeyE'&&!e.repeat&&acceptsMovementKey(e)){e.preventDefault();useDoor();}});
 const movementKeyboard=setupMovementKeyboard({target:window,keys,enabled:()=>$('welcome').hidden&&$('screen-panel').hidden,focus:()=>canvas.focus({preventScroll:true}),onRelease:()=>{joystick.reset();stopLooking();}});
 canvas.style.touchAction='none';
 canvas.addEventListener('pointerdown',e=>{
  if(!$('welcome').hidden||e.button!==0||lookPointer!==null)return;
  cameraLook.reset();
  e.preventDefault();canvas.focus({preventScroll:true});dragging=true;lookPointer=e.pointerId;lastLookX=e.clientX;lastLookY=e.clientY;
  canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';
 });
 canvas.addEventListener('pointermove',e=>{
  if(!dragging||e.pointerId!==lookPointer||!$('welcome').hidden)return;
  const dx=e.clientX-lastLookX,dy=e.clientY-lastLookY;lastLookX=e.clientX;lastLookY=e.clientY;
  cameraLook.input(dx,dy,e.pointerType);lastManualLook=performance.now();if(role==='client'&&arrivalIntro.active)arrivalLookManual=true;
 });
 for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(e.pointerId===lookPointer)stopLooking({settle:event==='pointerup'});});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)movementKeyboard.release();else if(!$('settings').open)movementKeyboard.regain();});
 $('reset').onclick=()=>{const previousRole=role;clientPose={...world.spawn};collaboratorPose=null;role='client';clientView();if(previousRole!=='client')switchRole(previousRole);updateRole();keys.clear();$('settings').open=false;canvas.focus();};
 $('quality').textContent=high?'Image: detail':'Image: smooth';
 $('quality').title='Switch image quality';
 $('quality').onclick=()=>{high=visuals.quality(!high);$('quality').textContent=high?'Image: detail':'Image: smooth';};
 window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);visuals.resize();});
 let previous=performance.now(),lastPublish=0;
 const renderTimes=[],shadowRefresh=createShadowRefresh(),poseRate=createPoseRate();renderer.info.autoReset=false;
 renderer.setAnimationLoop(now=>{
  canvas.dataset.frameMs=(now-previous).toFixed(1);
  const elapsed=(now-previous)/1000,dt=Math.min(elapsed,.12);previous=now;
  const active=$('welcome').hidden;
  if(active&&$('screen-panel').hidden){const look=cameraLook.update(yaw,pitch,elapsed);if(look.changed){yaw=look.yaw;pitch=look.pitch;camera.rotation.set(pitch,yaw,0);}}else cameraLook.reset();
  const remotePresenter=visitControls.remotePose('presenter'),remoteClient=visitControls.remotePose('client'),remoteCollaborator=visitControls.remotePose('collaborator');
  const presenterSeat=remotePresenter?remotePresenter.seat?.id:seatMotions.presenter.state?.phase!=='standing'?seatMotions.presenter.state?.seat.id:null;
  const introRunning=role==='client'&&!previewOffice&&arrivalIntro.active;
  const visitingBrian=role==='client'&&workstationVisit.phase!=='idle';
  const {waiting:presenterWaiting,lockMovement:presenterMovementLocked}=presenterWaitState({role,connected:connectedVisit,client:remoteClient});
  narrator.setPaused(!active||!hostPlaying||visitingBrian||introRunning);
  $('screen-open').disabled=role==='client'&&!previewOffice&&arrivalDoor<.999;$('avatar-attention').disabled=$('screen-open').disabled;
  $('camera-view').disabled=introRunning;$('follow-toggle').hidden=role!=='client'||introRunning;
  $('walk-controls').hidden=introRunning||seatMotions[role].active||role==='client'&&(following||visitingBrian);
  document.body.dataset.arriving=String(active&&introRunning);$('arrival-title').hidden=!(active&&introRunning);$('arrival-title').classList.toggle('is-departing',arrivalDoor>.02);document.body.classList.toggle('arrival-reveal',active&&introRunning&&arrivalDoor>.02);
  if(active&&introRunning&&hostPlaying){
   const audio=arrivalAudio.state(),step=arrivalIntro.update(elapsed,{audioFinished:audio.finished,audioTime:audio.currentTime});arrivalDoor=step.door;world.arrivalLift.set(step.door,step.floor,step);
   const exit=step.exit||0,z=liftArrival.client.z+(liftArrival.exit.z-liftArrival.client.z)*exit,previousZ=clientAvatar.position.z;
   clientAvatar.position.set(0,0,z);clientAvatar.userData.face(Math.PI);camera.position.set(0,eyeHeight,z);if(!arrivalLookManual){const towardHost=Math.atan2(-presenterAvatar.position.x,z-presenterAvatar.position.z);yaw=(step.cameraYaw||0)*(1-exit)+towardHost*exit;pitch=step.cameraPitch||0;camera.rotation.set(pitch,yaw,0);}clientSpeed=Math.abs(z-previousZ)/Math.max(dt,.001);
   if(step.phase==='complete'){follower.reset();if(!connectedVisit)hostMotion=createHostMotion(presenterAvatar.position,clientAvatar.position,blocked);}
   $('arrival-status').hidden=step.phase==='complete';$('arrival-status').textContent=audio.error?'Welcome paused · tap Retry welcome':step.phase==='rising'?'↑ '+step.floor+' · Ascending to floor 14':step.phase==='arriving'?'Floor 14 · Arriving':step.phase==='opening'?'Floor 14 · Welcome to WPP Production':'Your presenter is waiting';
  }else if(remoteClient){arrivalDoor=Number.isFinite(remoteClient.arrivalDoor)?Math.max(0,Math.min(1,remoteClient.arrivalDoor)):0;world.arrivalLift.set(arrivalDoor,14);}
  if(active&&!arrivalGreetingSeen&&arrivalDoor>.85){arrivalGreetingSeen=true;presenterAvatar.userData.welcomeRemaining=3.6;}
  $('arrival-audio-retry').hidden=!introRunning||!arrivalAudio?.state().error;
  if(arrivalAudio){const audio=arrivalAudio.state();canvas.dataset.welcomeAudio=audio.finished?'finished':audio.playing?'playing':audio.error?'error':'ready';canvas.dataset.welcomeTime=audio.currentTime.toFixed(2);canvas.dataset.welcomeDuration=audio.duration.toFixed(2);}
  canvas.dataset.arrivalPhase=arrivalIntro.phase;canvas.dataset.liftDoor=arrivalDoor.toFixed(3);
  visitControls.waitForClient(presenterWaiting,connectedVisit&&(!remoteClient||remoteClient.arriving)?'Esperando al cliente en el ascensor.':remoteClient?.seat?.id?'Waiting while the client is seated.':'Waiting while the client visits Brian’s desk.');canvas.dataset.screenVisit=workstationVisit.phase;canvas.dataset.presenterWaiting=String(presenterWaiting);
  $('reset').disabled=presenterMovementLocked;if(presenterMovementLocked)keys.clear();
  if(connectedVisit){presenterAvatar.visible=role!=='presenter'&&Boolean(remotePresenter);clientAvatar.visible=role!=='client'&&Boolean(remoteClient);collaboratorAvatar.visible=role!=='collaborator'&&visitControls.hasPeer('collaborator');}
  if(role!=='presenter'&&remotePresenter){presenterAvatar.position.set(remotePresenter.x,0,remotePresenter.z);presenterAvatar.userData.face(remotePresenter.heading||0);}
  if(role!=='client'&&remoteClient){clientAvatar.position.set(remoteClient.x,0,remoteClient.z);clientAvatar.userData.face(remoteClient.heading||0);clientSpeed=remoteClient.speed||0;}
  const occupants=[{x:camera.position.x,z:camera.position.z,radius}];
  if(presenterAvatar.visible)occupants.push({x:presenterAvatar.position.x,z:presenterAvatar.position.z,radius:.30});
  if(clientAvatar.visible)occupants.push({x:clientAvatar.position.x,z:clientAvatar.position.z,radius:.30});
  if(collaboratorAvatar.visible)occupants.push({x:collaboratorAvatar.position.x,z:collaboratorAvatar.position.z,radius:.30});
  if(connectedVisit&&role!=='presenter'&&remotePresenter?.door){const before=world.entryDoor.angle;world.entryDoor.applyRemote(remotePresenter.door);if(Math.abs(before-world.entryDoor.angle)>.0001)renderer.shadowMap.needsUpdate=true;}
  if(active&&(!connectedVisit||role==='presenter')&&world.entryDoor.update(dt,occupants))renderer.shadowMap.needsUpdate=true;
  const doorNear=active&&!seatMotions[role].active&&(!connectedVisit||role==='presenter')&&world.entryDoor.canInteract(camera.position.x,camera.position.z,yaw);
  $('door-action').hidden=!doorNear;
  $('door-action').textContent=world.entryDoor.obstructed?'Move back · E to reopen':world.entryDoor.targetOpen?'E · Close door':'E · Open door';
  canvas.dataset.doorAngle=world.entryDoor.angle.toFixed(3);
  canvas.dataset.doorTarget=world.entryDoor.targetOpen?'open':'closed';
  canvas.dataset.doorObstructed=String(world.entryDoor.obstructed);
  presenterSpeed=0;let presenterDirection=null,collaboratorSpeed=0;const movement=joystick.update(keys,active&&!introRunning&&!seatMotions[role].active&&(role==='presenter'&&!presenterMovementLocked||role==='collaborator'||role==='client'&&!following&&!visitingBrian&&!(clientAvatar.userData.actionUntil>now)));
  if(active&&!introRunning&&!seatMotions[role].active&&(role==='presenter'&&!presenterMovementLocked||role==='collaborator'||role==='client'&&!following&&!visitingBrian&&!(clientAvatar.userData.actionUntil>now))){
   const startX=camera.position.x,startZ=camera.position.z;
   const {forward,side}=movement,step=1.8*dt;
   const dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*step,dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*step;
   // Small independent steps let the presenter slide along furniture and walls.
   const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.035));
   const cameraBlocked=(x,z)=>blocked(x,z)||Object.values(people).some(a=>a.visible&&Math.hypot(x-a.position.x,z-a.position.z)<.62);
   for(let i=0;i<steps;i++){if(!cameraBlocked(camera.position.x+dx/steps,camera.position.z))camera.position.x+=dx/steps;if(!cameraBlocked(camera.position.x,camera.position.z+dz/steps))camera.position.z+=dz/steps;}
   if(role==='presenter'){presenterSpeed=Math.hypot(camera.position.x-startX,camera.position.z-startZ)/Math.max(dt,.001);presenterAvatar.position.set(camera.position.x,0,camera.position.z);if(presenterSpeed>.025)presenterDirection=Math.atan2(camera.position.x-startX,camera.position.z-startZ);}
   if(role==='collaborator'){collaboratorSpeed=Math.hypot(camera.position.x-startX,camera.position.z-startZ)/Math.max(dt,.001);collaboratorAvatar.position.set(camera.position.x,0,camera.position.z);if(collaboratorSpeed>.025)collaboratorAvatar.userData.face(Math.atan2(camera.position.x-startX,camera.position.z-startZ));}
   if(role==='client'){clientAvatar.position.set(camera.position.x,0,camera.position.z);clientAvatar.userData.face(yaw+Math.PI);clientSpeed=Math.hypot(camera.position.x-startX,camera.position.z-startZ)/Math.max(dt,.001);}
  }
  canvas.dataset.position=camera.position.toArray().map(v=>v.toFixed(3)).join(',');
  canvas.dataset.blocked=String(blocked(camera.position.x,camera.position.z));
  if(active&&role==='presenter'){
   presenterAvatar.userData.animate(dt,{speed:presenterSpeed,direction:presenterDirection,gesture:'idle'});
   canvas.dataset.presenterSpeaking='false';canvas.dataset.presenterGesture=presenterAvatar.userData.animation.gesture;
  }
  if(role!=='presenter'&&active&&presenterAvatar.visible){
   // The collaborator's inspection camera frames both people at their current
   // positions. Keep the host there, with body gestures, rather than walking
   // behind walls or out of that frame while the observer inspects the client.
   const pose=remotePresenter?{speed:remotePresenter.speed||0,gesture:remotePresenter.gesture||'idle'}:role==='client'&&!presenterSeat&&!visitingBrian&&!introRunning&&!seatMotions.client.active&&hostPlaying&&hostMotion?hostMotion.update(dt):{speed:0,gesture:'idle'};
   let clearOfClient=true;
   if(pose.x!==undefined){
    const p=presenterAvatar.position,dx=pose.x-p.x,dz=pose.z-p.z,l=dx*dx+dz*dz,t=l?THREE.MathUtils.clamp(((clientAvatar.position.x-p.x)*dx+(clientAvatar.position.z-p.z)*dz)/l,0,1):0;
    clearOfClient=Math.hypot(p.x+t*dx-clientAvatar.position.x,p.z+t*dz-clientAvatar.position.z)>.85;
   }
   if(pose.x!==undefined&&!blocked(pose.x,pose.z)&&clearOfClient)presenterAvatar.position.set(pose.x,0,pose.z);
   else if(pose.x!==undefined)pose.speed=0;
   const speaking=speechState.speaking&&speechState.zone!=='arrival';
   if(speaking&&pose.speed<.02)pose.gesture='explain';
   if(speaking&&pose.speed<.02)presenterAvatar.userData.face(Math.atan2(clientAvatar.position.x-presenterAvatar.position.x,clientAvatar.position.z-presenterAvatar.position.z));
   presenterAvatar.userData.animate(dt,{...pose,speaking,lookAt:clientAvatar.position});
   canvas.dataset.presenterSpeaking=String(speaking);canvas.dataset.presenterGesture=presenterAvatar.userData.animation.gesture;
  }
  if(active&&visitingBrian){
   clientSpeed=0;$('walk-controls').hidden=true;
   if(workstationVisit.phase==='approaching'&&!(clientAvatar.userData.actionUntil>now)){
    const pose=workstationVisit.update(dt,clientAvatar.position);clientSpeed=pose.speed;clientAvatar.position.set(pose.x,0,pose.z);camera.position.set(pose.x,eyeHeight,pose.z);
    if(pose.speed>.01)clientAvatar.userData.face(pose.direction);
    if(!dragging){const target=pose.arrived?Math.atan2(pose.x-collaboratorStation.x,pose.z-collaboratorStation.z):pose.speed>.01?pose.direction-Math.PI:yaw;yaw+=Math.atan2(Math.sin(target-yaw),Math.cos(target-yaw))*(1-Math.exp(-dt*4));camera.rotation.set(pitch,yaw,0);}
    if(pose.arrived){clientAvatar.userData.face(Math.atan2(collaboratorStation.x-pose.x,collaboratorStation.z-pose.z));visitControls.arriveScreen();}
   }
  }
  const controlsClient=(!connectedVisit||role==='client'&&remotePresenter)&&!(role!=='client'&&remoteClient);
  let seatingPose=null;
  if(active&&!introRunning&&controlsClient&&!(clientAvatar.userData.actionUntil>now))seatingPose=followSeating.update(dt,{enabled:following&&!visitingBrian,presenter:presenterAvatar.position,client:clientAvatar.position,presenterSeat});
  if(active&&!introRunning&&following&&!(clientAvatar.userData.actionUntil>now)&&controlsClient&&(seatingPose||!seatMotions.client.active)){
   const pose=seatingPose||follower.update(dt,clientAvatar.position,presenterAvatar.position,blocked);clientSpeed=pose.speed;
   clientAvatar.position.set(pose.x,0,pose.z);if(pose.speed>.01)clientAvatar.userData.face(pose.direction);
   if(role==='client'){
    camera.position.set(pose.x,eyeHeight,pose.z);
    if(!dragging&&now-lastManualLook>6000){const target=Math.atan2(pose.x-presenterAvatar.position.x,pose.z-presenterAvatar.position.z);yaw+=Math.atan2(Math.sin(target-yaw),Math.cos(target-yaw))*(1-Math.exp(-dt*1.8));camera.rotation.set(pitch,yaw,0);}
   }
  }
  if(role!=='collaborator'&&remoteCollaborator){collaboratorAvatar.position.set(remoteCollaborator.x,0,remoteCollaborator.z);collaboratorAvatar.userData.face(remoteCollaborator.heading||0);collaboratorSpeed=remoteCollaborator.speed||0;}
  for(const [person,avatar] of Object.entries(people)){
   const remote={presenter:remotePresenter,client:remoteClient,collaborator:remoteCollaborator}[person];
   if(person!==role&&remote){const seat=remote.seat&&world.seats.find(s=>s.id===remote.seat.id);avatar.userData.seatId=seat?.id||null;avatar.userData.seated=seat&&Number.isFinite(remote.seat.weight)?Math.max(0,Math.min(1,remote.seat.weight)):0;}
   else if(active&&seatMotions[person].active){const pose=seatMotions[person].update(dt);avatar.position.set(pose.x,0,pose.z);avatar.userData.face(pose.heading);avatar.userData.seated=pose.weight;avatar.userData.seatId=pose.id;if(person==='client'&&pose.weight>0)clientSpeed=0;if(person===role)camera.position.set(pose.x,eyeHeight-.48*pose.weight,pose.z);}
   else if(!seatMotions[person].active){avatar.userData.seated=0;avatar.userData.seatId=null;}
  }
  // Seat state arrives after navigation; update the presenter's own rig with the
  // current blend rather than the previous frame's sitting height.
  if(active&&role==='presenter'&&seatMotions.presenter.active)presenterAvatar.userData.animate(0,{speed:0});
  clientPose={x:clientAvatar.position.x,z:clientAvatar.position.z,yaw:role==='client'?yaw:clientAvatar.rotation.y-Math.PI,pitch:role==='client'?pitch:-.04};
  if(active){const acting=clientAvatar.userData.actionUntil>now;if(acting){clientSpeed=0;const target=people[clientAvatar.userData.actionTarget];if(target)clientAvatar.userData.face(Math.atan2(target.position.x-clientAvatar.position.x,target.position.z-clientAvatar.position.z));}clientAvatar.userData.animate(dt,{speed:clientSpeed,gesture:'idle',lookAt:people[clientAvatar.userData.actionTarget]?.position||presenterAvatar.position});collaboratorAvatar.userData.animate(dt,{speed:collaboratorSpeed,lookAt:collaboratorAvatar.userData.attentionUntil>now?people[collaboratorAvatar.userData.attentionFrom]?.position:null});}
  for(const item of attentionRings){item.ring.visible=item.until>now;item.ring.material.opacity=.45+.4*Math.sin(now*.009)**2;}
  if(now-lastPublish>100){const actor=people[role],pose={arriving:role==='client'&&!previewOffice&&arrivalIntro.active,arrivalDoor:role==='client'?arrivalDoor:undefined,x:actor.position.x,z:actor.position.z,heading:actor.rotation.y,...(role==='presenter'?{door:{angle:world.entryDoor.angle,open:world.entryDoor.targetOpen,obstructed:world.entryDoor.obstructed}}:{}),seat:{id:actor.userData.seatId||null,weight:actor.userData.seated||0},speed:role==='client'?clientSpeed:role==='presenter'?presenterSpeed:collaboratorSpeed,gesture:actor.userData.animation?.gesture||'idle'};if(poseRate.shouldSend(now,pose))visitControls.publishPose(pose);lastPublish=now;}
  canvas.dataset.following=String(following);canvas.dataset.clientSpeed=clientSpeed.toFixed(3);canvas.dataset.collaboratorVisible=String(collaboratorAvatar.visible);canvas.dataset.collaboratorSeated=String(collaboratorAvatar.userData.seated||0);
  canvas.dataset.clientAvatarVisible=String(clientAvatar.visible);
  canvas.dataset.clientPosition=[clientAvatar.position.x,clientAvatar.position.z].map(v=>v.toFixed(3)).join(',');
  if(active&&!introRunning){const zone=world.locationAt(camera.position.x,camera.position.z);if(zone!==pendingNarration){pendingNarration=zone;narrationDwell=0;}else narrationDwell+=dt;if(narrationDwell>1.6)narrator.visit(zone);}
  canvas.dataset.seated=String(people[role].userData.seated||0);canvas.dataset.seatId=people[role].userData.seatId||'';
  canvas.dataset.presenterDistance=Math.hypot(camera.position.x-presenterAvatar.position.x,camera.position.z-presenterAvatar.position.z).toFixed(2);
  // The office is static, but the articulated host needs fresh light shadows.
  renderer.shadowMap.autoUpdate=false;
  if(active&&shadowRefresh.update(now,Object.values(people)))renderer.shadowMap.needsUpdate=true;
  if(canvas.dataset.avatarVisible!==String(presenterAvatar.visible))renderer.shadowMap.needsUpdate=true;
  canvas.dataset.look=[yaw,pitch].map(v=>v.toFixed(3)).join(',');
  const locationName=world.locationAt(role==='client'&&presenterAvatar.visible?presenterAvatar.position.x:camera.position.x,role==='client'&&presenterAvatar.visible?presenterAvatar.position.z:camera.position.z);
  $('location').textContent=locationName.replace('Hall de ascensores','Arrival').replace('Piso 14','Floor 14').replace('Fondo del pasillo 2','Office · West wing').replace('Pasillo 1','Office · East wing').replace('Pasillo 2','Office · West wing').replace('Sala ','Meeting room ').replace('Cocina','Kitchen').replace('Acceso','Entrance');
  canvas.dataset.avatarVisible=String(presenterAvatar.visible);
  canvas.dataset.presenterPosition=[presenterAvatar.position.x,presenterAvatar.position.z].map(v=>v.toFixed(3)).join(',');
  canvas.dataset.hostAnimation=presenterAvatar.userData.animation?.speed>.02?'walking':presenterAvatar.userData.animation?.gesture||'idle';
  canvas.dataset.hostSpeed=String(presenterAvatar.userData.animation?.speed||0);
  canvas.dataset.presenterAnimationPhase=String(presenterAvatar.userData.animation?.phase||0);
  canvas.dataset.hostRouteLength=String(hostMotion?.distance||0);
  const savedCameraPosition=camera.position.clone(),savedCameraQuaternion=camera.quaternion.clone(),self=people[role],selfVisible=self.visible;
  for(const [person,avatar] of Object.entries(people))avatar.userData.mirrorSelf=person===role&&cameraView==='first';
  if(cameraView==='third'&&!introRunning){const view=thirdPersonPosition(self.position,yaw,(x,z)=>blocked(x,z,self.userData.seatId)),target=new THREE.Vector3(view.x,view.y,view.z);if(!thirdPersonCamera)thirdPersonCamera=target.clone();else{const next=thirdPersonCamera.clone().lerp(target,1-Math.exp(-dt*6));thirdPersonCamera.copy(blocked(next.x,next.z,self.userData.seatId)?target:next);}camera.position.copy(thirdPersonCamera);camera.lookAt(self.position.x,1.2,self.position.z);self.visible=Math.hypot(camera.position.x-self.position.x,camera.position.z-self.position.z)>.65;}else thirdPersonCamera=null;
  camera.updateMatrixWorld();avatarInteractions.update(now);seatInteractions.update();aimedDoor=doorNear&&!avatarInteractions.target&&!seatInteractions.target&&world.entryDoor.aimedAt(camera);$('door-action').hidden=!aimedDoor;$('crosshair').classList.toggle('has-action',Boolean(avatarInteractions.target||seatInteractions.target||aimedDoor));canvas.dataset.actionTarget=avatarInteractions.target||seatInteractions.target?.id||'';canvas.dataset.cameraView=cameraView;canvas.dataset.clientGesture=clientAvatar.userData.animation?.gesture||'idle';
  visuals.observeFrame?.(elapsed,active);renderer.info.reset();const renderStart=performance.now();visuals.render(dt);
  camera.position.copy(savedCameraPosition);camera.quaternion.copy(savedCameraQuaternion);camera.updateMatrixWorld();self.visible=selfVisible;
  renderTimes.push(performance.now()-renderStart);if(renderTimes.length>60)renderTimes.shift();
  // CPU submission time excludes hidden-tab throttling; it is not a GPU FPS estimate.
  canvas.dataset.renderCpuMs=(renderTimes.reduce((a,b)=>a+b,0)/renderTimes.length).toFixed(2);
  canvas.dataset.drawCalls=String(renderer.info.render.calls);
  canvas.dataset.triangles=String(renderer.info.render.triangles);
 });
 // Read-only diagnostics for checking the pilot.
 window.officePilot=Object.freeze({snapshot:()=>({position:camera.position.toArray(),yaw,pitch,paused:!$('welcome').hidden,blocked:blocked(camera.position.x,camera.position.z),render:{...renderer.info.render}})});
 window.addEventListener('pagehide',()=>visitAudioOutput.destroy(),{once:true});
}catch(error){fail(error);}
