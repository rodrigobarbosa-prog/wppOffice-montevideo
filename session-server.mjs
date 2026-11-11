// Same-origin signaling only. Media travels directly between browsers via WebRTC.
export function createSessionServer({allowedOrigins=[]}={}){
 const clients=new Map();
 const send=(res,data)=>res.write('data: '+JSON.stringify(data)+'\n\n');
 const waiting=room=>{const queue=[...clients].filter(([,c])=>c.room===room&&c.claimedRole&&!c.admitted).map(([id,c])=>({id,role:c.claimedRole,name:c.name}));for(const c of clients.values())if(c.room===room&&c.claimedRole==='presenter')send(c.res,{type:'waiting',queue});};
 return async function session(req,res,url){
  if(!url.pathname.startsWith('/session/'))return false;
  if(req.headers.origin&&req.headers.origin!==(req.protocol||'http:')+'//'+req.headers.host&&!allowedOrigins.includes(req.headers.origin)){res.writeHead(403);res.end();return true;}
  const id=url.searchParams.get('id'),room=url.searchParams.get('room')||'office';
  if(!/^[\w-]{8,80}$/.test(id||'')||!/^[\w-]{1,60}$/.test(room)){res.writeHead(400);res.end();return true;}
  if(req.method==='GET'&&url.pathname==='/session/presence'){
   const participants=[...clients].filter(([,c])=>c.room===room&&c.claimedRole&&c.admitted).map(([id,c])=>({id,role:c.claimedRole,name:c.state?.name||c.name,mic:Boolean(c.state?.mic),sharing:Boolean(c.state?.sharing)}));
   res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({room,participants}));return true;
  }
  if(req.method==='GET'&&url.pathname==='/session/events'){
   res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});
   const joined=url.searchParams.get('joined')==='1',role=url.searchParams.get('role'),name=(url.searchParams.get('name')||role||'').trim().slice(0,40);
   if(joined&&(!['client','presenter','collaborator'].includes(role)||[...clients].some(([key,c])=>key!==id&&c.room===room&&c.claimedRole===role))){send(res,{type:'role-busy',role});res.end();return true;}
   const host=[...clients.values()].some(c=>c.room===room&&c.claimedRole==='presenter'&&c.admitted);
   if(joined&&role!=='presenter'&&!host){send(res,{type:'host-required'});res.end();return true;}
   const admitted=!joined||role==='presenter';
   clients.get(id)?.res.end();clients.set(id,{res,room,claimedRole:joined?role:null,name,state:null,admitted});
   if(!admitted)send(res,{type:'awaiting-admission'});
   if(admitted)send(res,{type:'peers',peers:[...clients].filter(([key,c])=>key!==id&&c.room===room&&c.admitted).map(([key])=>key)});
   for(const [key,c] of clients)if(admitted&&key!==id&&c.room===room&&c.admitted)send(c.res,{type:'join',from:id});
   waiting(room);
   const timer=setInterval(()=>res.write(': keepalive\n\n'),15000);
   req.on('close',()=>{clearInterval(timer);if(clients.get(id)?.res!==res)return;clients.delete(id);if(role==='presenter'&&joined){for(const [other,c] of clients)if(c.room===room&&c.claimedRole){send(c.res,{type:'host-required'});c.res.end();clients.delete(other);}}waiting(room);for(const c of clients.values())if(c.room===room)send(c.res,{type:'leave',from:id});});
   return true;
  }
  if(req.method==='POST'&&url.pathname==='/session/message'){
   if(clients.get(id)?.room!==room){res.writeHead(409);res.end();return true;}
   let body='';for await(const part of req){body+=part;if(body.length>131072){res.writeHead(413);res.end();return true;}}
   try{
    const data=JSON.parse(body);if(!['signal','state','attention','admit'].includes(data.type))throw Error();
    const owner=clients.get(id);
    if(!owner.admitted){res.writeHead(403);res.end();return true;}
    if(data.type==='admit'){
     const guest=clients.get(data.to);if(owner.claimedRole!=='presenter'||!guest||guest.room!==room||guest.admitted){res.writeHead(403);res.end();return true;}
     guest.admitted=true;send(guest.res,{type:'admitted'});send(guest.res,{type:'peers',peers:[...clients].filter(([key,c])=>key!==data.to&&c.room===room&&c.admitted).map(([key])=>key)});
     for(const [key,c] of clients)if(key!==data.to&&c.room===room&&c.admitted)send(c.res,{type:'join',from:data.to});
     waiting(room);res.writeHead(204);res.end();return true;
    }
    if(data.type==='state'){
     if(owner.claimedRole&&data.payload?.role!==owner.claimedRole){res.writeHead(403);res.end();return true;}
     owner.state={...data.payload,name:owner.claimedRole?owner.name:String(data.payload?.name||'').slice(0,40),sharing:owner.claimedRole&&owner.claimedRole!=='collaborator'?false:Boolean(data.payload?.sharing)};
     data.payload=owner.state;
    }
    for(const [key,c] of clients)if(key!==id&&c.room===room&&c.admitted&&(!data.to||data.to===key))send(c.res,{type:data.type,from:id,payload:data.payload});
    res.writeHead(204);res.end();
   }catch{res.writeHead(400);res.end();}return true;
  }
  res.writeHead(404);res.end();return true;
 };
}
