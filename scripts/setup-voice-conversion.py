"""Install the optional offline OpenVoice tone converter from official sources."""
from pathlib import Path
import subprocess, sys, runpy, zipfile
from urllib.request import urlretrieve

ROOT = Path(__file__).resolve().parents[1]
subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'torch==2.6.0+cpu', '--index-url', 'https://download.pytorch.org/whl/cpu'])
subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'librosa==0.11.0', 'eng_to_ipa==0.0.2', 'inflect==7.0.0', 'unidecode==1.3.7', 'pypinyin==0.50.0', 'cn2an==0.5.22', 'jieba==0.42.1'])
download = runpy.run_path(str(ROOT / 'scripts' / 'setup-local-voice.py'))['download']
target = ROOT / 'artifacts' / 'voice-models' / 'openvoice'
target.mkdir(exist_ok=True)
archive = ROOT / 'artifacts' / 'openvoice-source.zip'
if not archive.exists(): urlretrieve('https://github.com/myshell-ai/OpenVoice/archive/refs/heads/main.zip', archive)
with zipfile.ZipFile(archive) as source:
 for member in source.infolist():
  relative = Path(*Path(member.filename).parts[1:])
  if not member.is_dir() and relative.parts and (relative.parts[0] == 'openvoice' or str(relative) == 'LICENSE'):
   output = (target / relative).resolve()
   if not output.is_relative_to(target.resolve()): raise RuntimeError('Unexpected archive path')
   output.parent.mkdir(parents=True, exist_ok=True)
   output.write_bytes(source.read(member))
api = target / 'openvoice' / 'api.py'
code = api.read_text(encoding='utf-8')
code = code.replace('class ToneColorConverter(OpenVoiceBaseClass):\n    def __init__(self, *args, **kwargs):', 'class ToneColorConverter(OpenVoiceBaseClass):\n    def __init__(self, *args, enable_watermark=True, **kwargs):')
code = code.replace("if kwargs.get('enable_watermark', True):", 'if enable_watermark:')
api.write_text(code, encoding='utf-8')
(target / 'LOCAL-CHANGES.txt').write_text('ToneColorConverter constructor: consume the enable_watermark keyword locally instead of passing it to the base class. Original MIT license retained.\n')
for name in ['checkpoint.pth', 'config.json']:
 destination = target / name
 if not destination.exists():
  temporary = destination.with_suffix('.download')
  download('https://huggingface.co/myshell-ai/OpenVoiceV2/resolve/main/converter/' + name, temporary)
  temporary.replace(destination)
print('Local voice converter ready.', flush=True)
