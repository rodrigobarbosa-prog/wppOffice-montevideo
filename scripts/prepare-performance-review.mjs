import {readFile,writeFile} from 'node:fs/promises';
const html=await readFile('assets/visit.html','utf8');
await writeFile('assets/qa/performance-review.html',html.replace('<title>wppOffice-montevideo · WPP Production</title>','<title>Local performance review</title>').replace('<script type="module" src="src/main.js">','<script>const NativeAudio=window.Audio;window.Audio=function(...args){const audio=new NativeAudio(...args);audio.muted=true;return audio;};</script><script type="module" src="/assets/qa/performance-review.js"></script><script type="module" src="src/main.js">'));
