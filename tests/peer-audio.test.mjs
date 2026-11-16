import test from 'node:test';import assert from 'node:assert/strict';import {createPeerAudio} from '../src/peer-audio.js';import {createPeerSignaling} from '../src/peer-signaling.js';
test('audio channel exists while muted and microphone cycles reuse the same sender',async()=>{
 let channels=0,streamChanges=0;const sender={track:null,async replaceTrack(t){this.track=t;},setStreams(){streamChanges++;}};
 const audio=createPeerAudio({addTransceiver(kind,options){assert.equal(kind,'audio');assert.equal(options.direction,'sendrecv');channels++;return {sender};}});
 const mic={getAudioTracks:()=>[{kind:'audio',id:'mic'}]};const track=mic.getAudioTracks()[0];mic.getAudioTracks=()=>[track];
 await audio.set(mic);assert.equal(sender.track,track);for(let i=0;i<20;i++)await audio.set(mic);assert.equal(streamChanges,1);
 await audio.set(null);assert.equal(sender.track,null);await audio.set(mic);assert.equal(sender.track,track);assert.equal(channels,1);
});
test('SDP and early ICE candidates are serialized rather than applied concurrently',async()=>{
 const calls=[];let busy=false;const pc={signalingState:'stable',remoteDescription:null,async setRemoteDescription(d){assert.equal(busy,false);busy=true;calls.push(d.type);await Promise.resolve();this.remoteDescription=d;this.signalingState=d.type==='offer'?'have-remote-offer':'stable';busy=false;},async setLocalDescription(){this.localDescription={type:this.signalingState==='have-remote-offer'?'answer':'offer'};this.signalingState='stable';},async addIceCandidate(c){assert.ok(this.remoteDescription);calls.push(c.candidate);}};
 const messages=[];const signals=createPeerSignaling(pc,{polite:true,send:m=>messages.push(m),onError:e=>assert.fail(e)});
 await Promise.all([signals.receive({candidate:{candidate:'early'}}),signals.receive({description:{type:'offer'}})]);
 assert.deepEqual(calls,['offer','early']);assert.equal(messages[0].description.type,'answer');
});
test('the answerer reuses the offered audio transceiver instead of creating a duplicate silent receiver',async()=>{
 let created=0,transceivers=[];const sender={track:null,async replaceTrack(t){this.track=t;},setStreams(){}};
 const pc={addTransceiver(){created++;},getTransceivers:()=>transceivers};const peer=createPeerAudio(pc,{initiator:false}),track={kind:'audio'},stream={getAudioTracks:()=>[track]};
 await peer.set(stream);assert.equal(created,0);transceivers=[{sender,receiver:{track:{kind:'audio'}},direction:'recvonly'}];await peer.refresh();assert.equal(sender.track,track);assert.equal(transceivers[0].direction,'sendrecv');assert.equal(created,0);
});
