import {cp,mkdir,rm,copyFile,readdir,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
const target=path.resolve('dist');
if(path.dirname(target)!==process.cwd()||path.basename(target)!=='dist')throw Error('Invalid build destination');
await rm(target,{recursive:true,force:true});await mkdir(target,{recursive:true});
for(const file of ['index.html','style.css'])await copyFile(file,path.join(target,file));
for(const directory of ['src','vendor','assets/audio','assets/avatars'])await cp(directory,path.join(target,directory),{recursive:true});
await copyFile('assets/lobby.css',path.join(target,'assets/lobby.css'));
await copyFile('assets/client-entry.html',path.join(target,'assets/client-entry.html'));
// Only these two source images are used by existing runtime textures.
await mkdir(path.join(target,'assets/references'),{recursive:true});
for(const file of ['02.jpg','13-mampara-frontal.jpg'])await copyFile('assets/references/'+file,path.join(target,'assets/references',file));
// No other reference photos, QA pages, screenshots, private data or dev tools.
await writeFile(path.join(target,'assets/visit.html'),await (await import('node:fs/promises')).readFile('assets/visit.html'));
await writeFile(path.join(target,'_headers'),'/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: same-origin\n  Permissions-Policy: camera=(), microphone=(self), display-capture=(self)\n');
let count=0,bytes=0;async function check(dir){for(const item of await readdir(dir,{withFileTypes:true})){const full=path.join(dir,item.name);if(item.isDirectory())await check(full);else{const s=await stat(full);if(s.size>25*1024*1024)throw Error('Asset exceeds 25 MiB: '+full);count++;bytes+=s.size;}}}await check(target);
console.log(`Office visit ready: ${count} files, ${(bytes/1024/1024).toFixed(1)} MiB. Worker: wppoffice-montevideo; officeGame unchanged.`);
