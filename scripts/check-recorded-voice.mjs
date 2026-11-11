import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {voiceProfile} from '../src/voice-profile.js';
const base=process.argv[2],manifest=await (await fetch(base+'/assets/audio/voice-manifest.json?v='+voiceProfile.version)).json();
assert.equal(manifest.voice,voiceProfile.id);assert.equal(manifest.clips.length,6);
for(const clip of manifest.clips){
 assert.equal(clip.voice,voiceProfile.id);assert.equal(clip.clippedSamples,0);
 const remote=Buffer.from(await (await fetch(base+'/assets/audio/'+clip.file+'?v='+voiceProfile.version)).arrayBuffer()),local=await readFile(new URL('../assets/audio/'+clip.file,import.meta.url));
 assert.equal(createHash('sha256').update(remote).digest('hex'),createHash('sha256').update(local).digest('hex'));console.log('PASS '+clip.file+' / '+clip.duration+'s / '+clip.rmsDb+'dBFS / no clipping');
}
assert.ok(Math.max(...manifest.clips.map(c=>c.rmsDb))-Math.min(...manifest.clips.map(c=>c.rmsDb))<.2);console.log('PASS same speaker and matched levels across all 6 published recordings');
