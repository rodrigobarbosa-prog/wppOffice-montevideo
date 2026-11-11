// Only the client hears translated presenter speech. Brian keeps the original.
// Unknown peers never receive original speech while translation is enabled.
export function streamsForPeer(streams,translation,role){
 if(!translation||role==='collaborator')return streams;
 return [...streams.filter(s=>s.getVideoTracks().length),...(role==='client'?[translation]:[])];
}
