// Metres. Fixtures sit inside 1.2 x .6 m ceiling bays, clear of partitions.
export function ceilingPlan({x1,x2,z1,z2,hall=false,obstacles=[]}){
 const rails=[],fixtures=[],pitch=.6,pitchX=hall?1.2:pitch,clearance=.025;
 const cuts=(start,end,fixed,alongX)=>{
  let spans=[[start,end]];
  for(const b of obstacles){
   const low=alongX?b.z1:b.x1,high=alongX?b.z2:b.x2;
   if(fixed<low-clearance||fixed>high+clearance)continue;
   const a=(alongX?b.x1:b.z1)-clearance,c=(alongX?b.x2:b.z2)+clearance;
   spans=spans.flatMap(([s,e])=>c<=s||a>=e?[[s,e]]:[[s,Math.min(e,a)],[Math.max(s,c),e]].filter(([u,v])=>v-u>.02));
  }
  return spans;
 };
 for(let i=0;x1+i*pitchX<=x2+.001;i++){
  const x=x1+i*pitchX;
  for(const [a,b] of cuts(z1,z2,x,false))rails.push({x1:x,x2:x,z1:a,z2:b});
 }
 for(let i=0;z1+i*pitch<=z2+.001;i++){
  const z=z1+i*pitch;
  for(const [a,b] of cuts(x1,x2,z,true))rails.push({x1:a,x2:b,z1:z,z2:z});
 }
 for(let x=x1+1.2;x+.6<x2;x+=hall?2.4:3.6)for(let z=z1+(hall?.65:.9);z+.3<z2;z+=hall?1.3:3.6){
  const width=hall?.22:1.188,depth=hall?.22:.588;
  if(obstacles.some(b=>x+width/2+clearance>b.x1&&x-width/2-clearance<b.x2&&z+depth/2+clearance>b.z1&&z-depth/2-clearance<b.z2))continue;
  fixtures.push({x,z,width,depth});
 }
 return {rails,fixtures};
}
