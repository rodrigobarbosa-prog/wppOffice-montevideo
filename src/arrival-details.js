import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {renderProfile} from './render-profile.js';
import {registerPlanarReflection} from './planar-reflections.js';
import {arrival,entryBrandWall,entryVestibule} from './arrival-layout.js';

export function buildArrivalDetails({scene,group,box,rounded,cylinder,mat,map,label,white,steel,black,finish,glow,brandMat,solids,plant}){
 const wood=finish.wood,chrome=mat('#c9cbc9',{metalness:1,roughness:.17});
 const liftSteel=steel.clone();liftSteel.roughness=.72;liftSteel.bumpScale=.00004;
 const jamb=mat('#8d9392',{metalness:.8,roughness:.28});
 const mirrorObjects=[];
 // Closed facade details project into the hall. Keep the open office entry clear.
 for(const [x1,x2] of [[-2,-.95],[.95,9]])solids.push({x1,x2,z1:2.42,z2:2.61,bottom:0,top:2.55});
 for(const [x1,x2] of [[-2,5.8],[8.1,9]])solids.push({x1,x2,z1:0,z2:.17,bottom:0,top:2.55});
 function faceTexture(texture,w,h,x,y,z,rotation=0,physical=true){
  const material=physical?new THREE.MeshStandardMaterial({map:texture,roughness:.82}):new THREE.MeshBasicMaterial({map:texture});
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);
  plane.position.set(x,y,z);plane.rotation.y=rotation;group.add(plane);return plane;
 }
 function doorHardware(x,y,z,parent,side=1){
  // Two mounting feet, tubular pull, rose and small latch.
  for(const a of [-.44,.44])rounded(.032,.026,.055,x,y+a,z,chrome,parent,.008);
  cylinder(.012,1.02,x,y,z+side*.035,chrome,parent);
  const rose=cylinder(.026,.012,x+.08,y-.04,z,chrome,parent);rose.rotation.x=Math.PI/2;
 }
 function wallBay(x,side,width){
  const g=new THREE.Group();g.position.set(x,0,side==='far'?2.50:.12);g.rotation.y=side==='far'?Math.PI:0;group.add(g);
  return g;
 }
 for(const lift of arrival.lifts){
  if(lift.id==='C14')continue; // Animated cabin and doors, outside the static batch.
  const g=wallBay(lift.x,lift.side,2.35);
  box(2.35,2.42,.07,0,1.21,0,liftSteel,false,g);
  for(const side of [-1,1]){
   box(.86,2.17,.025,side*.438,1.085,.048,liftSteel,false,g);
   box(.20,2.42,.04,side*1.27,1.21,-.008,chrome,false,g);
  }
  box(.012,2.17,.008,0,1.085,.066,black,false,g);
  box(1.76,.028,.16,0,.014,.018,mat('#202625',{metalness:.55,roughness:.35}),false,g);
  // Red display in a brushed surround, nameplate and recessed call buttons.
  box(.57,.23,.022,0,2.50,.012,jamb,false,g);
  const display=label(lift.display,.45,.145,0,2.50,.026,0,'#16191b',lift.id==='F14'?'#465dff':'#f7473d',190);g.add(display);
  const plate=label(lift.id,.18,.17,-.98,1.58,.059,0,'#eeeee9','#253458',140);g.add(plate);
  rounded(.065,.20,.018,1.01,1.05,.049,chrome,g,.01);
  for(const y of [.99,1.10]){const b=cylinder(.013,.009,1.01,y,.066,steel,g);b.rotation.x=Math.PI/2;}
 }
 for(const door of arrival.woodDoors){
  const g=wallBay(door.x,door.side,door.width);
  box(door.width,2.43,.11,0,1.215,0,wood,false,g);
  for(const side of [-1,1])box(.08,2.43,.15,side*(door.width/2+.04),1.215,-.012,wood,false,g);
  box(door.width+.16,.08,.15,0,2.47,-.012,wood,false,g);
  box(door.width+.20,.025,.17,0,2.525,-.008,chrome,false,g);
  const leafWidth=Math.min(1.06,door.width-.12);
  for(const side of [-1,1])box(.007,2.32,.004,side*leafWidth/2,1.16,.058,mat('#4f3121'),false,g);
  box(leafWidth,.007,.004,0,2.32,.058,mat('#4f3121'),false,g);
  doorHardware(door.width>1.8?-.34:.32,1.12,.066,g);
  const number=label(door.number,.16,.10,-door.width*.34,2.04,.067,0,'#f4f1e9','#30374a',170);g.add(number);
  if(door.sign)for(const y of [1.77,1.47]){
   const sign=label(door.sign,.42,.19,door.width*.24,y,.068,0,'#e9e6dc','#43494c',90);g.add(sign);
  }
  if(door.number==='1404')rounded(.08,.16,.055,.31,.95,.082,black,g,.006);
 }
 // Full-height mirror strips in steel frames. Shared guard prevents paired mirrors recursing.
 for(const spec of arrival.mirrors){
  const z=spec.side==='far'?2.491:.151,rotation=spec.side==='far'?Math.PI:0;
  const mirror=new Reflector(new THREE.PlaneGeometry(spec.width,2.37),{color:0xf0f0eb,textureWidth:renderProfile.mirrorWidth,textureHeight:renderProfile.mobile?256:1024,clipBias:.003,multisample:renderProfile.mirrorSamples});
  mirror.position.set(spec.x,1.205,z);mirror.rotation.y=rotation;
  registerPlanarReflection(scene,mirror,{mobile:renderProfile.mobile,maxDistance:renderProfile.mobile?6:14});
  mirror.name='Hall mirror';scene.add(mirror);mirrorObjects.push(mirror);
  for(const dx of [-1,1])box(.020,2.43,.055,spec.x+dx*(spec.width/2+.012),1.215,z,chrome);
  for(const y of [.014,2.415])box(spec.width+.045,.022,.055,spec.x,y,z,chrome);
 }
 // End doors have a visible leaf, rebated frame, paired pull and sanitary sign.
 for(const door of arrival.endDoors){
  const g=new THREE.Group();g.position.set(door.x,0,1.3);g.rotation.y=door.x<0?Math.PI/2:-Math.PI/2;group.add(g);
  const doorWhite=mat('#f2efe5',{roughness:.54});
  box(door.width,2.22,.052,0,1.11,0,doorWhite,false,g);
  for(const side of [-1,1])box(.065,2.33,.085,side*(door.width/2+.03),1.165,-.014,doorWhite,false,g);
  box(door.width+.13,.065,.085,0,2.30,-.014,doorWhite,false,g);
  box(.005,2.17,.004,door.width/2-.022,1.1,.030,mat('#aaa99e'),false,g);
  for(const offset of [-.015,.015])doorHardware(door.handleSide*.34+offset,1.10,.042,g);
  const sign=map((c,w,h)=>{
   c.fillStyle='#ebe9df';c.fillRect(0,0,w,h);c.strokeStyle='#bcbcb4';c.lineWidth=8;c.strokeRect(5,5,w-10,h-10);
   c.fillStyle='#333d6d';
   for(const [x,female] of [[w*.30,true],[w*.70,false]]){
    c.beginPath();c.arc(x,h*.25,h*.075,0,Math.PI*2);c.fill();
    c.fillRect(x-h*.075,h*.37,h*.15,h*.31);
    if(female){c.beginPath();c.moveTo(x,h*.38);c.lineTo(x-h*.16,h*.70);c.lineTo(x+h*.16,h*.70);c.closePath();c.fill();}
    for(const d of [-1,1])c.fillRect(x+d*h*.055-h*.018,h*.64,h*.035,h*.23);
   }
  },512,256);
  if(door.x>0){const p=faceTexture(sign,.24,.13,0,1.76,.036);g.add(p);}
  rounded(.075,.13,.025,-door.handleSide*.70,1.13,.012,doorWhite,g,.008);
  box(.016,.035,.012,-door.handleSide*.70,1.145,.032,steel,false,g);
 }
 // Continuous grey skirting and brushed headers, rather than isolated flat blocks.
 for(const z of [.016,2.579])box(10.8,.105,.018,3.5,.052,z,mat('#b2b1a9',{roughness:.65}));
 for(const x of [-1.985,8.985])for(const z of [.30,2.30])box(.018,.105,.57,x,.052,z,mat('#b2b1a9'));
 for(const z of [.02,2.58])box(10.9,.12,.10,3.5,2.67,z,white);
 // Detectors, sprinkler heads and security camera visible in the two hallway photos.
 for(const x of [-.8,3.1,7.3]){
  cylinder(.075,.035,x,2.714,1.3,mat('#e9e6db'));
  cylinder(.053,.022,x,2.684,1.3,mat('#c6c4bc'));
  cylinder(.006,.025,x+.60,2.691,1.3,steel);cylinder(.024,.007,x+.60,2.675,1.3,chrome);
 }
 const dome=new THREE.Mesh(new THREE.SphereGeometry(.055,24,16,0,Math.PI*2,0,Math.PI/2),mat('#242c30',{roughness:.16}));dome.rotation.z=Math.PI;dome.position.set(-1.74,2.55,1.3);group.add(dome);
 rounded(.12,.08,.12,-1.74,2.59,1.3,white,group,.025);
 // Inner entry return: the former long uninterrupted wall misses this corner.
 const vestibule=entryVestibule,returnDepth=vestibule.z2-vestibule.z1,returnZ=(vestibule.z1+vestibule.z2)/2;
 const returnFace=vestibule.x+vestibule.thickness/2;
 box(vestibule.thickness,vestibule.height,returnDepth,vestibule.x,vestibule.height/2,returnZ,white,true);
 rounded(.022,.105,returnDepth,returnFace+.012,.052,returnZ,mat('#aaa9a1'),group,.004);
 // Recessed plaster ceiling over the little entry alcove, with perimeter trim.
 box(2.40,.07,returnDepth,6.94,2.82,returnZ,mat('#d2d1c8',{roughness:.95}));
 box(.14,.17,returnDepth,returnFace+.07,2.715,returnZ,white);
 box(2.40,.17,.14,6.94,2.715,vestibule.z1+.07,white);
 const red=mat('#b51e29',{roughness:.34}),fireZ=vestibule.fireZ;
 cylinder(.082,.43,returnFace+.12,.54,fireZ,red);
 cylinder(.077,.026,returnFace+.12,.315,fireZ,red);
 cylinder(.030,.065,returnFace+.12,.785,fireZ,steel);
 rounded(.018,.025,.19,returnFace+.12,.83,fireZ+.025,red,group,.007);
 rounded(.018,.016,.17,returnFace+.12,.86,fireZ+.02,red,group,.006);
 const fireLabel=cylinder(.083,.25,returnFace+.12,.53,fireZ,mat('#eeeee7',{roughness:.75}));
 const hoseCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(returnFace+.14,.80,fireZ-.02),new THREE.Vector3(returnFace+.16,.78,fireZ-.14),new THREE.Vector3(returnFace+.16,.57,fireZ-.16),new THREE.Vector3(returnFace+.16,.35,fireZ-.10)]);
 const hose=new THREE.Mesh(new THREE.TubeGeometry(hoseCurve,20,.009,8,false),black);hose.castShadow=true;group.add(hose);
 rounded(.018,.70,.024,returnFace+.025,1.11,fireZ,red,group,.004);
 const extinguisherSign=map((c,w,h)=>{
  c.fillStyle='#f0eee2';c.fillRect(0,0,w,h);c.fillStyle='#bf2430';c.fillRect(12,12,w-24,h-24);
  c.fillStyle='#fff';c.fillRect(w*.39,h*.24,w*.23,h*.45);c.fillRect(w*.46,h*.14,w*.07,h*.11);
  c.strokeStyle='#fff';c.lineWidth=14;c.beginPath();c.moveTo(w*.51,h*.18);c.lineTo(w*.70,h*.13);c.moveTo(w*.43,h*.25);c.bezierCurveTo(w*.20,h*.25,w*.27,h*.64,w*.28,h*.69);c.stroke();
  c.font='bold 48px Arial';c.textAlign='center';c.fillText('EXTINTOR',w/2,h*.90,w*.87);
 },512,640);
 faceTexture(extinguisherSign,.17,.22,returnFace+.033,1.55,fireZ,Math.PI/2);
 // Visible surface conduit, small controller and paired switches from the photo.
 rounded(.018,.075,.11,returnFace+.025,1.83,-1.15,white,group,.004);
 rounded(.022,.027,.53,returnFace+.018,1.83,-.84,white,group,.004);
 rounded(.022,.43,.025,returnFace+.018,1.63,-.575,white,group,.004);
 rounded(.025,.14,.085,returnFace+.024,1.37,-.575,white,group,.006);
 for(const y of [1.34,1.40])rounded(.007,.035,.052,returnFace+.040,y,-.575,mat('#c1c1b9'),group,.003);
 solids.push({x1:returnFace,x2:returnFace+.22,z1:fireZ-.20,z2:fireZ+.17,bottom:.28,top:.87});
 // Main office door hardware / reader, fixed signage beside the open leaves.
 // Photo 25: branded return wall, tall cabinet and printer beside the glazing.
 const firstBrandChild=group.children.length,firstBrandSolid=solids.length;
 const b=entryBrandWall,w=b.x2-b.x1;
 box(w,2.85,.14,(b.x1+b.x2)/2,1.425,-.07,white,true);
 // Blue-marked photo reference: full-height return behind both storage units.
 // In world space this spans x=8.2..9.85, perpendicular to the WPP plane.
 box(.14,2.85,b.returnDepth,b.x2,1.425,b.returnDepth/2,white,true);
 box(.32,.28,b.returnDepth,b.x2+.09,2.71,b.returnDepth/2,white);
 box(.025,.105,b.returnDepth,b.x2+.083,.052,b.returnDepth/2,mat('#b2b1a9',{roughness:.65}));
 const graphic=map((c,textureWidth,textureHeight)=>{
  const cw=1536,ch=1792;c.scale(textureWidth/cw,textureHeight/ch);
  c.fillStyle='#efede6';c.fillRect(0,0,cw,ch);
  c.save();c.beginPath();c.moveTo(0,ch*.20);c.bezierCurveTo(cw*.12,ch*.32,cw*.24,ch*.29,cw*.31,ch*.26);c.bezierCurveTo(cw*.48,ch*.34,cw*.39,ch*.47,cw*.43,ch*.56);c.bezierCurveTo(cw*.53,ch*.65,cw*.41,ch*.73,cw*.49,ch*.83);c.bezierCurveTo(cw*.51,ch*.92,cw*.65,ch*.96,cw*.68,ch);c.lineTo(0,ch);c.closePath();c.clip();
  const g=c.createLinearGradient(0,ch,cw*.48,ch*.22);g.addColorStop(0,'#bd165f');g.addColorStop(.30,'#ca3187');g.addColorStop(.64,'#dc86ac');g.addColorStop(1,'#ecd7de');c.fillStyle=g;c.fillRect(0,0,cw,ch);
  for(const [x,y,r,colour] of [[.035,.88,.27,'#e4b72c'],[.23,.87,.25,'#a71769'],[.32,.58,.20,'#efc4d3'],[.06,.51,.20,'#c64189']]){
   const glow=c.createRadialGradient(cw*x,ch*y,0,cw*x,ch*y,cw*r);glow.addColorStop(0,colour+'d9');glow.addColorStop(1,colour+'00');c.fillStyle=glow;c.fillRect(0,0,cw,ch);
  }c.restore();
  // Staggered circular dots over custom W/P outlines; independent of font rasterisation.
  const mark=new Path2D();
  mark.moveTo(0,0);mark.lineTo(.12,0);mark.lineTo(.23,.69);mark.lineTo(.35,.08);mark.lineTo(.46,.08);mark.lineTo(.57,.69);mark.lineTo(.69,0);mark.lineTo(.81,0);mark.lineTo(.63,1);mark.lineTo(.51,1);mark.lineTo(.405,.45);mark.lineTo(.30,1);mark.lineTo(.18,1);mark.closePath();
  for(const x of [.92,1.53]){mark.moveTo(x,1);mark.lineTo(x,0);mark.lineTo(x+.26,0);mark.bezierCurveTo(x+.64,0,x+.64,.62,x+.26,.62);mark.lineTo(x+.12,.62);mark.lineTo(x+.12,1);mark.closePath();mark.moveTo(x+.12,.13);mark.lineTo(x+.12,.49);mark.lineTo(x+.26,.49);mark.bezierCurveTo(x+.46,.49,x+.46,.13,x+.26,.13);mark.closePath();}
  const hit=document.createElement('canvas').getContext('2d');
  c.fillStyle='#17213a';const markHeight=ch*.115,markScale=cw*.46/2.08,startX=cw*.355,startY=ch*.255;
  for(let row=0;row<19;row++)for(let col=0;col<43;col++){
   const x=(col+(row%2)*.5)*.05,y=row/18;
   if(hit.isPointInPath(mark,x,y,'evenodd')){c.beginPath();c.ellipse(startX+x*markScale,startY+y*markHeight,5.8,6.1,0,0,Math.PI*2);c.fill();}
  }
  c.font='bold 190px Arial';c.textAlign='center';c.fillText('Production',cw*.57,ch*.49,cw*.86);
 },renderProfile.mobile?1024:4096,renderProfile.mobile?1024:4096);
 graphic.anisotropy=16;
 faceTexture(graphic,w,2.43,(b.x1+b.x2)/2,1.315,b.z-.002,Math.PI);
 box(w,.28,.32,(b.x1+b.x2)/2,2.71,-.16,white);
 const emergencyFirst=group.children.length;
 // Luminaire over the pilaster: a dark housing and translucent illuminated blade.
 rounded(.48,.085,.11,b.pierX,2.49,-.435,black,group,.012);
 box(.45,.18,.008,b.pierX,2.35,-.48,mat('#c8e4d7',{transparent:true,opacity:.28,roughness:.18,depthWrite:false}));
 label('SALIDA',.43,.17,b.pierX,2.35,-.497,Math.PI,null,'#21ed75',270);
 const fire=mat('#bc373a',{roughness:.45});
 rounded(.105,.17,.045,b.pierX,1.14,-.401,fire,group,.007);
 label('FIRE',.08,.07,b.pierX,1.16,-.426,Math.PI,'#b83735','#ffffff',130);
 label('○',.095,.11,b.pierX,1.66,-.377,Math.PI,'#f5eee0','#b63035',210);
 rounded(.17,.22,.008,b.pierX,2.08,-.377,white,group,.003);
 const exitPictogram=map((c,cw,ch)=>{
  c.fillStyle='#f0eee2';c.fillRect(0,0,cw,ch);c.fillStyle='#08764c';c.fillRect(12,12,cw-24,ch-24);
  c.strokeStyle='#f4f3df';c.fillStyle='#f4f3df';c.lineWidth=23;c.lineCap='round';
  c.beginPath();c.arc(cw*.28,ch*.23,21,0,Math.PI*2);c.fill();
  for(const pts of [[[.28,.36],[.23,.58],[.15,.68]],[[.26,.48],[.38,.57],[.43,.82]],[[.26,.44],[.39,.35],[.48,.43]]]){
   c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(cw*x,ch*y):c.moveTo(cw*x,ch*y));c.stroke();
  }
  c.fillRect(cw*.75,ch*.23,cw*.14,ch*.57);
  c.beginPath();c.moveTo(cw*.50,ch*.52);c.lineTo(cw*.68,ch*.52);c.lineTo(cw*.60,ch*.42);c.moveTo(cw*.68,ch*.52);c.lineTo(cw*.60,ch*.63);c.stroke();
 },768,512);
 const exitPanel=faceTexture(exitPictogram,.32,.23,b.pierX-.64,2.68,-.64,Math.PI,false);
 for(const dx of [-.12,.12])cylinder(.0025,.10,exitPanel.position.x+dx,2.82,exitPanel.position.z,steel);
 // Emergency signs face the storage return, matching the blue-marked photo.
 const emergencyTurn=new THREE.Matrix4().makeTranslation(2.23,0,.06).multiply(new THREE.Matrix4().makeRotationY(-Math.PI/2)).multiply(new THREE.Matrix4().makeTranslation(-b.pierX,0,0));
 for(const object of group.children.slice(emergencyFirst))object.applyMatrix4(emergencyTurn);
 rounded(.38,.045,.065,3.9,2.79,-1.04,white,group,.008);
 rounded(.31,.009,.046,3.9,2.763,-1.04,glow,group,.004);
 cylinder(.075,.035,3.4,2.80,-1.03,white);cylinder(.052,.020,3.4,2.774,-1.03,mat('#bdbeb4'));
 function orientFurniture(firstChild,firstSolid,piece){
  const matrix=new THREE.Matrix4().makeTranslation(piece.x,0,piece.z).multiply(new THREE.Matrix4().makeRotationY(piece.rotation)).multiply(new THREE.Matrix4().makeTranslation(-piece.x,0,-piece.z));
  for(const object of group.children.slice(firstChild))object.applyMatrix4(matrix);
  for(const solid of solids.slice(firstSolid)){
   const points=[[solid.x1,solid.z1],[solid.x1,solid.z2],[solid.x2,solid.z1],[solid.x2,solid.z2]].map(([x,z])=>new THREE.Vector3(x,0,z).applyMatrix4(matrix));
   solid.x1=Math.min(...points.map(p=>p.x));solid.x2=Math.max(...points.map(p=>p.x));solid.z1=Math.min(...points.map(p=>p.z));solid.z2=Math.max(...points.map(p=>p.z));
  }
 }
 const cabinet=b.cabinet,cabinetFirst=group.children.length,cabinetSolid=solids.length;
 box(cabinet.width,cabinet.height,cabinet.depth,cabinet.x,cabinet.height/2,cabinet.z,white,true);
 box(cabinet.width-.025,.025,cabinet.depth+.025,cabinet.x,cabinet.height+.012,cabinet.z,mat('#ebeae4'));
 for(const s of [-1,1]){
  rounded(cabinet.width/2-.012,cabinet.height-.055,.018,cabinet.x+s*cabinet.width*.25,cabinet.height/2,cabinet.z-cabinet.depth/2-.012,mat('#e5e5de'),group,.003);
  cylinder(.008,.23,cabinet.x+s*.028,1.02,cabinet.z-cabinet.depth/2-.032,steel);
 }
 for(let i=0;i<4;i++){const file=rounded(.42,.035,.30,cabinet.x+.045,2.06+i*.037,cabinet.z,mat(['#229bad','#387f97','#31b7b8','#b7d3d0'][i]),group,.005);file.rotation.y=(i-1.5)*.04;}
 cylinder(.043,.24,cabinet.x-.22,2.155,cabinet.z+.02,white);
 orientFurniture(cabinetFirst,cabinetSolid,cabinet);
 const p=b.printer,printerFirst=group.children.length,printerSolid=solids.length;
 box(p.width,.77,p.depth,p.x,.385,p.z,white,true);
 for(const y of [.23,.52]){box(p.width-.045,.012,.008,p.x,y,p.z-p.depth/2-.006,mat('#babdb8'));rounded(.12,.016,.021,p.x,y+.09,p.z-p.depth/2-.020,steel,group,.004);}
 rounded(.61,.42,.55,p.x,.99,p.z,mat('#e3e5df'),group,.022);
 rounded(.58,.055,.49,p.x,1.224,p.z+.015,black,group,.009);
 box(.43,.015,.31,p.x,1.262,p.z+.055,white);
 rounded(.19,.055,.13,p.x-.24,1.13,p.z-.28,black,group,.006);
 const display=box(.12,.006,.08,p.x-.24,1.161,p.z-.28,mat('#7cabb5'));display.rotation.x=.15;
 box(.38,.035,.24,p.x,.88,p.z-.32,black);
 orientFurniture(printerFirst,printerSolid,p);
 // Room 01's plant belongs behind its glass, built with the meeting furniture.
 // Rotate the entire return elevation and all its collisions together. The door
 // stays in z=0; the WPP plane is now perpendicular to it, facing west.
 const transform=new THREE.Matrix4().makeRotationY(b.rotation);transform.setPosition(b.origin.x,0,b.origin.z);
 for(const object of group.children.slice(firstBrandChild))object.applyMatrix4(transform);
 for(const solid of solids.slice(firstBrandSolid)){
  const corners=[[solid.x1,solid.z1],[solid.x1,solid.z2],[solid.x2,solid.z1],[solid.x2,solid.z2]].map(([x,z])=>new THREE.Vector3(x,0,z).applyMatrix4(transform));
  solid.x1=Math.min(...corners.map(p=>p.x));solid.x2=Math.max(...corners.map(p=>p.x));
  solid.z1=Math.min(...corners.map(p=>p.z));solid.z2=Math.max(...corners.map(p=>p.z));
 }
 return {mirrors:mirrorObjects};
}

