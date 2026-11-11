import test from 'node:test';
import assert from 'node:assert/strict';
import {findCompanionPlacement} from '../src/companion-placement.js';
import {createTourVoice,narrationFor,narrationPolicy} from '../src/tour-voice.js';

test('client keeps their position and gets a separate, visible companion beside them',()=>{
 const visitor={x:6,z:-3,yaw:.7},before={...visitor};
 const placement=findCompanionPlacement(visitor,()=>false);
 assert.deepEqual(visitor,before);assert.ok(placement.distance>=1.35);
 const dx=placement.host.x-visitor.x,dz=placement.host.z-visitor.z;
 assert.ok(Math.abs(dx*Math.cos(visitor.yaw)-dz*Math.sin(visitor.yaw))>.7);
 const bearing=Math.atan2(-dx,-dz);
 assert.ok(Math.abs(Math.atan2(Math.sin(bearing-placement.yaw),Math.cos(bearing-placement.yaw)))<.25);
 assert.equal(findCompanionPlacement(visitor,()=>true),null);
});
test('companion searches the other side instead of appearing through a wall',()=>{
 const placement=findCompanionPlacement({x:0,z:0,yaw:0},x=>x>.4&&x<.6);
 assert.ok(placement.host.x<0);
});

function speechHarness(){
 const spoken=[];let cancels=0;
 const voices=[{name:'Español',voiceURI:'es-local',lang:'es-UY',localService:true},{name:'English',voiceURI:'en-local',lang:'en-US',localService:true}];
 class Utterance{constructor(text){this.text=text;}}
 const synth={getVoices:()=>voices,cancel(){cancels++;},speak(u){spoken.push(u);u.onstart?.();},addEventListener(){},removeEventListener(){}};
 return {spoken,synth,Utterance,get cancels(){return cancels;}};
}

test('presenter never hears narration and client hears it without a transcript',()=>{
 const h=speechHarness(),voice=createTourVoice(h);
 voice.setRole('presenter');voice.visit('Hall');voice.setPaused(false);
 voice.replay();voice.setLanguage('en');voice.setEnabled(false);voice.setEnabled(true);
 assert.equal(h.spoken.length,0);assert.equal(voice.state().speaking,false);
 assert.deepEqual(narrationPolicy('presenter'),{audio:false,captions:false});
 assert.deepEqual(narrationPolicy('client'),{audio:true,captions:true});
 voice.setRole('client');assert.equal(h.spoken.length,1);assert.equal(voice.state().speaking,true);
 voice.setRole('presenter');assert.equal(voice.state().speaking,false);
});
test('narration waits for start, deduplicates areas, switches language and cancels on pause',()=>{
 const h=speechHarness(),voice=createTourVoice(h);
 voice.visit('Hall de ascensores');assert.equal(h.spoken.length,0);
 voice.setPaused(false);assert.equal(h.spoken.length,1);assert.equal(voice.state().speaking,true);
 assert.equal(h.spoken[0].voice.voiceURI,'es-local');
 voice.visit('Hall de ascensores');assert.equal(h.spoken.length,1);
 voice.setLanguage('en');assert.equal(h.spoken.at(-1).voice.voiceURI,'en-local');
 const stale=h.spoken.at(-1);voice.setPaused(true);assert.equal(voice.state().speaking,false);
 stale.onstart();assert.equal(voice.state().speaking,false);
 voice.setEnabled(false);voice.setPaused(false);assert.equal(h.spoken.length,2);
 voice.destroy();assert.ok(h.cancels>=4);
});
test('captions survive missing audio support and include usable door instructions',()=>{
 const voice=createTourVoice({});voice.visit('Acceso');voice.setPaused(false);
 assert.equal(voice.state().supported,false);assert.match(voice.state().text,/presentador abre la puerta/);
 assert.match(voice.state().error,/captions/);
 assert.match(narrationFor('Sala 01','en').text,/meeting rooms/);
});
