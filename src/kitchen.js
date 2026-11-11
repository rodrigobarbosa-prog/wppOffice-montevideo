import * as THREE from 'three';
import {kitchen} from './office-layout.js';
import {leafMesh} from './materials.js';

export function buildKitchen({scene,group,box,rounded,cylinder,mat,label,white,steel,black,glow,finish,solids}){
 const {x1,x2,z2,openingHeight}=kitchen,cx=(x1+x2)/2,width=x2-x1;
 const blue=mat('#203d8b',{roughness:.37}),cabinet=mat('#deded5',{roughness:.56}),tile=mat('#c3c5bd',{roughness:.47});
 box(width,.12,z2+.22,cx,-.05,(z2-.22)/2,tile);
 const floorTile=finish.tile.clone();floorTile.color.set('#b4bbb7');floorTile.roughness=.5;
 for(let x=x1;x<x2-.01;x+=.6)for(let z=-.20;z<z2-.01;z+=.6){
  const w=Math.min(.6,x2-x),d=Math.min(.6,z2-z);
  rounded(w-.004,.012,d-.004,x+w/2,.016,z+d/2,floorTile,group,.002);
 }
 box(.14,openingHeight,z2+.14,x1-.07,openingHeight/2,z2/2,white,true);
 box(.14,openingHeight,z2+.14,x2+.07,openingHeight/2,z2/2,white,true);
 box(width+.28,openingHeight,.14,cx,openingHeight/2,z2+.07,white,true);
 box(width+.28,.12,z2+.28,cx,openingHeight+.06,z2/2,white);
 // Rear run: lower cupboards, blue worktop/backsplash and upper storage.
 box(width-.22,.86,.59,cx,.43,z2-.33,cabinet,true);
 box(width-.24,.09,.51,cx,.045,z2-.33,mat('#787f7a'));
 rounded(width-.12,.035,.65,cx,.88,z2-.35,blue,group,.009);
 box(width-.18,.49,.025,cx,1.14,z2-.013,blue);
 for(let i=0;i<5;i++){
  const x=x1+.14+(i+.5)*(width-.28)/5;
  box(.009,.72,.01,x-(width-.28)/10,.48,z2-.632,mat('#a9aea8'));
  rounded(.18,.012,.02,x,.72,z2-.646,steel,group,.004);
 }
 for(let i=0;i<3;i++){
  const x=x2-.43-i*.63;
  rounded(.61,.73,.36,x,1.93,z2-.2,cabinet,group,.012);
  rounded(.16,.012,.022,x,1.62,z2-.395,steel,group,.004);
 }
 // Open shelf with cups and a microwave at eye level.
 for(const y of [1.55,2.28])box(1.11,.035,.34,x1+.63,y,z2-.23,cabinet);
 box(.035,.76,.34,x1+.07,1.92,z2-.23,cabinet);
 rounded(.63,.38,.34,x1+.68,1.76,z2-.25,steel,group,.012);
 rounded(.47,.27,.015,x1+.73,1.76,z2-.428,mat('#28363c'),group,.005);
 for(let i=0;i<5;i++){
  const x=x1+.32+i*.19;
  cylinder(.047,.11,x,2.35,z2-.24,mat(['#ece8d8','#b6c9c6','#9b6f89'][i%3]));
 }
 // Small appliances on the worktop, with their faces toward the office.
 rounded(.43,.31,.32,x1+.65,1.055,z2-.36,steel,group,.018);
 rounded(.32,.21,.014,x1+.62,1.065,z2-.528,black,group,.008);
 cylinder(.018,.025,x1+.815,1.07,z2-.54,steel).rotation.x=Math.PI/2;
 rounded(.22,.34,.23,cx+.2,1.065,z2-.33,black,group,.02);
 rounded(.17,.08,.15,cx+.2,.935,z2-.48,steel,group,.01);
 cylinder(.065,.16,cx+.65,.985,z2-.35,steel);
 // Side internal window: illuminated rose glass, metallic reveal and dispenser.
 const insideWindow=mat('#d5b9b6',{roughness:.38,emissive:'#d6a8a0',emissiveIntensity:.16});
 box(.026,.91,1.25,x1+.01,1.62,1.33,steel);
 box(.028,.82,1.15,x1+.027,1.62,1.33,insideWindow);
 rounded(.12,.36,.22,x1+.14,1.42,.43,cabinet,group,.025);
 // Breakfast bar leaves a clear walk-in opening on the vending-machine side.
 const barX=x1+1.1,barWidth=2.2;
 box(.15,.96,.69,x1+.13,.48,.05,cabinet,true);
 rounded(barWidth,.045,.70,barX,.99,.05,blue,group,.013);
 solids.push({x1:x1+.02,x2:x1+barWidth,z1:-.30,z2:.40,bottom:.965,top:1.02});
 box(.68,.90,.56,x1+1.85,.45,.10,cabinet,true);
 for(let i=0;i<3;i++){
  box(.59,.009,.015,x1+1.85,.22+i*.23,-.192,mat('#b1b6af'));
  rounded(.18,.012,.022,x1+1.85,.29+i*.23,-.205,steel,group,.004);
 }
 for(let i=0;i<3;i++){
  const x=x1+.25+i*.50,z=.68;
  rounded(.38,.055,.31,x,.73,z,black,group,.08);
  for(const side of [-1,1])for(const front of [-1,1])cylinder(.012,.70,x+side*.14,.36,z+front*.12,black);
  box(.3,.015,.016,x,.25,z-.12,steel);
  solids.push({x1:x-.20,x2:x+.20,z1:z-.18,z2:z+.18,bottom:0,top:.76});
 }
 for(const x of [cx-.66,cx+.66]){
  cylinder(.006,.43,x,2.24,.38,steel);
  const shade=new THREE.Mesh(new THREE.SphereGeometry(.16,20,10,0,Math.PI*2,0,Math.PI/2),steel);shade.position.set(x,1.88,.38);group.add(shade);
  cylinder(.145,.009,x,1.882,.38,glow);
 }
 cylinder(.085,.21,x1+.43,1.12,.05,mat('#305ba2',{roughness:.3}));
 for(let i=0;i<3;i++)cylinder(.025,.16,x1+.65+i*.07,1.09,.05,mat(['#83966d','#cbb49b','#8ca9ac'][i]));
 const light=new THREE.PointLight('#ffe4bd',7,5,2);light.position.set(cx,2.12,1.32);scene.add(light);
 // Wall decal beside the alcove, just as in the reference photograph.
 label('team',.38,.18,x1-.81,2.02,-.153,Math.PI,null,'#f0f5ee',350);
 label('J&J',1.25,.74,x1-1.13,1.60,-.154,Math.PI,null,'#edf4ee',450);
 // Separate high alarm sign and low manual call point, as in the close reference.
 const alarmX=x1-.34;
 box(.22,.34,.018,alarmX,2.05,-.154,mat('#e0dace'));
 const signCanvas=document.createElement('canvas');signCanvas.width=256;signCanvas.height=384;
 const sign=signCanvas.getContext('2d');sign.fillStyle='#bf595a';sign.fillRect(8,8,240,368);
 sign.strokeStyle='#f6ebdf';sign.lineWidth=7;sign.strokeRect(19,19,218,346);sign.strokeRect(30,30,196,226);
 sign.lineWidth=23;sign.beginPath();sign.arc(128,139,67,0,Math.PI*2);sign.stroke();
 sign.fillStyle='#fff1e4';sign.font='bold 29px Arial';sign.textAlign='center';sign.fillText('PULSADOR',128,301);sign.fillText('DE ALARMA',128,337);
 const signTexture=new THREE.CanvasTexture(signCanvas);signTexture.colorSpace=THREE.SRGBColorSpace;
 const alarmSign=new THREE.Mesh(new THREE.PlaneGeometry(.205,.325),new THREE.MeshStandardMaterial({map:signTexture,roughness:.7}));
 alarmSign.position.set(alarmX,2.05,-.165);alarmSign.rotation.y=Math.PI;group.add(alarmSign);
 rounded(.115,.165,.045,alarmX,1.10,-.174,mat('#ad282e',{roughness:.4}),group,.008);
 label('FIRE',.098,.043,alarmX,1.153,-.199,Math.PI,'#ab2830','#fff7ed',220);
 rounded(.080,.068,.008,alarmX,1.09,-.200,black,group,.004);
 label('PRESIONAR',.070,.024,alarmX,1.103,-.205,Math.PI,'#343b39','#f8f2e7',150);
 box(.065,.007,.008,alarmX,1.073,-.208,mat('#d9d8cb'));
 // A small plant at the base of the J&J wall (not a photographed person).
 box(.26,.3,.26,x1-.48,.15,-.56,mat('#c5c4ae'));
 cylinder(.009,.37,x1-.48,.40,-.56,mat('#65785a'));
 for(let i=0;i<9;i++){
  const a=i*2.4;
  const leaf=leafMesh(group,x1-.48+Math.sin(a)*.12,.38+(i%3)*.09,-.56+Math.cos(a)*.12,.12,.35,a);leaf.rotation.x=.18;
 }
}
