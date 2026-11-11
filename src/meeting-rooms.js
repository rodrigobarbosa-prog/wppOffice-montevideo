import * as THREE from 'three';
import {meetingRooms,meetingColumn} from './office-layout.js';

export function buildMeetingRooms({group,box,rounded,cylinder,mat,map,label,white,steel,black,finish,solids,officeChair,plant}){
 const frame=mat('#bfc5c3',{metalness:.6,roughness:.35});
 const glazing=new THREE.MeshStandardMaterial({color:'#c4dce0',transparent:true,opacity:.11,roughness:.10,metalness:.1,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true});
 const tableWood=finish.wood.clone();tableWood.roughness=.72;tableWood.clearcoat=.2;
 function frontPane(x,a,b){
  if(b-a<.02)return;
  const pane=new THREE.Mesh(new THREE.PlaneGeometry(b-a,2.43),glazing);pane.position.set(x,1.245,(a+b)/2);pane.rotation.y=-Math.PI/2;group.add(pane);
  solids.push({x1:x-.013,x2:x+.013,z1:a,z2:b,bottom:0,top:2.47});
 }
 function tabletop(cx,cz,width,length){
  const s=new THREE.Shape(),x=-width/2,y=-length/2,r=.17;
  s.moveTo(x+r,y);s.lineTo(x+width-r,y);s.quadraticCurveTo(x+width,y,x+width,y+r);
  s.lineTo(x+width,y+length-r);s.quadraticCurveTo(x+width,y+length,x+width-r,y+length);
  s.lineTo(x+r,y+length);s.quadraticCurveTo(x,y+length,x,y+length-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
  const geo=new THREE.ExtrudeGeometry(s,{depth:.045,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:2,curveSegments:8,steps:1});
  geo.rotateX(Math.PI/2);
  const p=geo.attributes.position,uv=geo.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,(p.getX(i)+width/2)/width,(p.getZ(i)+length/2)/length);
  const mesh=new THREE.Mesh(geo,tableWood);mesh.position.set(cx,.76,cz);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
  solids.push({x1:cx-width/2,x2:cx+width/2,z1:cz-length/2,z2:cz+length/2,bottom:.71,top:.77});
  for(const side of [-1,1]){
   const alongX=width>length,x=cx+(alongX?side*width*.28:0),z=cz+(alongX?0:side*length*.28);
   cylinder(.045,.67,x,.36,z,steel);rounded(alongX?.37:.70,.035,alongX?.70:.37,x,.035,z,black,group,.015);
  }
 }
 // The east facade needs actual framed windows behind the rooms, not a solid glass box.
 box(.12,.8,13.6,15.06,.4,-6.8,white,true);
 for(let z=-13.6,i=0;z<-.01;z+=1.6,i++){
  const span=Math.min(1.6,-z),center=z+span/2;
  const pane=new THREE.Mesh(new THREE.PlaneGeometry(span-.04,1.94),glazing);pane.position.set(15.005,1.8,center);pane.rotation.y=-Math.PI/2;group.add(pane);
  box(.07,2.85,.04,14.995,1.425,z,frame);
  const h=[.54,.68,.46,.62][i%4];box(.017,h,span-.04,14.94,2.74-h/2,center,mat('#d8d6c9',{roughness:.92,transparent:true,opacity:.83}));
  rounded(.026,.02,span-.04,14.93,2.74-h,center,frame,group,.005);
 }
 rounded(.22,.035,13.5,14.96,.82,-6.8,white,group,.009);
 // Both glazed fronts run along the east aisle. Room 01 continues the WPP return.
 for(const room of meetingRooms.filter(r=>r.frontAxis!=='x')){
  box(room.x2-room.x1,2.85,.12,(room.x1+room.x2)/2,1.425,room.z2,white,true);
 }
 // Both rooms share one continuous front; the partition closes their common edge.
 box(.65,2.85,.65,meetingColumn.x,1.425,meetingColumn.z,white,true);
 for(const room of meetingRooms){
  if(room.frontAxis==='x'){
   const {x1,x2,z1,z2,doorX,doorWidth}=room,cx=(x1+x2)/2,cz=(z1+z2)/2;
   const a=doorX-doorWidth/2,b=doorX+doorWidth/2;
   box(x2-x1,.36,.14,cx,2.67,z1,white);
   for(const y of [.025,2.485])box(x2-x1,.05,.065,cx,y,z1,frame);
   for(const [start,end] of [[x1,a],[b,x2]]){
    const count=Math.max(1,Math.ceil((end-start)/1.2));
    for(let i=0;i<count;i++){
     const from=start+(end-start)*i/count,to=start+(end-start)*(i+1)/count;
     const pane=new THREE.Mesh(new THREE.PlaneGeometry(to-from-.035,2.43),glazing);pane.position.set((from+to)/2,1.245,z1);group.add(pane);
     solids.push({x1:from,x2:to,z1:z1-.013,z2:z1+.013,bottom:0,top:2.47});
     box(.035,2.47,.065,from,1.235,z1,frame);
    }
    box(.035,2.47,.065,end,1.235,z1,frame);
   }
   const hinge=new THREE.Group();hinge.position.set(b,0,z1);hinge.rotation.y=Math.PI/2;group.add(hinge);
   const door=new THREE.Mesh(new THREE.PlaneGeometry(doorWidth-.045,2.39),glazing);door.position.set(-doorWidth/2,1.235,0);hinge.add(door);
   for(const x of [-.02,-doorWidth+.02])box(.035,2.44,.055,x,1.235,0,frame,false,hinge);
   for(const y of [.025,2.45])box(doorWidth,.035,.055,-doorWidth/2,y,0,frame,false,hinge);
   cylinder(.012,.70,-doorWidth+.12,1.12,-.07,steel,hinge);
   hinge.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(hinge);
   solids.push({x1:bounds.min.x,x2:bounds.max.x,z1:bounds.min.z,z2:bounds.max.z,bottom:0,top:2.47});
   const sign=map((c,w,h)=>{c.fillStyle='#b4c4c6';c.font='300 290px Arial';c.fillText('01',20,h*.73);c.font='500 90px Arial';c.fillText('MEET',w*.53,h*.44);c.fillText('POINT',w*.53,h*.71);},1024,512);
   const sticker=new THREE.Mesh(new THREE.PlaneGeometry(.58,.26),new THREE.MeshBasicMaterial({map:sign,transparent:true,depthWrite:false}));
   sticker.position.set(12.05,1.57,z1-.025);sticker.rotation.y=Math.PI;group.add(sticker);
   tabletop(cx,cz,room.tableLength,1.1);
   for(const x of [cx-.48,cx+.48]){officeChair(x,cz-.90,0);officeChair(x,cz+.90,Math.PI);}
   officeChair(cx-room.tableLength/2-.55,cz,Math.PI/2);officeChair(cx+room.tableLength/2+.55,cz,-Math.PI/2);
   rounded(.28,.025,.20,cx,.796,cz,black,group,.025);
   box(.62,.76,.42,14.55,.38,-.45,white,true);
   rounded(.66,.025,.46,14.55,.77,-.45,white,group,.006);
   rounded(.025,1.18,.90,8.27,1.49,-1.15,mat('#c3d9db',{roughness:.28}),group,.014);
   cylinder(.018,1.72,14.55,.86,-1.70,black);
   for(const dx of [-1,0,1]){const hook=cylinder(.009,.22,14.55+dx*.08,1.54,-1.70,black);hook.rotation.z=dx*.8;}
   plant(8.65,-.55,1.40);
   continue;
  }
  const {x1,x2,z1,z2,doorZ,doorWidth,id}=room,cx=room.tableX??(x1+x2)/2,cz=(z1+z2)/2;
  const a=doorZ-doorWidth/2,b=doorZ+doorWidth/2;
  // Head beam, threshold and properly spaced aluminium posts.
  box(.14,.36,z2-z1,x1,2.67,cz,white);
  for(const y of [.025,2.485])box(.065,.05,z2-z1,x1,y,cz,frame);
  const panels=[[z1,a],[b,z2]];
  for(const [start,end] of panels){
   const count=Math.max(1,Math.ceil((end-start)/1.2));
   for(let i=0;i<count;i++){
    const from=start+(end-start)*i/count,to=start+(end-start)*(i+1)/count;
    frontPane(x1,from+.018,to-.018);box(.065,2.47,.035,x1,1.235,from,frame);
   }
   box(.065,2.47,.035,x1,1.235,end,frame);
  }
  // A fixed open glass door swings into the room; its actual rotated bounds collide.
  const hinge=new THREE.Group();hinge.position.set(x1,0,a);hinge.rotation.y=Math.PI/2;group.add(hinge);
  const door=new THREE.Mesh(new THREE.PlaneGeometry(doorWidth-.045,2.39),glazing);door.rotation.y=-Math.PI/2;door.position.set(0,1.235,doorWidth/2);hinge.add(door);
  for(const z of [.02,doorWidth-.02])box(.055,2.44,.035,0,1.235,z,frame,false,hinge);
  for(const y of [.025,2.45])box(.055,.035,doorWidth,0,y,doorWidth/2,frame,false,hinge);
  cylinder(.012,.70,-.07,1.12,doorWidth-.12,steel,hinge);
  hinge.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(hinge);
  solids.push({x1:bounds.min.x,x2:bounds.max.x,z1:bounds.min.z,z2:bounds.max.z,bottom:0,top:2.47});
  const sign=map((c,w,h)=>{
   c.fillStyle='#c2cdcc';c.textBaseline='middle';c.font='300 310px Arial';c.fillText(id,10,h*.52);
   c.font='500 90px Arial';c.fillText('MEET',w*.57,h*.38);c.fillText('POINT',w*.57,h*.66);
  },1024,512);
  const labelPanel=panels.reduce((a,b)=>a[1]-a[0]>b[1]-b[0]?a:b),labelCount=Math.ceil((labelPanel[1]-labelPanel[0])/1.2);
  const labelZ=labelPanel[0]+(Math.floor(labelCount/2)+.5)*(labelPanel[1]-labelPanel[0])/labelCount;
  const sticker=new THREE.Mesh(new THREE.PlaneGeometry(.58,.26),new THREE.MeshBasicMaterial({map:sign,transparent:true,depthWrite:false}));
  sticker.rotation.y=-Math.PI/2;sticker.position.set(x1-.024,1.57,labelZ);group.add(sticker);
  tabletop(cx,cz,1.10,room.tableLength);
  const perSide=(room.seats-2)/2;
  for(let i=0;i<perSide;i++){
   const z=cz+(i-(perSide-1)/2)*.96;
   officeChair(cx-.98,z,Math.PI/2);officeChair(cx+.98,z,-Math.PI/2);
  }
  officeChair(cx,cz-room.tableLength/2-.55,0);officeChair(cx,cz+room.tableLength/2+.55,Math.PI);
  // Meeting equipment sits on the table rather than becoming interactive UI.
  if(id==='02')rounded(1.04,.008,.65,cx,.775,cz,black,group,.003);
  rounded(.28,.025,.20,cx,.796,cz,black,group,.025);
  rounded(.12,.035,.04,cx+.19,.80,cz+.23,black,group,.006);
  const cabinetZ=z1+.40,cabinetX=id==='01'?cx+1.25:x2-.70;
  box(.98,.76,.42,cabinetX,.38,cabinetZ,white,true);rounded(1.02,.025,.46,cabinetX,.77,cabinetZ,white,group,.007);
  for(const side of [-1,1])rounded(.10,.014,.025,cabinetX+side*.23,.64,cabinetZ-.225,steel,group,.004);
  if(id==='01'){
   // Large wall-mounted display on the solid end wall beside the cabinet.
   const displayX=cx+.50,displayY=1.77,displayZ=z1+.105;
   rounded(.65,.38,.045,displayX,displayY,z1+.075,black,group,.01);
   rounded(2.35,1.34,.065,displayX,displayY,displayZ,mat('#151b1e',{roughness:.3}),group,.025);
   const standby=map((c,w,h)=>{
    const gradient=c.createLinearGradient(0,0,w,h);gradient.addColorStop(0,'#102d33');gradient.addColorStop(1,'#050c12');c.fillStyle=gradient;c.fillRect(0,0,w,h);
    c.fillStyle='#d9e7e5';c.font='600 100px Arial';c.fillText('WPP Production',140,h*.48);
    c.fillStyle='#829e9f';c.font='32px Arial';c.fillText('MONTEVIDEO  /  MEET POINT 01',146,h*.59);
    c.fillStyle='#3a7772';c.fillRect(146,h*.67,90,4);
   },2048,1152);
   const display=new THREE.Mesh(new THREE.PlaneGeometry(2.28,1.2825),new THREE.MeshBasicMaterial({map:standby}));
   display.name='Meeting room 01 large display';display.position.set(displayX,displayY,displayZ+.034);group.add(display);
   rounded(.018,.008,.007,displayX+1.08,displayY-.647,displayZ+.035,mat('#82c0aa',{emissive:'#82c0aa',emissiveIntensity:.35}),group,.003);
   const board=mat('#c3d9db',{roughness:.28});rounded(1.85,1.18,.035,cx+.35,1.49,z2-.075,board,group,.015);
   rounded(1.80,.025,.07,cx+.35,.90,z2-.11,steel,group,.006);
   plant(x1+.46,z2-.5,1.52);
   const rackX=x1+1.12,rackZ=z2-.40;
   cylinder(.018,1.72,rackX,.86,rackZ,black);
   for(let i=0;i<3;i++){
    const angle=i*Math.PI*2/3;
    const foot=box(.025,.025,.32,rackX+Math.sin(angle)*.12,.035,rackZ+Math.cos(angle)*.12,black);foot.rotation.y=angle;
    const arm=cylinder(.009,.30,rackX+Math.sin(angle)*.09,1.55,rackZ+Math.cos(angle)*.09,black);arm.rotation.x=Math.sin(angle)*.8;arm.rotation.z=Math.cos(angle)*.8;
   }
  }else plant(x2-.52,z2-.5,1.62);
 }
 // Printer and tall storage now sit against the branded entry wall (photo 25),
 // constructed by buildArrivalDetails rather than floating beside the room frontage.
}
