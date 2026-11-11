// Shared dimensions keep glass, rails and artwork frame from sharing visible
// coplanar faces. Metres; rail faces stand 15 mm clear of the timber frame.
export const partitionProfile=Object.freeze({frameWidth:.13,railWidth:.16,glassBottom:.66,glassTop:2.30,columnZ:-2.4,columnSize:.65,endPostDepth:.08});

export function partitionSpans(partition){
 const p=partitionProfile,columnStart=p.columnZ-p.columnSize/2,columnEnd=p.columnZ+p.columnSize/2;
 const start=partition.z1+p.endPostDepth/2,end=partition.z2;
 return [[start,Math.min(end,columnStart)],[Math.max(start,columnEnd),end]]
  .filter(([z1,z2])=>z2-z1>1e-6)
  .map(([z1,z2])=>({z1,z2,length:z2-z1,center:(z1+z2)/2}));
}
