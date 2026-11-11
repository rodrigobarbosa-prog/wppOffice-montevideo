import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createSessionServer} from './session-server.mjs';
import {startSessionBridge} from './session-bridge.mjs';
import {startLocalVoice,localVoiceProxy} from './local-voice-proxy.mjs';
startSessionBridge();
startLocalVoice();
const session=createSessionServer();
const root=fileURLToPath(new URL('.',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.ktx2':'image/ktx2','.glb':'model/gltf-binary','.wasm':'application/wasm','.wav':'audio/wav'};
http.createServer(async(req,res)=>{
 try {
  if(await localVoiceProxy(req,res))return;
  if(await session(req,res,new URL(req.url,'http://localhost')))return;
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  const relative=path.relative(root,file);
  if(relative.startsWith('..')||path.isAbsolute(relative)||!(/^(index\.html|style\.css)$/.test(relative)||/^(src|vendor|assets)[\\/]/.test(relative)))throw Error();
  if(!(await stat(file)).isFile())throw Error();
  const body=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':body.byteLength,'Cache-Control':'no-cache'});res.end(body);
 }catch{res.writeHead(404);res.end('No encontrado');}
}).listen(4180,'127.0.0.1',()=>console.log('Piloto: http://localhost:4180'));
