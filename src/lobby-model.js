export const lobbyRoles=['client','collaborator','presenter'];
export const roleNames={client:'Cliente',collaborator:'Brian · Colaborador',presenter:'Presentador'};
export function validRoom(value){return /^[a-zA-Z0-9_-]{1,60}$/.test(value||'');}
export function makeRoom(){return 'wpp-'+crypto.randomUUID().slice(0,8);}
export function inviteUrl(origin,room,role){
 if(!validRoom(room)||!lobbyRoles.includes(role))throw Error('Sala o rol inválido');
 const url=new URL('/',origin);url.searchParams.set('room',room);url.searchParams.set('join',role);return url.href;
}
export function visitUrl(origin,room,role,name=''){
 if(!validRoom(room)||!lobbyRoles.includes(role))throw Error('Sala o rol inválido');
 const url=new URL('/assets/visit.html',origin);url.searchParams.set('room',room);url.searchParams.set('modo',role);url.searchParams.set('joined','1');url.searchParams.set('name',name.trim().slice(0,40)||roleNames[role]);return url.href;
}
