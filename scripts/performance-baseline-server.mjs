// Local audit only: serves committed src/ from HEAD and the same current assets.
// This leaves the working application and all Cloudflare deployments untouched.
import http from 'node:http';import {readFile} from 'node:fs/promises';import path from 'node:path';import {execFileSync} from 'node:child_process';
const root=process.cwd();const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary','.wav':'audio/wav','.wasm':'application/wasm'};
http.createServer(async(req,res)=>{try{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1),file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||! /^(assets|vendor|src)\//.test(name)&&name!=='style.css')throw Error('not allowed');
 const body=name.startsWith('src/')?execFileSync('git',['-c','safe.directory='+root,'show','HEAD:'+name],{maxBuffer:8*1024*1024}):await readFile(file);
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
}catch{res.writeHead(404);res.end();}}).listen(4190,'127.0.0.1',()=>console.log('Read-only committed baseline: http://localhost:4190'));
