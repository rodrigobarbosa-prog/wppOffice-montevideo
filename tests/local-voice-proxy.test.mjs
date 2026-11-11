import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {localVoiceProxy} from '../local-voice-proxy.mjs';
async function invoke({origin,host='localhost:4180',url='/voice/speak',method='POST',body=Buffer.from('{}')}={}){
 const req=Object.assign(Readable.from([body]),{url,method,headers:{host,origin,'content-type':'application/json'}});
 const result={};const res={writeHead(code,headers){result.code=code;result.headers=headers;},end(body){result.body=body;}};
 result.handled=await localVoiceProxy(req,res);return result;
}
test('local audio proxy rejects foreign origins and DNS rebinding hosts before touching the worker',async()=>{
 assert.equal((await invoke({origin:'https://foreign.example'})).code,403);
 assert.equal((await invoke({host:'foreign.example:4180'})).code,403);
});
test('local audio proxy bounds upload size and only exposes the narration routes',async()=>{
 assert.equal((await invoke({body:Buffer.alloc(2_000_001)})).code,413);
 assert.equal((await invoke({url:'/voice/other'})).code,404);
 assert.equal((await invoke({url:'/voice/translate'})).code,404);
 assert.equal((await invoke({url:'/voice/status',method:'POST'})).code,404);
 assert.equal((await invoke({url:'/assets/visit.html'})).handled,false);
});
