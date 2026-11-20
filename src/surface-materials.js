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
export function createArrivalFinishes({steel,wood,tile}){
 const porcelain=tile.clone();
 porcelain.color.set('#fffcf9');
 porcelain.roughness=.4;porcelain.bumpScale=.000015;
 porcelain.clearcoat=.42;porcelain.clearcoatRoughness=.15;
 const border=porcelain.clone();border.color.set('#b2b1b3');border.roughness=.49;
 const cabinFloor=tile.clone();cabinFloor.color.set('#908e86');cabinFloor.roughness=.84;cabinFloor.clearcoat=.23;
 const brushed=steel.clone();brushed.color.set('#e3e3e1');brushed.roughness=.62;brushed.metalness=.87;brushed.bumpScale=.000025;
 const polished=brushed.clone();polished.color.set('#f6f5ef');polished.roughness=.43;
 const veneer=wood.clone();veneer.color.set('#e2cfc2');veneer.roughness=.67;veneer.clearcoat=.31;
 const enamel=tile.clone();enamel.color.set('#efefeb');enamel.roughness=.8;enamel.clearcoat=.19;
 const chrome=new THREE.MeshStandardMaterial({color:'#c6c9c7',metalness:.92,roughness:.24});
 const diffuser=new THREE.MeshStandardMaterial({color:'#fff4db',emissive:'#ffe9c4',emissiveIntensity:1.65,roughness:.46});
 return {porcelain,border,cabinFloor,brushed,polished,veneer,enamel,chrome,diffuser,
  setEnvironment(texture){
   for(const metal of [brushed,polished,chrome]){
    metal.envMap=texture;metal.envMapIntensity=.75;metal.needsUpdate=true;
   }
  }
 };
}

function carpetSample(x,y,size){
 const tileSize=size/4;
 const column=Math.floor(x/tileSize),row=Math.floor(y/tileSize);
 const tileX=x%tileSize,tileY=y%tileSize,turned=(row+column)%2===1;
 const across=turned?tileY:tileX,along=turned?tileX:tileY;
 const yarn=Math.floor(across/3),stitch=Math.floor((along+(yarn%2)*3)/6);
 const tileId=row*4+column;
 const strand=hash(yarn,tileId)-.5;
 const loop=hash(yarn+tileId*89,stitch)-.5;
 const fibre=hash(x,y)-.5;
 const edge=Math.min(tileX,tileY,tileSize-1-tileX,tileSize-1-tileY);
 const joint=Math.max(0,2-edge);
 const tileTone=(hash(column,row)-.5)*13;
 const pile=7*strand+13*loop+8*fibre;
 const shade=tileTone+pile-joint*7;
 return [119+shade,119+shade,112+shade+2*strand,128+pile*4-joint*11,243+loop*10];
}

function laminateSample(x,y,size){
 const pore=hash(x,y)-.5;
 const grain=(hash(Math.floor(x/2),Math.floor(y/2))-.5)*8;
 const mottling=(noise(x*32/size,y*32/size)-.5)*4;
 const fleck=pore>.47?3:pore<-.47?-3:0;
 const shade=grain+pore*6+mottling+fleck;
 return [64+shade,69+shade,70+shade,128+grain*5+pore*21,204+grain*2+mottling*3];
}

export function createSurfaceMaterials(){
 const carpet=surface(1024,carpetSample);
 const timber=surface(1024,(x,y,s)=>{
  const u=x/s,v=y/s;
  const bend=(noise(u*4,v*12)-.5)*.018+(noise(u*17,v*27)-.5)*.004;
  const ribbon=noise((u+bend)*65,v*10),grain=noise((u+bend)*210,v*65),fiber=noise((u+bend)*720,v*150);
  const pores=Math.pow(noise((u+bend)*940,v*320),8)*12;
  const tone=(ribbon-.5)*18+(grain-.5)*10+(fiber-.5)*4-pores;
  return [129+tone*1.1,70+tone*.8,33+tone*.45,128+(fiber-.5)*9-pores,147+(ribbon-.5)*12+(fiber-.5)*4];
 });
 for(const texture of Object.values(timber))texture.wrapS=texture.wrapT=THREE.MirroredRepeatWrapping;
 const laminate=surface(256,laminateSample);
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
  desk:make(laminate,{roughness:.86,bumpScale:.00022}),
  wall:make(plaster,{bumpScale:.0003}),
  steel:make(brushed,{metalness:.9,roughness:.48,bumpScale:.00022}),
  chair:make(fabric,{bumpScale:.00055}),
  ceiling:make(acoustic,{bumpScale:.00045,emissive:'#e5e2d9',emissiveIntensity:.11}),
  tile:new THREE.MeshPhysicalMaterial({...porcelain,roughness:.34,bumpScale:.00008,clearcoat:.32,clearcoatRoughness:.28})
 };
}
