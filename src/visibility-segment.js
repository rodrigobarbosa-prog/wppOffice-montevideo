// Exact segment/AABB test instead of walking 40–80 samples through the same list.
export function createWalkOcclusion(solids,radius,eyeHeight){
 const expanded=solids.filter(s=>s.top>.12&&s.bottom<eyeHeight+.08).map(s=>({
  x1:s.x1-radius,x2:s.x2+radius,z1:s.z1-radius,z2:s.z2+radius,bottom:-1,top:1
 }));
 return (from,to)=>segmentOccluded({x:from.x,y:0,z:from.z},{x:to.x,y:0,z:to.z},expanded);
}

export function segmentOccluded(from,to,solids,ignoreSeat=null){
 for(const s of solids){
  if(ignoreSeat!==null&&s.seatId===ignoreSeat)continue;let near=0,far=1,hit=true;
  for(const [axis,lo,hi] of [['x',s.x1,s.x2],['y',s.bottom,s.top],['z',s.z1,s.z2]]){
   const d=to[axis]-from[axis];if(Math.abs(d)<1e-10){if(from[axis]<lo||from[axis]>hi){hit=false;break;}}else{
    let a=(lo-from[axis])/d,b=(hi-from[axis])/d;if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(near>far){hit=false;break;}
   }
  }
  if(hit&&far>1e-4&&near<1-1e-4)return true;
 }return false;
}
