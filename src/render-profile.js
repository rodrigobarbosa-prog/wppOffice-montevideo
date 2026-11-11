export function selectRenderProfile({userAgent='',platform='',maxTouchPoints=0,deviceMemory=8,forceMobile=false}={}){
 const mobile=forceMobile||/Android|iPhone|iPad|iPod|Mobile/i.test(userAgent)||(platform==='MacIntel'&&maxTouchPoints>1)||deviceMemory<=4;
 return Object.freeze({mobile,pixelRatio:mobile?1:2,postprocessing:!mobile,reflectionProbe:!mobile,avatarTextureSize:mobile?1024:4096,mirrorWidth:mobile?128:512,mirrorHeight:mobile?192:768,mirrorSamples:mobile?0:2});
}
const nav=globalThis.navigator||{};
export const renderProfile=selectRenderProfile({userAgent:nav.userAgent,platform:nav.platform,maxTouchPoints:nav.maxTouchPoints,deviceMemory:nav.deviceMemory,forceMobile:typeof location!=='undefined'&&new URL(location.href).searchParams.get('graphics')==='mobile'});
export function avatarAsset(url){const result=new URL(url);if(renderProfile.mobile)result.pathname=result.pathname.replace(/\.glb$/,'-mobile.glb');return result.href;}
