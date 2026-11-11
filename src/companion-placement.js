// Positions are on the floor plane. Never fall back to sharing the visitor's position.
export function findCompanionPlacement(viewer,blocked){
 for(const distance of [2.2,1.9,1.6,1.35]){
  for(const offset of [-.60,.60,-.90,.90,-Math.PI/2,Math.PI/2,-2.15,2.15,Math.PI,0]){
   const bearing=viewer.yaw+offset;
   const host={x:viewer.x-Math.sin(bearing)*distance,z:viewer.z-Math.cos(bearing)*distance};
   if(blocked(host.x,host.z))continue;
   let clear=true;
   for(let t=.10;t<=1;t+=.05)if(blocked(viewer.x+(host.x-viewer.x)*t,viewer.z+(host.z-viewer.z)*t)){clear=false;break;}
   if(!clear)continue;
   // A small turn keeps the companion off-centre without forcing a camera teleport.
   return {host,yaw:bearing-Math.sign(offset)*.24,pitch:-.15,distance};
  }
 }
 return null;
}
