import * as THREE from 'three';

export function buildWestWindowLighting(scene,{west,edge,north,south,bays,seats}){
 const width=edge-west,depth=south-north;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=768;
 const paint=canvas.getContext('2d');
 paint.scale(canvas.width/width,canvas.height/depth);
 function patch(x,y,rx,ry,colors){
  paint.save();paint.translate(x,y);paint.scale(rx,ry);
  const gradient=paint.createRadialGradient(0,0,0,0,0,1);
  for(const [stop,color] of colors)gradient.addColorStop(stop,color);
  paint.fillStyle=gradient;paint.fillRect(-1,-1,2,2);paint.restore();
 }
 const daylight=paint.createLinearGradient(0,0,5,0);
 daylight.addColorStop(0,'rgba(204,226,246,.10)');
 daylight.addColorStop(1,'rgba(204,226,246,0)');
 paint.fillStyle=daylight;paint.fillRect(0,0,5,depth);
 for(const bay of bays){
  const span=bay.z2-bay.z1,center=(bay.z1+bay.z2)/2-north;
  const brightness=(1.75-bay.blindHeight)*.075;
  patch(1.35,center+.25,2.5,span*.64,[[0,'rgba(228,237,250,'+brightness+')'],[1,'rgba(228,237,250,0)']]);
 }
 for(const [x,y] of [[.32,0],[0,.32]]){
  const gradient=paint.createLinearGradient(0,0,x,y);
  gradient.addColorStop(0,'rgba(20,24,27,.24)');gradient.addColorStop(1,'rgba(20,24,27,0)');
  paint.fillStyle=gradient;paint.fillRect(0,0,x||width,y||depth);
 }
 const footprint=[[0,'rgba(15,20,24,.23)'],[.6,'rgba(15,20,24,.085)'],[1,'rgba(15,20,24,0)']];
 const caster=[[0,'rgba(11,15,20,.36)'],[1,'rgba(11,15,20,0)']];
 for(const seat of seats){
  if(seat.x<west||seat.x>edge||seat.z<north||seat.z>south)continue;
  patch(seat.x-west,seat.z-north,.43,.4,footprint);
  for(let i=0;i<5;i++){
   const angle=seat.yaw+i*Math.PI*2/5;
   patch(seat.x-west+.29*Math.sin(angle),seat.z-north+.29*Math.cos(angle),.087,.083,caster);
  }
 }
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),new THREE.MeshBasicMaterial({
  map,transparent:true,depthWrite:false,toneMapped:false
 }));
 floor.name='West window light and floor contacts';floor.renderOrder=-1;
 floor.rotation.x=-Math.PI/2;floor.position.set((west+edge)/2,.007,(north+south)/2);scene.add(floor);
 // Aim the window fill into the room, below the ceiling. The floor texture supplies the wider wash.
 const fill=new THREE.SpotLight('#e1edff',11,11,Math.PI*.21,.92,2);
 scene.add(fill,fill.target);
 function setEnhanced(enabled){
  floor.visible=enabled;
  const x=enabled?west+.22:-8,z=enabled?south-8.1:-5;
  fill.position.set(x,2.15,z);
  fill.target.position.set(x+2.5,0,z);
  fill.color.set(enabled?'#e1edff':'#f3f4e8');
  fill.intensity=enabled?11:8;fill.distance=enabled?11:12;
 }
 setEnhanced(true);
 return {get enhanced(){return floor.visible;},setEnhanced};
}
