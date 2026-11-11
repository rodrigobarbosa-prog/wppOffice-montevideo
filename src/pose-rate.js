export function createPoseRate({interval=100,heartbeat=2000}={}){
 let lastCheck=-Infinity,lastSent=-Infinity,lastKey='';
 return {shouldSend(now,pose){
  if(now-lastCheck<interval)return false;lastCheck=now;
  const key=JSON.stringify(pose,(_,v)=>typeof v==='number'?Math.round(v*1000)/1000:v);
  if(key===lastKey&&now-lastSent<heartbeat)return false;lastKey=key;lastSent=now;return true;
 }};
}
