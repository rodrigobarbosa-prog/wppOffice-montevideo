export const visitRoles=['client','presenter','collaborator'];
export function avatarVisibility(role,presenterAvailable=true){
 return {client:role!=='client',presenter:role!=='presenter'&&presenterAvailable};
}

// A collaborator observes both people from a separate, reachable floor position.
export function findCollaboratorView(client,presenter,blocked){
 const center={x:(client.x+presenter.x)/2,z:(client.z+presenter.z)/2};
 const axis=Math.atan2(presenter.x-client.x,presenter.z-client.z);
 function visible(from,to){
  const steps=Math.ceil(Math.hypot(from.x-to.x,from.z-to.z)/.08);
  for(let i=1;i<steps;i++)if(blocked(from.x+(to.x-from.x)*i/steps,from.z+(to.z-from.z)*i/steps))return false;
  return true;
 }
 for(const distance of [2.7,2.2,1.7,3.3])for(const offset of [Math.PI/2,-Math.PI/2,1,-1,2,-2,0,Math.PI]){
  const x=center.x+Math.sin(axis+offset)*distance,z=center.z+Math.cos(axis+offset)*distance;
  const candidate={x,z};
  if(blocked(x,z)||[client,presenter].some(p=>Math.hypot(x-p.x,z-p.z)<.85||!visible(candidate,p)))continue;
  return {x,z,yaw:Math.atan2(x-center.x,z-center.z),pitch:-.16};
 }
 return null;
}
