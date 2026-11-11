import test from 'node:test';
import assert from 'node:assert/strict';
import {selectTourVoice} from '../src/tour-voice.js';
test('narrator never selects a network voice, including a manual network choice',()=>{
 const old={name:'Microsoft Pablo',lang:'es-ES',localService:true,voiceURI:'old'};
 const google={name:'Google español de Estados Unidos',lang:'es-US',localService:false,voiceURI:'google'};
 const neural={name:'Microsoft Mateo Online (Natural)',lang:'es-UY',localService:false,voiceURI:'natural'};
 assert.equal(selectTourVoice([old,google,neural],'es'),old);
 assert.equal(selectTourVoice([old,google],'es'),old);
 assert.equal(selectTourVoice([old,google],'es','google'),old);
 assert.equal(selectTourVoice([old,google,neural],'es','old'),old);
 assert.equal(selectTourVoice([old],'es'),old);
 assert.equal(selectTourVoice([old],'en'),undefined);
});
