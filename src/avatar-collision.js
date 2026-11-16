// An overlap caused by network interpolation must never imprison either player.
// Permit escape steps that increase separation; still reject approaching people.
export function avatarStepBlocked(from,to,actors,self,minDistance=.62){
 return actors.some(actor=>{
  if(actor===self||!actor.visible)return false;
  const p=actor.position,before=Math.hypot(from.x-p.x,from.z-p.z),after=Math.hypot(to.x-p.x,to.z-p.z);
  return after<minDistance&&!(before<minDistance&&after>before+1e-7);
 });
}
