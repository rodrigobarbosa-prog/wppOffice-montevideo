# Unified English voiceover · 2026-11-11

All active narration uses Kokoro bm_fable (en-gb), speed 1.02, with no pitch
conversion. Welcome: 5.259 seconds. The same speaker and mastering chain render
arrival, entrance, office, meeting room and kitchen. voice-manifest.json records
scripts, duration, signal levels and clipping checks for each recording.

Mastering: 70 Hz high-pass, +1.5 dB presence at 2.6 kHz, level matching around
-22 dBFS RMS and 10 ms look-ahead peak limiting at -1.5 dBFS. Native 24 kHz mono
PCM16. No destructive noise gate, artificial deepening or compressed speech codec.
No speech is sent to external APIs. Synthesized voice, not a personal voice clone.
Kokoro model: Apache-2.0; https://huggingface.co/hexgrad/Kokoro-82M.

The live experience uses prerecorded English audio directly on localhost and
Cloudflare. A failed recording exposes Retry/Replay and never substitutes a
browser/system voice. Language and speaker selectors are hidden in this experience.
Older Spanish recordings remain archived assets and are not played by the tour.

Rebuild with `npm run cloudflare:voice` using the installed local voice environment.
Earlier recordings are backed up in artifacts/audio-before-clear-v2.
The doors still wait for the welcome's actual audio-ended event before opening.
