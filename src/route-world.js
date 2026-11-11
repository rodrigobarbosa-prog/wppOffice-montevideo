import * as THREE from 'three';
import {materials,leafMesh} from './materials.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {partition,passageDesks,officeDesks,exteriorDesk,aisleEndDesk,chairYawForSide,serviceWall,kitchen,perimeterDesk,kitchenWindowBay,kitchenWindowDesk,officeWest,cornerColumn,meetingRooms,meetingColumn,officeShiftZ,collaboratorDesk} from './office-layout.js';
import {entryVestibule,entryBrandWall} from './arrival-layout.js';
import {createSurfaceMaterials} from './surface-materials.js';
import {ceilingPlan} from './ceiling-layout.js';
import {buildHarbor} from './harbor.js';
import {buildMeetingRooms} from './meeting-rooms.js';
import {buildKitchen} from './kitchen.js';
import {buildArrivalDetails} from './arrival-details.js';
import {buildEntryDoor} from './entry-door.js';
import {buildArrivalLift} from './arrival-lift.js';
import {partitionProfile,partitionSpans} from './partition-panels.js';

// Metres. Spatial sequence follows references 01–10; dimensions are estimates.
export const routeStops=[
 {name:'Ascensor C14',x:0,z:1.1},
 {name:'Cuadro frente al ascensor',x:0,z:.8},
 {name:'Hall hacia WPP Production',x:7,z:1.3},
 {name:'Acceso de madera',x:7,z:-.6},
 {name:'Entrada a la oficina',x:7,z:-3},
 {name:'Inicio del pasillo 2',x:1,z:-1.05},
 {name:'Fondo del pasillo 2',x:officeWest+1.2,z:-1.05}
];

export async function buildRouteWorld(scene){
 const chairRecords=[],solids=[],surfaces=[{x1:-2,x2:9,z1:0,z2:2.6,y:0},{x1:officeWest,x2:15,z1:-13.6+officeShiftZ,z2:officeShiftZ,y:0},{x1:kitchen.x1,x2:kitchen.x2,z1:officeShiftZ,z2:kitchen.z2+officeShiftZ,y:0},{x1:entryVestibule.x+entryVestibule.thickness/2,x2:15,z1:officeShiftZ,z2:0,y:0}];
 const library=materials();
 const materialCache=new Map();
 const mat=(color,extra={})=>{
  const cacheable=Object.values(extra).every(value=>value===null||['string','number','boolean'].includes(typeof value));
  if(!cacheable)return new THREE.MeshStandardMaterial({color,roughness:.8,...extra});
  const key=color+JSON.stringify(extra);if(!materialCache.has(key))materialCache.set(key,new THREE.MeshStandardMaterial({color,roughness:.8,...extra}));return materialCache.get(key);
 };
 const finish=createSurfaceMaterials();
 const white=finish.wall,steel=finish.steel,desk=finish.desk,chair=finish.chair;
 const trim=mat('#a5aba9',{metalness:.45,roughness:.42}),black=mat('#171e20',{roughness:.64});
 const glow=mat('#f9faf3',{emissive:'#fffbea',emissiveIntensity:.7});
 const group=new THREE.Group();scene.add(group);
 const roundedCache=new Map();
 function rounded(w,h,d,x,y,z,m,parent=group,r=.018){
  const radius=Math.min(r,w*.49,h*.49,d*.49),key=[w,h,d,radius].join(',');
  if(!roundedCache.has(key))roundedCache.set(key,new RoundedBoxGeometry(w,h,d,2,radius));
  const mesh=new THREE.Mesh(roundedCache.get(key),m);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
 }
 function box(w,h,d,x,y,z,m=white,solid=false,parent=group){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
  // Painted walls use metre-scaled mapping instead of stretching a texture across a wall.
  if(m===white){
   const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,uv=mesh.geometry.attributes.uv;
   for(let i=0;i<uv.count;i++){
    const px=x+p.getX(i),py=y+p.getY(i),pz=z+p.getZ(i);
    uv.setXY(i,Math.abs(n.getX(i))>.5?pz:px,Math.abs(n.getY(i))>.5?pz:py);
   }
  }
  if(m===finish.wood){
   // Consistent veneer scale on doors, broad panels and jambs; grain stays vertical.
   const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,uv=mesh.geometry.attributes.uv;
   for(let i=0;i<uv.count;i++){
    const horizontal=Math.abs(n.getX(i))>.5?z+p.getZ(i):x+p.getX(i);
    uv.setXY(i,horizontal/.95,(y+p.getY(i))/3.2);
   }
  }
  if(solid)solids.push({x1:x-w/2,x2:x+w/2,z1:z-d/2,z2:z+d/2,bottom:y-h/2,top:y+h/2});return mesh;
 }
 const cylinderCache=new Map();
 function cylinder(r,h,x,y,z,m=steel,parent=group){
  const key=[r,h].join(',');if(!cylinderCache.has(key))cylinderCache.set(key,new THREE.CylinderGeometry(r,r,h,20));
  const mesh=new THREE.Mesh(cylinderCache.get(key),m);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
 }
 function map(draw,w=1024,h=512){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
 function label(text,w,h,x,y,z,rotation=0,bg='#deded6',color='#303d43',font=90){
  const texture=map((c,cw,ch)=>{if(bg){c.fillStyle=bg;c.fillRect(0,0,cw,ch);}c.fillStyle=color;c.font=`500 ${font}px Arial`;c.textAlign='center';c.textBaseline='middle';c.fillText(text,cw/2,ch/2,cw*.94);});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,transparent:!bg}));mesh.position.set(x,y,z);mesh.rotation.y=rotation;group.add(mesh);return mesh;
 }
 const wood=finish.wood,carpet=finish.carpet,ceiling=finish.ceiling;
 const glass=new THREE.MeshStandardMaterial({color:'#dce9e5',transparent:true,opacity:.16,roughness:.09,metalness:.05,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true});
 const frostMap=map((c,w,h)=>{
  const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#9cc7c8');g.addColorStop(.5,'#a5cdcd');g.addColorStop(1,'#5a969c');c.fillStyle=g;c.fillRect(0,0,w,h);
  for(let i=0;i<14000;i++){const x=(i*73.7)%w,y=(i*41.3)%h;c.fillStyle=i%2?'#ffffff0c':'#2b6e790a';c.fillRect(x,y,1,3);}
 },512,512);
 const frosted=new THREE.MeshStandardMaterial({map:frostMap,color:'#dce9e5',roughness:.48,metalness:.08,emissive:'#6d9999',emissiveIntensity:.1});
 // Hall: cream centre strip, grey borders, three steel lifts and opposite artwork.
 const greyTile=finish.tile.clone();greyTile.color.set('#b8b6af');greyTile.roughness=.32;
 const grout=mat('#aaa99f',{roughness:.9});
 box(11,.12,2.6,3.5,-.06,1.3,grout);
 for(let x=-1.6;x<9;x+=.8){
  for(const z of [.98,1.62])rounded(.794,.022,.634,x,.001,z,finish.tile,group,.004);
  for(const z of [.32,2.28])rounded(.794,.022,.634,x,.001,z,greyTile,group,.004);
 }
 // Real opening into C14; side bays and the lintel remain solid.
 box(1.05,2.75,.13,-1.475,1.375,2.67,white,true);box(8.05,2.75,.13,4.975,1.375,2.67,white,true);
 box(1.9,.35,.13,0,2.575,2.67,white,true);
 surfaces.push({x1:-1.01,x2:1.01,z1:2.55,z2:4.68,y:0});
 solids.push({x1:-1.12,x2:-1.01,z1:2.55,z2:4.77,bottom:0,top:2.6},{x1:1.01,x2:1.12,z1:2.55,z2:4.77,bottom:0,top:2.6},{x1:-1.12,x2:1.12,z1:4.68,z2:4.77,bottom:0,top:2.6});
 const arrivalLift=buildArrivalLift(scene,finish.steel);arrivalLift.set(0,10);
 box(.13,2.75,2.6,-2.06,1.375,1.3,white,true);box(.13,2.75,2.6,9.06,1.375,1.3,white,true);
 box(7.8,2.75,.14,1.9,1.375,-.07,white,true);box(.9,2.75,.14,8.55,1.375,-.07,white,true);
 box(2.4,.38,.15,7,2.56,0,wood);
 // North wall opening x=5.8..8.1 joins hall and office without a loading screen.
 // Alternating lift / mirror / timber bays are built by buildArrivalDetails below.
 // Original painting: a texture of the artwork only, extracted at runtime from reference 02.
 box(1.28,.98,.055,0,1.65,.045,mat('#e9e4d6'));
 box(1.03,.76,.02,0,1.65,.08,black);
 const artworkSource=await new THREE.TextureLoader().loadAsync('/assets/references/02.jpg');
 const artwork=map((c,w,h)=>{const img=artworkSource.image;c.drawImage(img,img.width*.208,img.height*.336,img.width*.383,img.height*.374,0,0,w,h);},1024,768);
 artworkSource.dispose();
 const painting=new THREE.Mesh(new THREE.PlaneGeometry(.98,.72),new THREE.MeshStandardMaterial({map:artwork,roughness:1}));painting.position.set(0,1.65,.095);group.add(painting);
 // Doors opposite the lift bank and bathroom at the end of the hall.
 // Fixed jambs; the closed leaves are animated independently of static batching.
 for(const side of [-1,1]){
  box(.13,2.43,.22,7+side*1.12,1.215,0,wood,true);
 }
 const brand=map((c,w,h)=>{c.fillStyle='#f2efeb';c.fillRect(0,0,w,h);const g=c.createLinearGradient(w*.4,0,w,h);g.addColorStop(0,'#f3dfb3');g.addColorStop(.4,'#ed9aa1');g.addColorStop(.7,'#cf6198');g.addColorStop(1,'#efd174');c.fillStyle=g;c.beginPath();c.ellipse(w*.82,h*.58,w*.4,h*.8,-.5,0,Math.PI*2);c.fill();c.fillStyle='#444b50';c.font='bold 120px Arial';c.fillText('WPP',80,210);c.font='65px Arial';c.fillText('Production',80,305);});
 const brandMat=new THREE.MeshBasicMaterial({map:brand});
 const entryDoor=buildEntryDoor({scene,box,cylinder,rounded,label,wood,steel,black,brandMat});
 box(.1,.25,.045,8.25,1.18,.09,black);label('14',.055,.045,8.25,1.24,.116,0,'#3a6b9d','#bce0ed');
 // Office shell: room sequence follows entry (06), overview (07), aisle (08–10).
 const officeFirstChild=group.children.length,officeFirstSolid=solids.length;
 const officeWidth=15-officeWest,officeCenter=(officeWest+15)/2;
 for(const texture of [carpet.map,carpet.bumpMap,carpet.roughnessMap])texture.repeat.x=officeWidth/2;
 box(officeWidth,.13,13.6,officeCenter,-.065,-6.8,carpet);
 // Split the south wall around a genuine open kitchen alcove.
 for(const [x1,x2] of [[officeWest,kitchen.x1],[kitchen.x2,5.8]])box(x2-x1,2.85,.14,(x1+x2)/2,1.425,-.07,white,true);
 box(kitchen.x2-kitchen.x1,2.85-kitchen.openingHeight,.14,(kitchen.x1+kitchen.x2)/2,(2.85+kitchen.openingHeight)/2,-.07,white);
 // South exterior windows; room 01 now fronts the east aisle farther inside.
 // Its glass is recessed behind the perpendicular storage return (photo 31).
 box(1.05,2.85,.14,8.625,1.425,-.07,white,true);
 box(5.85,.78,.14,12.075,.39,-.07,white,true);
 for(let i=0;i<4;i++){
  const span=5.85/4,x=9.15+i*span;
  box(span-.04,1.97,.025,x+span/2,1.805,-.035,glass);
  box(.045,2.85,.075,x,1.425,-.065,trim);
  box(span-.04,.46,.018,x+span/2,2.58,-.108,mat('#dfdccf',{roughness:.92,transparent:true,opacity:.76}));
 }
 box(5.85,.06,.10,12.075,2.815,-.065,white);
 rounded(5.85,.035,.24,12.075,.80,-.14,white,group,.006);
 // The far side of passage 2 is a window frontage, not a blank wall.
 box(.14,.8,13.6,officeWest-.07,.4,-6.8,white,true);
 const westWindowBays=[];
 for(let z=-13.6;z<kitchenWindowBay.z1-.01;z+=1.55)westWindowBays.push({z1:z,z2:Math.min(z+1.55,kitchenWindowBay.z1)});
 westWindowBays.push(kitchenWindowBay);
 for(const [i,bay] of westWindowBays.entries()){
  const z=bay.z1,span=bay.z2-z,center=z+span/2;
  box(.025,1.95,span-.045,officeWest-.08,1.8,center,glass);
  box(.08,2.85,.045,officeWest-.03,1.425,z,trim);
  const height=[1.04,1.28,.5,1.12][i%4];
  const roll=cylinder(.025,span-.045,officeWest+.04,2.76,center,white);roll.rotation.x=Math.PI/2;
  box(.018,height,span-.045,officeWest+.04,2.74-height/2,center,mat('#d7d4c7',{transparent:true,opacity:.83,roughness:.92}));
  rounded(.025,.018,span-.045,officeWest+.05,2.74-height,center,trim,group,.006);
 }
 rounded(.22,.035,13.5,officeWest+.04,.82,-6.8,white,group,.009);

 box(officeWidth,.8,.12,officeCenter,.4,-13.6,white,true);
 for(let x=officeWest,i=0;x<15-.01;x+=1.55,i++){
  const span=Math.min(1.55,15-x),windowWidth=span-.045,windowCenter=x+span/2;
  box(.045,2.85,.08,x,1.425,-13.54,trim);
  box(windowWidth,1.95,.025,windowCenter,1.8,-13.58,glass);
  const blindHeight=[.54,.70,.86,.63][i%4];
  cylinder(.026,windowWidth,windowCenter,2.76,-13.45,white).rotation.z=Math.PI/2;
  box(windowWidth,blindHeight,.018,windowCenter,2.74-blindHeight/2,-13.45,mat('#d7d4c7',{transparent:true,opacity:.83,roughness:.92}));
  rounded(windowWidth,.018,.025,windowCenter,2.74-blindHeight,-13.44,trim,group,.006);
 }
 box(officeWidth,.045,.12,officeCenter,.83,-13.47,trim);
 // Skirting, window sills and a metal threshold make structural joins readable.
 const skirting=mat('#9b9e99',{metalness:.35,roughness:.55});
 for(const [x1,x2] of [[officeWest,kitchen.x1],[kitchen.x2,5.8],[8.1,15]])rounded(x2-x1,.09,.018,(x1+x2)/2,.045,-.151,skirting,group,.004);
 rounded(.018,.09,13.4,officeWest+.015,.045,-6.8,skirting,group,.004);
 rounded(officeWidth-.2,.09,.018,officeCenter,.045,-13.525,skirting,group,.004);
 rounded(officeWidth-.2,.035,.22,officeCenter,.82,-13.43,white,group,.009);
 buildHarbor({scene,group,box,cylinder,mat,map});
 // Make the connecting aisle on the south wall explicit and unobstructed.
 const frameArtwork=map((c,w,h)=>{
  const gradient=c.createLinearGradient(0,h*.8,w,h*.15);
  for(const [stop,color] of [[0,'#ebce6a'],[.2,'#e5a498'],[.45,'#d6609c'],[.65,'#eca886'],[.82,'#e6ce69'],[1,'#dd73a2']])gradient.addColorStop(stop,color);
  c.fillStyle=gradient;c.fillRect(0,0,w,h);
  c.fillStyle='#f2efdf9c';c.beginPath();c.moveTo(0,0);c.lineTo(w,0);c.bezierCurveTo(w*.7,h*.6,w*.4,h*.02,0,h*.32);c.closePath();c.fill();
  c.fillStyle='#fff6d33b';c.beginPath();c.moveTo(0,h*.7);c.bezierCurveTo(w*.3,h*.23,w*.65,h*1.25,w,h*.5);c.lineTo(w,h);c.lineTo(0,h);c.closePath();c.fill();
 },2048,512);
 const frameMaterial=mat('#ffffff',{map:frameArtwork,roughness:.72});
 function frameBox(w,h,d,x,y,z,solid=true){
  const mesh=box(w,h,d,x,y,z,frameMaterial,solid),positions=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv;
  // A single artwork follows the whole border, rather than restarting on each beam.
  for(let i=0;i<uv.count;i++)uv.setXY(i,(z+positions.getZ(i)-partition.z1)/(partition.z2-partition.z1),(y+positions.getY(i))/2.85);
  uv.needsUpdate=true;return mesh;
 }
 frameBox(partitionProfile.columnSize,2.85,partitionProfile.columnSize,partition.x,1.425,partitionProfile.columnZ);
 const columnArtwork=map((c,w,h)=>{
  c.fillStyle='#eeeee3';c.fillRect(0,0,w,h);
  const g=c.createLinearGradient(w*.15,h*.1,w*.85,h*.7);g.addColorStop(0,'#c94389');g.addColorStop(.28,'#dc597e');g.addColorStop(.49,'#e4b663');g.addColorStop(.64,'#eee6b3');g.addColorStop(.83,'#d27c9f');g.addColorStop(1,'#bf4790');
  c.fillStyle=g;c.beginPath();c.moveTo(w*.18,0);c.bezierCurveTo(w*1.2,h*.05,w*.05,h*.4,w*.85,h*.65);c.bezierCurveTo(w*1.3,h*.95,w*.32,h*1.2,w*.18,h*.85);c.bezierCurveTo(-w*.2,h*.35,w*.45,h*.4,w*.18,0);c.fill();
 },512,1024);
 const columnMat=mat('#ffffff',{map:columnArtwork,roughness:.75});
 // The window-side column was absent in the comparison view; place it on that run.
 for(const [x,z] of [[3.3,-12.95],[cornerColumn.x,cornerColumn.z]]){
  box(.65,2.85,.65,x,1.425,z,columnMat,true);
  rounded(.13,.11,.025,x,1.13,z+.34,trim,group,.009);box(.10,.05,.008,x,1.145,z+.356,mat('#35464c'));
 }
 const motto=map((c,w,h)=>{
  c.textBaseline='top';c.font='bold 240px Arial';
  for(const [i,text] of ['Making','ideas','happen.'].entries()){c.fillStyle=i===2?'#db806f':'#d25a9e';c.fillText(text,28,40+i*315,w-56);}
 },1024,1024);
 const mottoMesh=new THREE.Mesh(new THREE.PlaneGeometry(serviceWall.mottoWidth,1.75),new THREE.MeshBasicMaterial({map:motto,transparent:true}));mottoMesh.position.set(serviceWall.mottoX,1.55,-.151);mottoMesh.rotation.y=Math.PI;group.add(mottoMesh);
 box(.32,.16,.045,serviceWall.mottoX,2.52,-.17,white);label('← SALIDA',.29,.12,serviceWall.mottoX,2.52,-.197,Math.PI,'#287852','#ffffff',330);
 // Photo 07 is a LEFT camera turn. Original partition parallels the long desks.
 const partitionZ=(partition.z1+partition.z2)/2;
 const panelSpans=partitionSpans(partition),profile=partitionProfile,glassHeight=profile.glassTop-profile.glassBottom,glassY=(profile.glassTop+profile.glassBottom)/2;
 frameBox(profile.frameWidth,2.85,profile.endPostDepth,partition.x,1.425,partition.z1);
 for(const span of panelSpans){
  // Butt against the end post / column, rather than burying complete beams in
  // them: their shared top faces otherwise fight after static batching.
  frameBox(.10,.66,span.length,partition.x,.33,span.center);
  box(.025,glassHeight,span.length,partition.x,glassY,span.center,frosted,true);
  frameBox(profile.frameWidth,.55,span.length,partition.x,2.575,span.center);
  for(const y of [profile.glassBottom,profile.glassTop])box(profile.railWidth,.04,span.length,partition.x,y,span.center,trim);
 }
 for(let z=partition.z1+.43;z<=partition.z2;z+=.43){
  if(!panelSpans.some(span=>z-.009>=span.z1&&z+.009<=span.z2))continue;
  for(const side of [-1,1])box(.018,glassHeight,.018,partition.x+side*.026,glassY,z,mat('#8db8b9',{metalness:.5,roughness:.32}));
 }
 const logoSource=await new THREE.TextureLoader().loadAsync('/assets/references/13-mampara-frontal.jpg');
 const logo=map((c,w,h)=>{
  const img=logoSource.image;
  const reference=document.createElement('canvas');reference.width=w;reference.height=1;
  const referenceContext=reference.getContext('2d');referenceContext.drawImage(img,img.width*.242,img.height*.383,img.width*.59,1,0,0,w,1);
  const background=referenceContext.getImageData(0,0,w,1).data;
  c.drawImage(img,img.width*.242,img.height*.397,img.width*.59,img.height*.121,0,0,w,h);
  const pixels=c.getImageData(0,0,w,h);
  for(let i=0;i<pixels.data.length;i+=4){
   const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];
   pixels.data[i]=27;pixels.data[i+1]=58;pixels.data[i+2]=76;
   const column=(i/4)%w,offset=column*4;
   const contrast=Math.min(background[offset]-r,background[offset+1]-g,background[offset+2]-b);
   const row=Math.floor(i/4/w);
   pixels.data[i+3]=row>h*.06&&row<h*.79&&b>g+10&&g>r+8?Math.max(0,Math.min(255,(contrast-22)*12)):0;
  }
  c.putImageData(pixels,0,0);
 },2048,384);logoSource.dispose();
 const logoMat=new THREE.MeshBasicMaterial({map:logo,transparent:true,alphaTest:.12,side:THREE.FrontSide,depthWrite:false});
 for(const side of [-1,1]){
  const logoMesh=new THREE.Mesh(new THREE.PlaneGeometry(6.8,.83),logoMat);logoMesh.position.set(partition.x+side*.057,1.76,partitionZ);logoMesh.rotation.y=side*Math.PI/2;group.add(logoMesh);
 }
 function plant(x,z,height=1.55){
  box(.35,.39,.35,x,.195,z,mat('#c8c2ae'),true);box(.3,.015,.3,x,.397,z,mat('#4c4030'));
  cylinder(.015,height-.3,x,(height+.3)/2,z,mat('#806447'));
  for(let i=0;i<14;i++){const a=i*2.4,y=.65+(i%6)*.16;leafMesh(group,x+Math.sin(a)*.25,y,z+Math.cos(a)*.25,.19,.35,a);}
 }
 plant(3,-.62);
 // Coat stand beside the port-facing column, without adding a person or avatar.
 for(const [coatStandX,coatStandZ,hasCoat] of [[4.05,-12.45,true],[cornerColumn.x+.4,cornerColumn.z+.4,false]]){
 cylinder(.018,1.72,coatStandX,.86,coatStandZ,black);
 for(let i=0;i<3;i++){
  const a=i*Math.PI*2/3;
  const foot=box(.025,.025,.38,coatStandX+Math.sin(a)*.14,.035,coatStandZ+Math.cos(a)*.14,black);foot.rotation.y=a;
  const branch=cylinder(.009,.4,coatStandX+Math.sin(a)*.12,1.6,coatStandZ+Math.cos(a)*.12,black);branch.rotation.z=Math.cos(a)*.7;branch.rotation.x=Math.sin(a)*.7;
 }
 if(hasCoat){
  rounded(.27,1.12,.065,coatStandX+.10,1.02,coatStandZ+.045,mat('#a09d90',{roughness:.96}),group,.03);
  rounded(.16,.67,.07,coatStandX+.28,1.1,coatStandZ+.05,mat('#888b80',{roughness:.95}),group,.03).rotation.z=.16;
 }
 }
 box(.17,.2,.07,cornerColumn.x,2.62,cornerColumn.z+.36,mat('#c4bc96'));
 // Keyboard/monitor screen assets contain generic examples, never photographed client work.
 const screens=Array.from({length:4},(_,i)=>new THREE.MeshBasicMaterial({map:map((c,w,h)=>{
  c.fillStyle=['#e2e6e9','#dce2e7','#232b35','#e6e2e0'][i];c.fillRect(0,0,w,h);c.fillStyle='#3a4552';c.fillRect(0,0,w,36);c.fillStyle='#8392a3';c.fillRect(0,37,110,h);c.fillStyle=i===2?'#7389a5':'#f6f5f1';c.fillRect(180,75,600,365);c.fillStyle=['#d2b6aa','#879bba','#93b8b6','#cdb8c7'][i];c.fillRect(210,100,540,155);c.fillStyle='#9ca6ad';for(let j=0;j<6;j++)c.fillRect(210,285+j*20,400-(j%3)*50,6);
 })}));
 const keyMaterial=new THREE.MeshStandardMaterial({map:map((c,w,h)=>{c.fillStyle='#1f2629';c.fillRect(0,0,w,h);c.fillStyle='#465054';for(let row=0;row<4;row++)for(let col=0;col<12;col++)c.fillRect(12+col*83,12+row*124,69,102);}),roughness:.85});
 // One reusable sculpted shell: tapered shoulders, rounded corners and a flexible waist.
 const backOutline=new THREE.Shape();
 backOutline.moveTo(-.15,-.25);backOutline.quadraticCurveTo(-.23,-.25,-.225,-.14);
 backOutline.bezierCurveTo(-.19,-.02,-.255,.12,-.235,.23);
 backOutline.quadraticCurveTo(-.23,.275,-.17,.275);backOutline.lineTo(.17,.275);
 backOutline.quadraticCurveTo(.23,.275,.235,.23);
 backOutline.bezierCurveTo(.255,.12,.19,-.02,.225,-.14);
 backOutline.quadraticCurveTo(.23,-.25,.15,-.25);backOutline.closePath();
 const backGeometry=new THREE.ExtrudeGeometry(backOutline,{depth:.025,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.014,bevelThickness:.009,curveSegments:6});
 const backPosition=backGeometry.attributes.position;
 for(let i=0;i<backPosition.count;i++){
  const x=backPosition.getX(i),y=backPosition.getY(i);
  backPosition.setZ(i,backPosition.getZ(i)+x*x*.8-y*.12);
 }
 backGeometry.computeVertexNormals();
 const wheelRubber=mat('#101518',{roughness:.92}),shell=mat('#30383a',{roughness:.48});
 function officeChair(x,z,rotation){
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;group.add(g);
  const seatId='chair-'+chairRecords.length;chairRecords.push({id:seatId,group:g});
  rounded(.50,.06,.47,0,.422,0,shell,g,.028);
  rounded(.49,.09,.465,0,.467,.006,chair,g,.065);
  const back=new THREE.Mesh(backGeometry,chair);back.position.set(0,.78,-.215);back.castShadow=back.receiveShadow=true;g.add(back);
  // Separate spine and lumbar support give the rear a recognisable office-chair profile.
  const spine=rounded(.075,.42,.045,0,.64,-.255,shell,g,.018);spine.rotation.x=-.15;
  rounded(.35,.07,.055,0,.64,-.17,chair,g,.025);
  rounded(.22,.055,.21,0,.395,0,black,g,.018);
  cylinder(.028,.28,0,.25,0,steel,g);cylinder(.047,.15,0,.17,0,shell,g);
  for(let i=0;i<5;i++){
   const a=i*Math.PI*.4;
   const leg=rounded(.037,.038,.29,Math.sin(a)*.15,.115,Math.cos(a)*.15,shell,g,.014);leg.rotation.y=a;
   const caster=new THREE.Group();caster.position.set(Math.sin(a)*.29,.057,Math.cos(a)*.29);caster.rotation.y=a;g.add(caster);
   cylinder(.017,.07,0,.034,0,steel,caster);
   for(const side of [-1,1]){const wheel=cylinder(.037,.021,side*.019,-.012,0,wheelRubber,caster);wheel.rotation.z=Math.PI/2;}
  }
  for(const side of [-1,1]){
   rounded(.034,.19,.038,side*.26,.55,-.015,shell,g,.01);
   rounded(.07,.04,.245,side*.26,.655,.025,chair,g,.018);
  }
  const lever=cylinder(.009,.14,.18,.385,.08,black,g);lever.rotation.z=-1.2;
  solids.push({x1:x-.27,x2:x+.27,z1:z-.27,z2:z+.27,bottom:0,top:1.02,seatId});
 }
 function bench(x,z,seats=4,length=seats*1.3,rotation=0,wall=false,single=false,wallSide=-1){
  const firstChild=group.children.length,firstSolid=solids.length;
  const depth=wall?.75:single?.93:1.5,offset=wall?wallSide*.375:0;
  rounded(length,.055,depth,x,.74,z+offset,desk);
  solids.push({x1:x-length/2,x2:x+length/2,z1:z+offset-depth/2,z2:z+offset+depth/2,bottom:.7125,top:.7675});
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(length+.25,2.5),library.contact);shadow.rotation.x=-Math.PI/2;shadow.position.set(x,.012,z);group.add(shadow);
  box(length-.12,.045,.035,x,.65,z,steel);
  // Recessed frame and cable tray, shared by the entire bench.
  rounded(length-.18,.065,.04,x,.68,z+offset-depth/2+.065,trim);
  rounded(length-.18,.065,.04,x,.68,z+offset+depth/2-.065,trim);
  box(length-.3,.07,.15,x,.60,z+offset,black);
  for(const side of [-1,1])for(const end of [-1,1])box(.045,.72,.045,x+end*(length/2-.12),.36,z+offset+side*(depth/2-.09),steel);
  for(let i=0;i<seats;i++){
   const sx=x-length/2+(i+.5)*length/seats;
   for(const side of wall?[wallSide]:single?[1]:[-1,1]){
    const sz=z+(single?0:side*.26),rotation=side===1?0:Math.PI;
    const g=new THREE.Group();g.position.set(sx,0,sz);g.rotation.y=rotation;group.add(g);
    const dual=i%2===0&&!single,monitorX=dual?-.24:0;
    rounded(.52,.32,.024,monitorX,1.06,0,black,g,.008);
    rounded(.31,.19,.027,monitorX,1.052,-.02,shell,g,.012);
    const screen=new THREE.Mesh(new THREE.PlaneGeometry(.48,.275),screens[(i+(side===1?1:0))%4]);screen.position.set(monitorX,1.065,.019);g.add(screen);
    if(x===collaboratorDesk.x&&z===collaboratorDesk.z&&i===0&&side===1&&!wall)screen.userData.collaboratorScreen=true;
    const neck=rounded(.033,.16,.025,monitorX,.866,-.025,steel,g,.007);neck.rotation.x=-.15;
    rounded(.20,.012,.145,monitorX,.778,.015,black,g,.012);
    const power=cylinder(.0018,.001,monitorX+.225,.915,.013,glow,g);power.rotation.x=Math.PI/2;
    if(dual){
     const monitor=new THREE.Group();monitor.position.set(.29,0,.025);monitor.rotation.y=-.12;g.add(monitor);
     rounded(.43,.30,.024,0,1.06,0,black,monitor,.008);
     rounded(.27,.17,.026,0,1.052,-.02,shell,monitor,.012);
     const secondScreen=new THREE.Mesh(new THREE.PlaneGeometry(.395,.26),screens[(i+2)%4]);secondScreen.position.set(0,1.065,.019);monitor.add(secondScreen);
     rounded(.03,.16,.025,0,.866,-.025,steel,monitor,.006);rounded(.17,.012,.14,0,.778,.015,black,monitor,.01);
    }
    rounded(.36,.017,.12,0,.784,.28,black,g,.004);rounded(.055,.025,.09,.26,.79,.28,black,g,.008);
    // Key grid is one texture, avoiding thousands of extra objects.
    const keyGrid=new THREE.Mesh(new THREE.PlaneGeometry(.33,.1),keyMaterial);keyGrid.rotation.x=-Math.PI/2;keyGrid.position.set(0,.794,.28);g.add(keyGrid);
    if(!wall&&!single)box(1.14,.3,.016,0,.91,-.12,mat('#adb6b5'),false,g);
    if(i%2===0)cylinder(.035,.12,sx+.37,.83,z+side*.49,mat('#c9b89d'));
    officeChair(sx,z+side*(single?.82:1.08),chairYawForSide(side));
   }
  }
  if(rotation){
   const c=Math.cos(rotation),s=Math.sin(rotation);
   for(const mesh of group.children.slice(firstChild)){const dx=mesh.position.x-x,dz=mesh.position.z-z;mesh.position.x=x+dx*c+dz*s;mesh.position.z=z-dx*s+dz*c;mesh.rotateOnWorldAxis(new THREE.Vector3(0,1,0),rotation);}
   for(const solid of solids.slice(firstSolid)){
    const cx=(solid.x1+solid.x2)/2-x,cz=(solid.z1+solid.z2)/2-z,w=solid.x2-solid.x1,d=solid.z2-solid.z1;
    const nx=x+cx*c+cz*s,nz=z-cx*s+cz*c,hw=(Math.abs(c)*w+Math.abs(s)*d)/2,hd=(Math.abs(s)*w+Math.abs(c)*d)/2;
    Object.assign(solid,{x1:nx-hw,x2:nx+hw,z1:nz-hd,z2:nz+hd});
   }
  }
 }
 for(const row of [...passageDesks,...officeDesks,exteriorDesk,perimeterDesk,kitchenWindowDesk,aisleEndDesk])bench(row.x,row.z,row.seats,row.length,row.rotation,row.wall,row.single,row.wallSide);
 buildMeetingRooms({group,box,rounded,cylinder,mat,map,label,white,steel,black,finish,solids,officeChair,plant});
 // Photo pair 4: service door, fire equipment, vending machines and coffee corner.
 const serviceFirstChild=group.children.length,serviceFirstSolid=solids.length;
 const serviceX=-11.8;
 rounded(1.03,2.22,.055,serviceX,1.11,-.17,trim,group,.008);
 rounded(.94,2.12,.045,serviceX,1.06,-.205,white,group,.008);
 const handle=cylinder(.012,.14,serviceX+.29,1.02,-.25,steel);handle.rotation.z=Math.PI/2;
 box(.13,.04,.025,serviceX+.28,1.02,-.25,steel);
 box(.24,.06,.06,serviceX-.22,2.10,-.25,steel);
 box(.16,.12,.022,-10.7,1.32,-.16,mat('#c9c8b7'));box(.12,.05,.008,-10.7,1.345,-.178,mat('#466c75'));
 for(let i=0;i<4;i++){box(.07,.13,.018,-10.25+i*.085,1.12,-.16,white);box(.035,.04,.01,-10.25+i*.085,1.135,-.175,trim);}
 const fireRed=mat('#bc3734',{roughness:.48});
 cylinder(.072,.48,-12.85,.42,-.36,fireRed);box(.13,.04,.05,-12.85,.68,-.36,black);
 label('EXTINTOR',.21,.15,-12.85,1.25,-.165,Math.PI,'#b82a2e','#ffffff',250);
 const fireArm=box(.03,.51,.03,-12.85,.76,-.34,fireRed);fireArm.rotation.z=-.6;
 const machineTexture=map((c,w,h)=>{
  c.fillStyle='#1c2429';c.fillRect(0,0,w,h);c.fillStyle='#57626a';c.fillRect(15,15,w-30,h-30);
  c.fillStyle='#131e25';c.fillRect(35,60,w*.68,h*.69);
  const colors=['#bb7357','#b7b58c','#799198','#d3b56a','#8f5557'];
  for(let row=0;row<5;row++)for(let col=0;col<5;col++){
   c.fillStyle=colors[(row+col)%5];c.fillRect(49+col*64,85+row*120,42,70);c.fillStyle='#a5a8a1';c.fillRect(40+col*64,164+row*120,60,6);
  }
  c.fillStyle='#426b80';c.fillRect(w*.78,120,70,90);c.fillStyle='#222c30';c.fillRect(70,h*.80,w*.56,70);
 },512,1024);
 const vendingFace=mat('#ffffff',{map:machineTexture,roughness:.36,metalness:.2});
 for(const [index,x] of [-14.4,-15.42].entries()){
  rounded(.93,1.99,.62,x,.995,-.46,black,group,.02);
  solids.push({x1:x-.47,x2:x+.47,z1:-.78,z2:-.14,bottom:0,top:1.99});
  const face=new THREE.Mesh(new THREE.PlaneGeometry(.84,1.85),vendingFace);face.position.set(x,1.01,-.783);face.rotation.y=Math.PI;group.add(face);
  if(!index)rounded(.08,1.9,.045,x-.38,1,-.81,steel,group,.01);
 }
 // Move this whole wall ensemble together, including vending-machine collisions.
 const serviceShift=serviceWall.doorX-serviceX;
 for(const mesh of group.children.slice(serviceFirstChild))mesh.position.x+=serviceShift;
 for(const solid of solids.slice(serviceFirstSolid)){solid.x1+=serviceShift;solid.x2+=serviceShift;}
 buildKitchen({scene,group,box,rounded,cylinder,mat,label,white,steel,black,glow,finish,solids});
 // Acoustic ceiling grids and recessed fixtures, sized independently for each room.
 function ceilingGrid(x1,x2,z1,z2,height,hall=false){
  const obstacles=hall?[]:[
   {x1:partition.x-.075,x2:partition.x+.075,z1:partition.z1,z2:partition.z2},
   {x1:8.04,x2:8.28,z1:-2.55,z2:0},
   {x1:8.13,x2:15,z1:-2.63,z2:-2.47},
   {x1:9.77,x2:9.93,z1:-13.6,z2:-2.55},
   {x1:9.85,x2:15,z1:-8.28,z2:-8.12},
   ...[[partition.x,-2.4],[3.3,-12.95],[meetingColumn.x,meetingColumn.z],[cornerColumn.x,cornerColumn.z]].map(([x,z])=>({x1:x-.335,x2:x+.335,z1:z-.335,z2:z+.335}))
  ];
  const plan=ceilingPlan({x1,x2,z1,z2,hall,obstacles});
  // Tiles sit above their supporting T profiles. No coplanar surfaces or floating lamps.
  box(x2-x1,.06,z2-z1,(x1+x2)/2,height+.06,(z1+z2)/2,mat('#91958f'));
  const tileX=hall?1.2:.6,tileZ=.6;
  const tileMaterial=hall?ceiling.clone():ceiling;
  if(hall){tileMaterial.emissive.set('#eeece3');tileMaterial.emissiveIntensity=.12;}
  for(let x=x1;x<x2-.01;x+=tileX)for(let z=z1;z<z2-.01;z+=tileZ){
   const w=Math.min(tileX,x2-x),d=Math.min(tileZ,z2-z);
   box(w-.008,.018,d-.008,x+w/2,height+.014,z+d/2,tileMaterial);
  }
  const profile=mat(hall?'#e0ddd4':'#c2c7c3',{metalness:hall?.15:.55,roughness:.48});
  const railWidth=hall?.012:.018;
  for(const rail of plan.rails)box(Math.max(railWidth,rail.x2-rail.x1),.014,Math.max(railWidth,rail.z2-rail.z1),(rail.x1+rail.x2)/2,height-.005,(rail.z1+rail.z2)/2,profile);
  for(const {x,z,width,depth} of plan.fixtures){
   if(hall){
    cylinder(.112,.014,x,height-.014,z,steel);const disk=cylinder(.098,.008,x,height-.024,z,glow);disk.receiveShadow=false;
   }else{
    // Recessed dark well, narrow frame, diffuser tubes and transverse louvres.
    box(width,.036,depth,x,height-.014,z,steel);
    box(width-.038,.008,depth-.038,x,height-.035,z,mat('#cbd0c9',{roughness:.6}));
    for(const side of [-1,1])box(width,.022,.018,x,height-.036,z+side*(depth/2-.009),profile);
    for(const side of [-1,1])box(.018,.022,depth,x+side*(width/2-.009),height-.036,z,profile);
    for(const side of [-1,0,1])rounded(width-.08,.016,.09,x,height-.043,z+side*.17,glow,group,.008);
    for(let k=0;k<6;k++)box(.018,.018,depth-.04,x-width/2+.09+k*(width-.18)/5,height-.055,z,profile);
   }
  }
 }
 ceilingGrid(officeWest,15,-13.6,0,2.85);
 const ventMap=map((c,w,h)=>{c.fillStyle='#bfc5bf';c.fillRect(0,0,w,h);c.strokeStyle='#697570';c.lineWidth=3;for(let x=20;x<w-20;x+=12){c.beginPath();c.moveTo(x,18);c.lineTo(x,h-18);c.stroke();}},512,512);
 const ventMat=mat('#ffffff',{map:ventMap,roughness:.7,metalness:.2});
 for(const [x,z] of [[-9.1,-6.1],[4.7,-6.1],[-3.1,-10.3]]){
  box(.58,.025,.58,x,2.835,z,trim);
  const vent=new THREE.Mesh(new THREE.PlaneGeometry(.53,.53),ventMat);vent.rotation.x=Math.PI/2;vent.position.set(x,2.82,z);group.add(vent);
  cylinder(.075,.025,x+.65,2.825,z+.65,white);cylinder(.05,.025,x+.65,2.8,z+.65,trim);
 }
 // Translate all office architecture, furniture, rooms and their collisions as
 // one assembly. The long wall now meets the extinguisher wall at a true 90°.
 for(const object of group.children.slice(officeFirstChild))object.position.z+=officeShiftZ;
 for(const solid of solids.slice(officeFirstSolid)){solid.z1+=officeShiftZ;solid.z2+=officeShiftZ;}
 const entryFloorX=entryVestibule.x+entryVestibule.thickness/2;
 box(15-entryFloorX,.13,-officeShiftZ,(15+entryFloorX)/2,-.065,officeShiftZ/2,carpet);
 ceilingGrid(-2,9,0,2.6,2.75,true);
 ceilingGrid(entryFloorX,15,officeShiftZ,0,2.85);
 buildArrivalDetails({scene,group,box,rounded,cylinder,mat,map,label,white,steel,black,finish,glow,brandMat,solids,plant});
 // Entrance threshold and inner jambs belong to the fixed arrival, not the office shift.
 rounded(2.15,.018,.14,7,.01,-.005,steel,group,.004);
 for(const [length,x] of [[7.8,1.9],[.9,8.55]])rounded(length,.09,.018,x,.045,.012,skirting,group,.004);
 for(const side of [-1,1])rounded(.045,2.42,.19,7+side*1.19,1.21,0,wood,group,.01);
 // Close the short recessed connection to the translated room frontage.
 const roomFront=entryBrandWall.origin.x+entryBrandWall.returnDepth;
 box(.14,2.85,-officeShiftZ,roomFront,1.425,-entryBrandWall.x2+officeShiftZ/2,white,true);
 const ambient=new THREE.HemisphereLight('#e5eff5','#827b6b',.9);scene.add(ambient);
 const sun=new THREE.DirectionalLight('#fff1df',2.4);sun.position.set(-5,7,-19);sun.target.position.set(-3,0,-6);scene.add(sun.target);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-22;sun.shadow.camera.right=22;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;sun.shadow.camera.near=.5;sun.shadow.camera.far=50;sun.shadow.normalBias=.018;sun.shadow.bias=-.0001;scene.add(sun);
 for(const x of [-8,6]){const fill=new THREE.PointLight('#f3f4e8',8,12,2);fill.position.set(x,2.55,-5);scene.add(fill);}
 const officeKey=new THREE.SpotLight('#fff4df',22,14,Math.PI*.43,.8,2);officeKey.position.set(4,2.7,-3);officeKey.target.position.set(4,0,-5);officeKey.castShadow=true;officeKey.shadow.mapSize.set(1024,1024);officeKey.shadow.normalBias=.012;officeKey.shadow.bias=-.0001;scene.add(officeKey,officeKey.target);
 for(const x of [.3,4.2,7.9]){const hallLight=new THREE.PointLight('#fff3df',5,6,2);hallLight.position.set(x,2.48,1.3);scene.add(hallLight);}
 // Batch the static opaque office by material. Keep transparent panes separate for sorting.
 group.updateMatrixWorld(true);
 const batches=new Map();
 group.traverse(mesh=>{
  if(!mesh.isMesh||mesh.material.transparent||Array.isArray(mesh.material))return;
  const key=mesh.material.uuid+':'+Boolean(mesh.geometry.index);
  if(!batches.has(key))batches.set(key,[]);batches.get(key).push(mesh);
 });
 for(const meshes of batches.values()){
  if(meshes.length<2)continue;
  const geometries=meshes.map(mesh=>mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));
  const merged=mergeGeometries(geometries,false);geometries.forEach(geometry=>geometry.dispose());
  if(!merged)continue;
  const mesh=new THREE.Mesh(merged,meshes[0].material);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
  meshes.forEach(part=>part.removeFromParent());
 }
 const seats=chairRecords.map(record=>{record.group.updateWorldMatrix(true,false);const p=record.group.getWorldPosition(new THREE.Vector3());return {id:record.id,x:p.x,z:p.z,yaw:record.group.rotation.y,height:.50};});
 return {entryDoor,arrivalLift,seats,office:{solids,surfaces},spawn:{x:0,z:1.8,yaw:0},locationAt:(x,worldZ)=>{
  const z=worldZ-officeShiftZ,room=meetingRooms.find(r=>x>r.x1&&x<r.x2&&z>r.z1&&z<r.z2);
  return room?'Sala '+room.id+' · MEET POINT':z>=0&&z<kitchen.z2&&x>kitchen.x1&&x<kitchen.x2?'Cocina · WPP Production':worldZ>=0?'Hall de ascensores · Piso 14':worldZ>officeShiftZ&&x>4?'Acceso · WPP Production':x>partition.x?'Pasillo 1 · WPP Production':x>officeWest+4?'Pasillo 2 · WPP Production':'Fondo del pasillo 2';
 }};
}






