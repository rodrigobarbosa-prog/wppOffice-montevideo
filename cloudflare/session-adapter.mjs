// Adapt the shared admission/signaling protocol to Fetch and streaming responses.
export function sessionFetch(handler,request){
 const url=new URL(request.url),encoder=new TextEncoder();
 let controller,closed=false,started=false,status=200,headers={},resolveResponse;
 const closeHandlers=[];
 const close=()=>{if(closed)return;closed=true;for(const fn of closeHandlers)fn();};
 const stream=new ReadableStream({start(c){controller=c;},cancel(){close();}});
 const response=new Promise(resolve=>{resolveResponse=resolve;});
 const req={method:request.method,url:url.pathname+url.search,protocol:url.protocol,headers:{...Object.fromEntries(request.headers),host:url.host},
  on(event,fn){if(event==='close'){closeHandlers.push(fn);if(closed)fn();}},
  async *[Symbol.asyncIterator](){if(request.body){const reader=request.body.getReader();try{while(true){const {done,value}=await reader.read();if(done)break;yield new TextDecoder().decode(value);}}finally{reader.releaseLock();}}}
 };
 const start=()=>{if(started)return;started=true;const clean={...headers};delete clean.Connection;resolveResponse(new Response(status===204?null:stream,{status,headers:clean}));};
 const res={writeHead(code,next={}){status=code;headers=next;start();},
  write(chunk){if(closed)return false;start();try{controller.enqueue(encoder.encode(chunk));return true;}catch{close();return false;}},
  end(chunk){if(chunk)this.write(chunk);start();if(!closed){try{controller.close();}catch{}close();}}
 };
 request.signal.addEventListener('abort',()=>{if(!closed){try{controller.close();}catch{}close();}},{once:true});
 Promise.resolve(handler(req,res,url)).then(handled=>{if(!handled){res.writeHead(404);res.end();}}).catch(()=>{if(!started)res.writeHead(500);res.end();});
 return response;
}
