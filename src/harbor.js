import * as THREE from 'three';

// Photo-informed port scenery, not a surveyed geographical reconstruction.
// Office floor is y=0; the water is roughly fourteen storeys below it.
export function buildHarbor({scene,group,box,cylinder,mat,map}){
 const waterMap=map((c,w,h)=>{
  c.fillStyle='#709ba6';c.fillRect(0,0,w,h);
  for(let i=0;i<900;i++){
   const x=(i*137.3)%w,y=(i*57.7)%h;
   c.strokeStyle=i%3?'#b4c8c32b':'#3d7c8e24';c.lineWidth=1;
   c.beginPath();c.moveTo(x,y);c.lineTo(x+4+(i%17),y);c.stroke();
  }
 },1024,1024);waterMap.wrapS=waterMap.wrapT=THREE.RepeatWrapping;waterMap.repeat.set(14,14);
 const sea=new THREE.MeshStandardMaterial({map:waterMap,roughness:.54,metalness:.08,color:'#6c9baf'});
 box(2800,.3,2400,0,-44,-1050,sea);
 const quay=mat('#b1a08b'),asphalt=mat('#777b78'),roof=mat('#b4b9b6',{metalness:.25,roughness:.7});
 box(430,3,125,-20,-43,-90,quay);
 box(430,3,65,-20,-43,-172.5,quay);
 box(16,3,73,-223,-43,-232,quay);
 box(420,.1,20,-20,-41.4,-32,asphalt);
 for(let i=0;i<35;i++)box(3,.03,.24,-210+i*12,-41.32,-32,mat('#e3ddbd'));
 // Low roofs and industrial silos in the foreground.
 for(const [x,z,w,d,h] of [[-110,-60,95,42,13],[25,-64,62,35,11],[108,-84,43,48,15]]){
  box(w,h,d,x,-42+h/2,z,mat('#bac0b7'));
  box(w+1,.35,d+1,x,-42+h,z,roof);
  for(let dx=-w/2+3;dx<w/2;dx+=5)box(.16,.12,d,x+dx,-41.7+h,z,trimMaterial());
 }
 function trimMaterial(){return mat('#8e9b9d',{metalness:.5,roughness:.55});}
 for(let i=0;i<5;i++){
  cylinder(6.2,13,92+i*14,-35.5,-125,mat('#b5bdbe',{metalness:.35,roughness:.6}));
  cylinder(6.3,.35,92+i*14,-28.8,-125,roof);
 }
 const colors=['#873c33','#31566e','#4a695c','#967c40','#a2aca5'];
 const corrugation=map((c,w,h)=>{
  c.fillStyle='#c0c2bd';c.fillRect(0,0,w,h);
  for(let x=0;x<w;x+=24){c.fillStyle='#777d7b';c.fillRect(x,0,3,h);c.fillStyle='#dde0d7';c.fillRect(x+4,0,3,h);}
  c.fillStyle='#797f7a';c.fillRect(0,0,w,8);c.fillRect(0,h-8,w,8);
 },512,256);
 const containerFinishes=colors.map(color=>mat(color,{map:corrugation,roughness:.8,metalness:.18}));
 for(let row=0;row<5;row++)for(let col=0;col<19;col++){
  const x=-155+col*13,z=-100-row*6.3,levels=1+(col+row)%3;
  for(let k=0;k<levels;k++)box(11.8,2.55,2.5,x,-40+k*2.6,z,containerFinishes[(col*3+row+k)%colors.length]);
 }
 function rod(a,b,r,m){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start),mid=start.clone().add(end).multiplyScalar(.5);
  const mesh=cylinder(r,delta.length(),mid.x,mid.y,mid.z,m);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;
 }
 const craneYellow=mat('#d9bc6d',{metalness:.3,roughness:.65}),cable=mat('#5f696b');
 for(const [index,x] of [-175,-117,-52,14,173].entries()){
  const z=-155-index%2*35,top=8+(index%3)*5,base=-41;
  box(22,3,24,x,-43,z+2,quay);
  for(const side of [-1,1]){
   rod([x+side*5,base,z],[x+side*2,top-12,z],.46,craneYellow);
   rod([x+side*5,base,z+8],[x+side*2,top-12,z],.46,craneYellow);
  }
  box(8,3.5,7,x,top-12,z,craneYellow);
  box(3.5,3,3,x+4,top-12,z-1,mat('#dae0d9'));
  box(3,.95,.1,x+4,top-11.5,z-2.56,mat('#3d606f'));
  for(const side of [-1,1])box(4,.7,1.5,x+side*5,-40.8,z+4,mat('#414e53'));
  rod([x,top-10,z],[x+22,top+14,z-17],.32,craneYellow);
  rod([x+1,top-10,z],[x+23,top+14,z-17],.28,craneYellow);
  rod([x,top-10,z],[x-10,top+19,z+2],.23,craneYellow);
  rod([x-10,top+19,z+2],[x+22,top+14,z-17],.055,cable);
  rod([x+22,top+14,z-17],[x+22,-22,z-17],.045,cable);
  for(let j=0;j<8;j++){
   const t=j/8;
   rod([x+22*t,top-10+24*t,z-17*t],[x+22*(t+1/8)+1,top-10+24*(t+1/8),z-17*(t+1/8)],.09,craneYellow);
  }
  for(let j=0;j<7;j++){
   const y=base+j*(top-12-base)/7,spread=5-3*j/7,nextSpread=5-3*(j+1)/7;
   rod([x-spread,y,z],[x+nextSpread,y+(top-12-base)/7,z],.13,craneYellow);
   rod([x+spread,y,z],[x-nextSpread,y+(top-12-base)/7,z],.13,craneYellow);
  }
 }
 // Cargo ship alongside a distant pier, with a stack of deck containers.
 box(175,2,18,-140,-43,-265,quay);
 box(100,8,19,-120,-41,-286,mat('#294d60'));
 box(19,15,15,-162,-30,-286,mat('#e1e0d3'));
 box(9,4,17,-163,-21,-286,mat('#d1d3c9'));
 for(let i=0;i<7;i++)for(let j=0;j<2;j++)box(11.8,5,6,-140+i*12,-34,-291+j*7,mat(colors[(i+j)%5]));
 // Far shore and low green Cerro-like silhouette, kept behind the bay.
 const shore=mat('#82988c'),ridge=new THREE.Shape();ridge.moveTo(-1400,-45);
 for(let i=0;i<=45;i++){const x=-1400+i*62,h=-34+38*Math.exp(-(((x-340)/240)**2))+Math.sin(i*1.7)*3;ridge.lineTo(x,h);}
 ridge.lineTo(1400,-70);ridge.lineTo(-1400,-70);ridge.closePath();
 const land=new THREE.Mesh(new THREE.ShapeGeometry(ridge),shore);land.position.z=-1050;group.add(land);
 for(let i=0;i<130;i++){
  const x=-1200+i*18,h=3+i%5;
  box(8+i%9,h,7,x,-33+h/2,-1010-(i%4)*12,mat(['#b9c1b8','#a8b5b3','#d0ccc0'][i%3]));
 }
 // City-facing west windows: an adjacent glass tower and the urban skyline behind it.
 box(850,2,360,-505,-44,115,mat('#a9a797'));
 const facade=map((c,w,h)=>{
  const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#9ab3c0');g.addColorStop(.45,'#597b8e');g.addColorStop(1,'#a6b7bc');c.fillStyle=g;c.fillRect(0,0,w,h);
  c.strokeStyle='#c8d1cd';c.lineWidth=3;
  for(let x=0;x<w;x+=64){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}
  for(let y=0;y<h;y+=48){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}
  c.fillStyle='#d5ded426';for(let i=0;i<12;i++)c.fillRect((i*97)%w,h*.5+(i%4)*28,28,150);
 },512,1024);
 box(28,62,31,-60,-13,21,mat('#a7b8bb',{map:facade,metalness:.5,roughness:.32}));
 const cityColors=['#aaa99e','#b9b2a2','#989e9b','#bdbdaf','#a5b0ae'];
 for(let row=0;row<5;row++)for(let col=0;col<18;col++){
  const x=-165-col*25,z=-43+row*48+(col%3)*7,h=12+(col*17+row*11)%36;
  box(15+(col%3)*3,h,22,x,-43+h/2,z,mat(cityColors[(col+row)%5]));
  box(11,.8,17,x,-42.6+h,z,roof);
 }
 box(24,88,23,-620,0,-18,mat('#899b9f',{metalness:.18,roughness:.6}));
 box(13,9,13,-620,48.5,-18,mat('#a6aaa0'));
 box(650,2,250,410,-44,30,mat('#a9a797'));
 for(let row=0;row<4;row++)for(let col=0;col<12;col++){
  const x=112+col*39,z=-65+row*58+(col%3)*9,h=15+(col*13+row*19)%43;
  box(22,h,28,x,-43+h/2,z,mat(cityColors[(col+row)%cityColors.length]));
  box(14,1.2,18,x,-42.4+h,z,roof);
 }
 // A subtle horizon gradient gives the exterior daylight without a heavyweight sky system.
 const skyMap=map((c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#76add5');g.addColorStop(.48,'#bed9e7');g.addColorStop(.6,'#e0e8e5');g.addColorStop(1,'#b9cbce');c.fillStyle=g;c.fillRect(0,0,w,h);},1024,512);
 const sky=new THREE.Mesh(new THREE.SphereGeometry(1900,24,12),new THREE.MeshBasicMaterial({map:skyMap,side:THREE.BackSide,fog:false,depthWrite:false}));
 sky.renderOrder=-10;scene.add(sky);
}
