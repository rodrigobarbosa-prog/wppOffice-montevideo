import * as THREE from 'three';

// Locally generated surface maps at material scale: no photographed lighting baked in.
function hash(x,y){let n=Math.imul(x+101,374761393)^Math.imul(y+79,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function noise(x,y){
 const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
 const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
 const a=hash(ix,iy)*(1-u)+hash(ix+1,iy)*u,b=hash(ix,iy+1)*(1-u)+hash(ix+1,iy+1)*u;
 return a*(1-v)+b*v;
}
function surface(size,sample,repeat=[1,1]){
 const color=new Uint8Array(size*size*4),height=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const p=sample(x,y,size),i=(y*size+x)*4;
  for(let k=0;k<3;k++){color[i+k]=p[k];height[i+k]=p[3];rough[i+k]=p[4];}
  color[i+3]=height[i+3]=rough[i+3]=255;
 }
 function texture(data,isColor){
  const map=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);map.colorSpace=isColor?THREE.SRGBColorSpace:THREE.NoColorSpace;
  map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(...repeat);map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;
  map.generateMipmaps=true;map.anisotropy=8;map.needsUpdate=true;return map;
 }
 return {map:texture(color,true),bumpMap:texture(height,false),roughnessMap:texture(rough,false)};
}
export function createSurfaceMaterials(){
 const carpet=surface(1024,(x,y,s)=>{
  const tile=s/4,tx=Math.floor(x/tile),ty=Math.floor(y/tile),vertical=(tx+ty)%2===0;
  const a=vertical?x:y,b=vertical?y:x;
  const weave=Math.sin(a*Math.PI*.72+Math.sin(b*.09)*.5)*4+Math.sin(a*Math.PI*.5+b*.24)*2;
  const tuft=(hash(Math.floor(a/3),Math.floor(b/7))-.5)*9;
  const fiber=(hash(x,y)-.5)*14,tileTone=(hash(tx,ty)-.5)*9;
  const edge=Math.min(x%tile,y%tile,tile-1-x%tile,tile-1-y%tile);
  const seam=edge<1?-9:edge<3?-3:0,v=weave+fiber+tuft+tileTone+seam;
  return [119+v,119+v,112+v,128+weave*3+fiber+tuft*2,236+hash(x+4,y)*17];
 },[17,6.8]);
 const timber=surface(1024,(x,y,s)=>{
  const u=x/s,v=y/s;
  const bend=(noise(u*4,v*12)-.5)*.018+(noise(u*17,v*27)-.5)*.004;
  const ribbon=noise((u+bend)*65,v*10),grain=noise((u+bend)*210,v*65),fiber=noise((u+bend)*720,v*150);
  const pores=Math.pow(noise((u+bend)*940,v*320),8)*12;
  const tone=(ribbon-.5)*18+(grain-.5)*10+(fiber-.5)*4-pores;
  return [129+tone*1.1,70+tone*.8,33+tone*.45,128+(fiber-.5)*9-pores,147+(ribbon-.5)*12+(fiber-.5)*4];
 });
 for(const texture of Object.values(timber))texture.wrapS=texture.wrapT=THREE.MirroredRepeatWrapping;
 const laminate=surface(512,(x,y)=>{const n=(hash(x,y)-.5)*5;return [64+n,69+n,70+n,128+n*5,187+n*3];},[3,1]);
 const plaster=surface(512,(x,y)=>{
  const n=(hash(x,y)-.5)*5,roller=Math.sin(x*.13+Math.sin(y*.05))*Math.sin(y*.19)*.8;
  return [224+n*.25+roller,224+n*.25+roller,218+n*.25+roller,128+n*5+roller*2,231+n*2];
 });
 const brushed=surface(512,(x,y)=>{const line=(hash(0,y)-.5)*20,n=(hash(x,y)-.5)*3;return [178+line*.22+n,180+line*.22+n,179+line*.22+n,128+line+n,149+line*1.6];});
 const fabric=surface(512,(x,y)=>{const warp=(x%4===0||y%4===0)?-4:2,n=(hash(x,y)-.5)*4;return [31+warp+n,37+warp+n,39+warp+n,128+warp*5+n*3,244+n];},[3,3]);
 const acoustic=surface(512,(x,y)=>{const n=hash(x,y),pore=n>.98?-16:n>.92?-5:0,fiber=(hash(Math.floor(x/2),Math.floor(y/6))-.5)*3;return [235+pore+fiber,234+pore+fiber,228+pore+fiber,128+pore*2,248];});
 const porcelain=surface(512,(x,y)=>{const n=(hash(x,y)-.5)*2,cloud=Math.sin(x*.026+Math.sin(y*.015))*Math.sin(y*.021)*1.5;return [223+n+cloud,220+n+cloud,208+n+cloud,128+n,165+n*2+cloud*3];});
 const make=(maps,extra)=>new THREE.MeshStandardMaterial({...maps,roughness:1,...extra});
 return {
  carpet:make(carpet,{bumpScale:.00085}),
  wood:new THREE.MeshPhysicalMaterial({...timber,roughness:.62,bumpScale:.00009,clearcoat:.45,clearcoatRoughness:.16}),
  desk:make(laminate,{roughness:.78,bumpScale:.00016}),
  wall:make(plaster,{bumpScale:.0003}),
  steel:make(brushed,{metalness:.9,roughness:.48,bumpScale:.00022}),
  chair:make(fabric,{bumpScale:.00055}),
  ceiling:make(acoustic,{bumpScale:.00045,emissive:'#e5e2d9',emissiveIntensity:.11}),
  tile:new THREE.MeshPhysicalMaterial({...porcelain,roughness:.34,bumpScale:.00008,clearcoat:.32,clearcoatRoughness:.28})
 };
}
