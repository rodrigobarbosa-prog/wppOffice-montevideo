"""Adapt English speech to the current presenter's tone, using only RAM buffers."""
from pathlib import Path
import io, sys
import soundfile as sf
from faster_whisper.audio import decode_audio

directory = Path(__file__).resolve().parents[1] / 'artifacts' / 'voice-models' / 'openvoice'
converter = None

def available():
 return all((directory / name).exists() for name in ['checkpoint.pth', 'config.json', 'openvoice/api.py'])

def convert_voice(english, reference):
 global converter
 if converter is None:
  sys.path.insert(0, str(directory))
  import torch
  torch.set_num_threads(4)
  from openvoice.api import ToneColorConverter
  converter = ToneColorConverter(str(directory / 'config.json'), device='cpu', enable_watermark=False)
  converter.load_ckpt(str(directory / 'checkpoint.pth'))
 rate = converter.hps.data.sampling_rate
 samples = decode_audio(io.BytesIO(reference), sampling_rate=rate)
 ref = io.BytesIO()
 sf.write(ref, samples, rate, format='WAV', subtype='PCM_16')
 ref.seek(0)
 target = converter.extract_se([ref])
 source = converter.extract_se([io.BytesIO(english)])
 converted = converter.convert(io.BytesIO(english), src_se=source, tgt_se=target)
 output = io.BytesIO()
 sf.write(output, converted, rate, format='WAV', subtype='PCM_16')
 return output.getvalue()
