// Static lights and furniture do not need a fresh shadow map for idle breathing.
// Animated gestures/moving people still refresh; explicit door/light changes can
// request an immediate refresh through renderer.shadowMap.needsUpdate.
export function createShadowRefresh(interval=1000/30){
 let last=-Infinity,signature='',pending=false;
 return {update(now,actors){
  const next=actors.map(a=>[a.visible,a.position.x.toFixed(3),a.position.y.toFixed(3),a.position.z.toFixed(3),(a.rotation?.y||0).toFixed(3),(a.userData.seated||0).toFixed(3),a.userData.animation?.gesture||'idle'].join(':')).join('|');
  const animated=actors.some(a=>a.visible&&((a.userData.animation?.speed||0)>.025||['welcome','explain','attention'].includes(a.userData.animation?.gesture)));
  pending=pending||next!==signature||animated;signature=next;
  if(pending&&now-last>=interval){last=now;pending=false;return true;}return false;
 }};
}
