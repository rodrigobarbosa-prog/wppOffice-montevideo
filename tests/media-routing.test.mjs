import test from 'node:test';
import assert from 'node:assert/strict';
import {streamsForPeer} from '../src/media-routing.js';
const stream=kind=>({getAudioTracks:()=>kind==='audio'?[kind]:[],getVideoTracks:()=>kind==='video'?[kind]:[]});
test('translated presenter audio replaces original only for client, never leaks original to unknown peer',()=>{
 const mic=stream('audio'),screen=stream('video'),translated=stream('audio');
 assert.deepEqual(streamsForPeer([mic,screen],translated,'client'),[screen,translated]);
 assert.deepEqual(streamsForPeer([mic,screen],translated,'collaborator'),[mic,screen]);
 assert.deepEqual(streamsForPeer([mic],translated,undefined),[]);
 assert.deepEqual(streamsForPeer([mic],null,'client'),[mic]);
});
