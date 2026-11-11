// One shared reflection guard for hall AND cabin. Independent guards permit
// mirrors from the two groups to render each other's entire scene recursively.
const scenes=new WeakMap();
export function reflectionGate(intervalMs=0){let busy=false,last=-Infinity;return {
 enter(now){if(busy||now-last<intervalMs)return false;busy=true;last=now;return true;},leave(){busy=false;},get busy(){return busy;}
};}
export function registerPlanarReflection(scene,mirror,{mobile=false,maxDistance=Infinity}={}){
 let state=scenes.get(scene);if(!state){state={mirrors:new Set(),gate:reflectionGate()};scenes.set(scene,state);}state.mirrors.add(mirror);
 const draw=mirror.onBeforeRender,interval=1000/(mobile?15:30);let last=-Infinity;
 mirror.onBeforeRender=function(renderer,s,camera,...args){
  const now=performance.now();if(s.overrideMaterial||state.gate.busy||now-last<interval)return;
  const p=this.matrixWorld.elements,c=camera.matrixWorld.elements;
  if(Math.hypot(c[12]-p[12],c[13]-p[13],c[14]-p[14])>maxDistance)return;
  if(!state.gate.enter(now))return;last=now;
  const hidden=[],selves=[];
  for(const other of state.mirrors)if(other!==this&&other.visible){hidden.push(other);other.visible=false;}
  for(const root of s.children)if(root.userData.mirrorSelf&&!root.visible){selves.push(root);root.visible=true;}
  try{draw.call(this,renderer,s,camera,...args);}finally{for(const other of hidden)other.visible=true;for(const root of selves)root.visible=false;state.gate.leave();}
 };
 return mirror;
}
