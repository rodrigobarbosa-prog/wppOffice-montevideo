export const voiceProfile=Object.freeze({id:'bm_fable',name:'WPP · English voiceover',language:'en',version:'2026-11-11-clear-v2',welcome:'Welcome to W P P Production, Montevideo. Let’s meet the team on floor fourteen.'});
export function narrationAudioUrl(zone){return '/assets/audio/'+(zone==='welcome'?'arrival-welcome-en':'tour-en-'+zone)+'.wav?v='+voiceProfile.version;}
