# Local voice worker

Current visit (2026-11-10): only local Kokoro narration is enabled. English live
translation was removed from the UI and server routes because of latency. The
worker no longer imports Whisper or OpenVoice. Their setup scripts, dependencies,
models and the interpretation notes below are archived experiments, not active
visit features. RNNoise microphone processing remains enabled independently.

No paid service, API key, browser cloud recognizer or third-party audio upload is used.
Models are downloaded once. The worker runs offline on CPU, bound to 127.0.0.1:4182.
The app proxies `/voice/*` through its localhost server. Audio stays in RAM and is
discarded; request bodies and transcripts are not logged. Restart clears the cache.

On this workstation `npm start` launches the worker automatically. To reproduce:

1. Create `artifacts/voice-env` with Python 3.12 (`python -m venv artifacts/voice-env`).
2. Install `scripts/voice-requirements.txt` using that environment's pip.
3. Run `scripts/setup-local-voice.py` with that environment's Python while online.
4. Run `npm start`. Subsequent inference does not need network access.
5. Optional local timbre adaptation: run `scripts/setup-voice-conversion.py` with
   the same Python environment while online, then restart `npm start`.

Kokoro provides Spanish and English synthetic narration. Automatic voice selection
uses it first and falls back only to installed browser voices. The presenter never
hears the guide. Manual browser voice choices are restricted to local voices.

The presenter can enable experimental English translation inside personal settings
after turning on the microphone. Microphone phrases end after a 550 ms pause
(minimum 1.6 seconds, maximum 8 seconds), are translated by Whisper base (CPU int8)
and synthesized by Kokoro. If OpenVoice V2 is installed, the English audio is
adapted to the tone of the current microphone phrase, with reference and speaker
embeddings kept only in RAM. Only the client gets this stream;
Brian gets the original microphone. Turning off translation restores the original.
Muting, leaving or changing role aborts requests/playback and destroys capture
resources; already running server inference finishes and its reply is discarded.
A service error restores original audio automatically. Pending translation is
bounded to one phrase; sustained speech faster than inference can lose phrases.
Pause between short phrases. This is delayed interpretation, not simultaneous
speech. Without OpenVoice it uses a synthetic English voice; the enabled status
reports the actual mode. OpenVoice adaptation is approximate and needs a live
listening check with the presenter's real voice; it is not an exact voice copy.

The client guide pauses during live translation. Presenter explanation gestures
follow translated playback. Current Mixamo models have no facial speech rig.

## Sources and licenses

- Kokoro ONNX wrapper: https://github.com/thewh1teagle/kokoro-onnx (MIT).
- Kokoro weights: https://huggingface.co/hexgrad/Kokoro-82M (Apache-2.0).
- Faster Whisper: https://github.com/SYSTRAN/faster-whisper (MIT).
- Converted Whisper base: https://huggingface.co/Systran/faster-whisper-base.
- Whisper: https://github.com/openai/whisper (MIT).
- OpenVoice code and V2 converter weights: https://github.com/myshell-ai/OpenVoice
  and https://huggingface.co/myshell-ai/OpenVoiceV2 (MIT). Source and license retained
  in `artifacts/voice-models/openvoice`. This converter uses only its tone-conversion
  stage; Kokoro supplies the base voice. The worker does not load the optional
  wavmark model; the interface identifies the output as interpreted/adapted audio.
- RNNoise wrapper and WASM notices: `vendor/noise-suppression/NOTICE.txt`.

Package licenses are retained in the isolated environment. Phonemizer and its
eSpeak NG dependency include GPL licensing; retain their notices and source/license
obligations when distributing that worker. A production package must include the
model and dependency licenses, not merely the JavaScript frontend.

## Verification

`assets/qa/microphone-check.html` exercises real RNNoise WASM with synthetic noise
and locally synthesized speech, without a microphone or speaker output.
`assets/qa/local-voice-check.html` synthesizes a known Spanish phrase, translates it
and decodes the returned English WAV. It never captures the user's microphone.
`assets/qa/live-translation-check.html` exercises the actual phrase recorder,
interpreter and outgoing MediaStream with synthetic speech, measuring output RMS
and speech gesture callbacks. The first English audio arrived 6.8 seconds after
the start of the 4.2-second test phrase, with the models already loaded.
These tests do not certify the user's microphone, natural breathing or subjective
voice quality; those still need a live listening check.
