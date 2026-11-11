// Local collision-aware demonstration, independent of a future live session.
export function createHostMotion(anchor,viewer,blocked){
 const start={x:anchor.x,z:anchor.z};
 let end={...start},distance=0,time=0;
 const toward=Math.atan2(viewer.x-start.x,viewer.z-start.z);
 for(const length of [1.6,1.2,.8]){
  for(const offset of [Math.PI/2,-Math.PI/2,Math.PI,0,Math.PI*.75,-Math.PI*.75]){
   const a=toward+offset,dx=Math.sin(a),dz=Math.cos(a);
   let clear=true;
   const steps=Math.ceil(length/.04);
   for(let i=0;i<=steps;i++){
    const d=length*i/steps,x=start.x+dx*d,z=start.z+dz*d;
    if(Math.hypot(x-viewer.x,z-viewer.z)<1.05||[[0,0],[.16,0],[-.16,0],[0,.16],[0,-.16]].some(([ox,oz])=>blocked(x+ox,z+oz))){clear=false;break;}
   }
   if(clear){end={x:start.x+dx*length,z:start.z+dz*length};distance=length;break;}
  }
  if(distance)break;
 }
 return {update(dt){
  time+=dt;
  const t=time%18;
  let u=0,speed=0,gesture='idle',direction=toward;
  const walking=(t>=3&&t<6)||(t>=10&&t<13);
  if(walking){
   const returning=t>=10,p=(t-(returning?10:3))/3;
   const smooth=p*p*(3-2*p);u=returning?1-smooth:smooth;
   speed=distance*6*p*(1-p)/3;
   direction=Math.atan2(end.x-start.x,end.z-start.z)+(returning?Math.PI:0);
   if(distance<.1)gesture='explain';
  }else{
   if(t>=6&&t<10)u=1;
   gesture=t<3?'welcome':t<14?'explain':'idle';
  }
  const x=start.x+(end.x-start.x)*u,z=start.z+(end.z-start.z)*u;
  if(!walking)direction=Math.atan2(viewer.x-x,viewer.z-z);
  return {x,z,speed,gesture,direction,time};
 },distance,focus:{x:(start.x+end.x)/2,z:(start.z+end.z)/2}};
}

