"""Loopback-only voice worker. Audio remains in RAM and is never uploaded or saved."""
import os
os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import io, json, threading, time, runpy
import soundfile as sf
from kokoro_onnx import Kokoro

MODELS = Path(__file__).resolve().parents[1] / 'artifacts' / 'voice-models'
lock = threading.Lock()
tts = Kokoro(str(MODELS / 'kokoro.onnx'), str(MODELS / 'voices.bin'))
cache = {}

def synthesize(text, language):
 key = (text, language)
 if key not in cache:
  samples, rate = tts.create(text, voice='em_alex' if language == 'es' else 'am_michael', speed=1.0, lang='es' if language == 'es' else 'en-us')
  output = io.BytesIO()
  sf.write(output, samples, rate, format='WAV', subtype='PCM_16')
  if len(cache) > 40: cache.clear()
  cache[key] = output.getvalue()
 return cache[key]

class Handler(BaseHTTPRequestHandler):
 def log_message(self, *args): pass  # Never log speech, transcripts or request bodies.
 def respond(self, status, body, mime='application/json'):
  self.send_response(status)
  self.send_header('Content-Type', mime)
  self.send_header('Cache-Control', 'no-store')
  self.send_header('Content-Length', str(len(body)))
  self.end_headers()
  self.wfile.write(body)
 def do_GET(self):
  self.respond(200, json.dumps({'ready': True, 'local': True, 'narration': 'Kokoro'}).encode())
 def do_POST(self):
  if self.headers.get('Origin'):
   self.respond(403, b'{}'); return
  length = int(self.headers.get('Content-Length', 0))
  if not 0 < length <= 2_000_000:
   self.respond(413, b'{}'); return
  body = self.rfile.read(length)
  if not lock.acquire(blocking=False):
   self.respond(429, b'{"error":"Voice worker busy"}'); return
  try:
   if self.path == '/speak':
    request = json.loads(body)
    text = request.get('text', '')
    if not isinstance(text, str) or not 0 < len(text) <= 1500: raise ValueError('Text length')
    audio = synthesize(text, 'es' if request.get('language') == 'es' else 'en')
   else:
    self.respond(404, b'{}'); return
   self.respond(200, audio, 'audio/wav')
  except Exception as error:
   print('Local voice processing failed:', type(error).__name__, flush=True)
   self.respond(503, b'{"error":"Local voice processing failed"}')
  finally:
   lock.release()

server = ThreadingHTTPServer(('127.0.0.1', 4182), Handler)
print('Local voice ready on 127.0.0.1:4182', flush=True)
server.serve_forever()
