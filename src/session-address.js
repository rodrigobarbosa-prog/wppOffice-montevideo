export function sessionBase(location){return ['localhost','127.0.0.1'].includes(location.hostname)?location.protocol+'//'+location.hostname+':4181':'';}
