import {createSessionServer} from '../session-server.mjs';
import {sessionFetch} from './session-adapter.mjs';
import {narrationFor} from '../src/tour-voice.js';

export class VisitRoom {
 constructor(){this.handle=createSessionServer();}
 fetch(request){return sessionFetch(this.handle,request);}
}
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(url.pathname.startsWith('/session/')){
  if(request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return new Response('Forbidden',{status:403});
  const room=url.searchParams.get('room')||'office';if(!/^[\w-]{1,60}$/.test(room))return new Response('Invalid room',{status:400});
  return env.ROOMS.get(env.ROOMS.idFromName(room)).fetch(request);
 }
 if(url.pathname==='/voice/status')return Response.json({ready:true,narration:'Kokoro',prerecorded:true});
 if(url.pathname==='/voice/speak'){
  if(request.method!=='POST')return new Response('Method not allowed',{status:405});
  if(request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return new Response('Forbidden',{status:403});
  const text=await request.text();if(text.length>4000)return new Response('Too large',{status:413});
  let input;try{input=JSON.parse(text);}catch{return new Response('Invalid JSON',{status:400});}
  for(const language of ['es','en'])for(const [zone,location] of Object.entries({arrival:'Hall',entrance:'Acceso',office:'Pasillo',meeting:'Sala ',kitchen:'Cocina'})){
   if(input.language===language&&input.text===narrationFor(location,language).text){url.pathname='/assets/audio/tour-'+language+'-'+zone+'.wav';url.search='';return env.ASSETS.fetch(new Request(url));}
  }
  return new Response('Unknown narration',{status:404});
 }
 if(url.pathname==='/health')return Response.json({service:'wppoffice-montevideo',version:'2026-11-10',sessions:'durable-objects',voice:'prerecorded-kokoro'});
 // Service bindings enter this handler directly, including requests for static assets.
 return env.ASSETS.fetch(request);
}};
