"""Download public model weights once; inference uses only local files afterward."""
from pathlib import Path
from urllib.request import urlretrieve, urlopen, Request
import os, time

def download(url, temporary):
 for attempt in range(8):
  offset = temporary.stat().st_size if temporary.exists() else 0
  try:
   with urlopen(Request(url + '?download=true&resume=' + str(offset), headers={'Range': f'bytes={offset}-', 'Cache-Control': 'no-cache'}), timeout=45) as response:
    resume = response.status == 206
    if resume and not response.headers.get('Content-Range', '').startswith(f'bytes {offset}-'):
     raise IOError('Unexpected download range')
    expected = int(response.headers.get('Content-Length', 0))
    received = 0
    print('Model transfer:', response.status, 'resume', offset if resume else 0, 'bytes', flush=True)
    with temporary.open('ab' if resume else 'wb') as output:
     while chunk := response.read(1024 * 1024):
      output.write(chunk)
      received += len(chunk)
    if expected and received < expected: raise IOError('Incomplete download')
   return
  except Exception as error:
   print('Retrying model download:', type(error).__name__, flush=True)
   time.sleep(1)
 raise RuntimeError('Could not finish model download')

ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / 'artifacts' / 'voice-models'
MODELS.mkdir(parents=True, exist_ok=True)
files = {
 'kokoro.onnx': 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx',
 'voices.bin': 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin',
}
for name, url in files.items():
 target = MODELS / name
 if not target.exists():
  print('Downloading', name, flush=True)
  temporary = target.with_suffix('.download')
  urlretrieve(url, temporary)
  temporary.replace(target)
whisper = MODELS / 'whisper-base'
whisper.mkdir(exist_ok=True)
for name in ['model.bin', 'config.json', 'tokenizer.json', 'vocabulary.txt', 'README.md']:
 target = whisper / name
 if target.exists(): continue
 print('Downloading whisper', name, flush=True)
 temporary = target.with_suffix('.download')
 download('https://huggingface.co/Systran/faster-whisper-base/resolve/main/' + name, temporary)
 temporary.replace(target)
print('Local voice models ready.', flush=True)
