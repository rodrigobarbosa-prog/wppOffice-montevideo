"""Offline, single-speaker narration. No pitch shifting or external voice service."""
import os
os.environ['HF_HUB_OFFLINE']='1'
os.environ['HF_HUB_DISABLE_TELEMETRY']='1'
import json, sys, shutil
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfiltfilt, lfilter
from scipy.ndimage import maximum_filter1d
from kokoro_onnx import Kokoro
root=Path(__file__).resolve().parents[1]
job=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
tts=Kokoro(str(root/'artifacts/voice-models/kokoro.onnx'),str(root/'artifacts/voice-models/voices.bin'))
backup=root/'artifacts/audio-before-clear-v2';backup.mkdir(exist_ok=True)
report=[]
def master(x,sr):
 x=np.asarray(x,dtype=np.float64);x-=np.mean(x)
 x=sosfiltfilt(butter(2,70,fs=sr,btype='highpass',output='sos'),x)
 # Gentle presence EQ; retain bass identity and consonants, avoid hard denoising.
 A=10**(1.5/40);w=2*np.pi*2600/sr;alpha=np.sin(w)/2
 b=np.array([1+alpha*A,-2*np.cos(w),1-alpha*A]);a=np.array([1+alpha/A,-2*np.cos(w),1-alpha/A]);x=lfilter(b/a[0],a/a[0],x)
 indices=np.flatnonzero(np.abs(x)>.002)
 if len(indices):x=x[max(0,indices[0]-int(.035*sr)):min(len(x),indices[-1]+int(.07*sr))]
 # Match perceived level without letting isolated synthesis transients dictate
 # the volume of an entire sentence. A 10 ms look-ahead limiter only controls peaks.
 ceiling=10**(-1.5/20);target=10**(-22/20);release=np.exp(-1/(.065*sr))
 for _ in range(3):
  x*=target/max(np.sqrt(np.mean(x*x)),1e-6)
  envelope=maximum_filter1d(np.abs(x),size=int(.010*sr)|1,mode='nearest')
  desired=np.minimum(1,ceiling/np.maximum(envelope,1e-9));gain=1
  for i in range(len(x)):
   gain=min(desired[i],1-(1-gain)*release);x[i]*=gain
 n=min(int(.008*sr),len(x)//2);x[:n]*=np.linspace(0,1,n);x[-n:]*=np.linspace(1,0,n)
 return np.pad(x,(int(.10*sr),int(.16*sr)))
for clip in job['clips']:
 file=root/'assets/audio'/clip['file']
 if file.exists() and not (backup/file.name).exists():shutil.copy2(file,backup/file.name)
 print('Rendering '+clip['file']+' / '+job['voice'],flush=True)
 samples,sr=tts.create(clip['text'],voice=job['voice'],speed=1.02,lang='en-gb')
 samples=master(samples,sr);sf.write(str(file),samples,sr,subtype='PCM_16')
 report.append({'file':file.name,'voice':job['voice'],'language':'en-gb','text':clip['text'],'duration':round(len(samples)/sr,3),'peakDb':round(20*np.log10(max(np.max(np.abs(samples)),1e-9)),2),'rmsDb':round(20*np.log10(max(np.sqrt(np.mean(samples**2)),1e-9)),2),'clippedSamples':int(np.sum(np.abs(samples)>=.999))})
manifest={'profile':job['profile'],'voice':job['voice'],'sampleRate':24000,'processing':'70 Hz high-pass, +1.5 dB presence, speech-level matching, -1.5 dBFS peak ceiling; no pitch/time conversion','clips':report}
(root/'assets/audio/voice-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,indent=2),flush=True)
