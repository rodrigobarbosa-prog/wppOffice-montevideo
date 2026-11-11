import http from 'node:http';
import {createSessionServer} from './session-server.mjs';
export function startSessionBridge(){
 const origins=['http://localhost:4180','http://127.0.0.1:4180'];
 const session=createSessionServer({allowedOrigins:origins});
 const server=http.createServer(async(req,res)=>{
  if(origins.includes(req.headers.origin))res.setHeader('Access-Control-Allow-Origin',req.headers.origin);
  res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  try{if(!await session(req,res,new URL(req.url,'http://localhost'))){res.writeHead(404);res.end();}}catch{res.writeHead(400);res.end();}
 });
 server.on('error',error=>{if(error.code!=='EADDRINUSE')console.error(error.message);});
 server.listen(4181,'127.0.0.1',()=>console.log('Visit connections: http://localhost:4181'));return server;
}
if(process.argv[1]?.endsWith('session-bridge.mjs'))startSessionBridge();
