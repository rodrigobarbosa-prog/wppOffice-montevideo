function clear(a,b,blocked){
 const count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.08));
 for(let i=1;i<=count;i++)if(blocked(a.x+(b.x-a.x)*i/count,a.z+(b.z-a.z)*i/count))return false;
 return true;
}
// Route the visitor around office furniture. Never move across a blocked segment.
export function findFollowPath(start,goal,blocked){
 if(clear(start,goal,blocked))return [{...goal}];
 const step=.35,key=(x,z)=>x+','+z,queue=[{x:0,z:0,g:0}],seen=new Map([[key(0,0),{x:start.x,z:start.z,parent:null}]]);
 let end=null;
 for(let n=0;queue.length&&n<5000;n++){
  queue.sort((a,b)=>b.f-a.f);const at=queue.pop(),node=seen.get(key(at.x,at.z));
  if(Math.hypot(node.x-goal.x,node.z-goal.z)<.55&&clear(node,goal,blocked)){end=node;break;}
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const x=at.x+dx,z=at.z+dz,k=key(x,z);if(seen.has(k))continue;
   const next={x:start.x+x*step,z:start.z+z*step,parent:node};
   if(Math.hypot(next.x-start.x,next.z-start.z)>40||!clear(node,next,blocked))continue;
   seen.set(k,next);const g=at.g+Math.hypot(dx,dz)*step;queue.push({x,z,g,f:g+Math.hypot(next.x-goal.x,next.z-goal.z)});
  }
 }
 if(!end)return [];
 const path=[{...goal}];while(end.parent){path.unshift({x:end.x,z:end.z});end=end.parent;}return path;
}
export function createClientFollower({distance=1.85}={}){
 let path=[],goal=null,replan=0;
 return {reset(){path=[];goal=null;replan=0;},update(dt,client,presenter,blocked){
  replan-=dt;
  if(!goal||replan<=0&&(Math.hypot(presenter.x-goal.x,presenter.z-goal.z)>.3||!path.length)||path[0]&&!clear(client,path[0],blocked)){
   goal={x:presenter.x,z:presenter.z};path=findFollowPath(client,goal,blocked);replan=.55;
  }
  let remaining=0,previous=client;for(const p of path){remaining+=Math.hypot(p.x-previous.x,p.z-previous.z);previous=p;}
  if(!path.length||remaining<distance)return {x:client.x,z:client.z,speed:0,waiting:!path.length};
  let budget=Math.min(1.65*dt,remaining-distance),x=client.x,z=client.z,travel=0,direction=0;
  while(budget>.00001&&path.length){
   const target=path[0],distance=Math.hypot(target.x-x,target.z-z),amount=Math.min(distance,budget);
   if(distance<.001){path.shift();continue;}
   const nx=x+(target.x-x)*amount/distance,nz=z+(target.z-z)*amount/distance;
   if(!clear({x,z},{x:nx,z:nz},blocked)){path=[];goal=null;break;}
   direction=Math.atan2(nx-x,nz-z);x=nx;z=nz;budget-=amount;travel+=amount;if(amount>=distance-.001)path.shift();
  }
  return {x,z,speed:travel/Math.max(dt,.001),direction,waiting:false};
 }};
}
