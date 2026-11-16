"""Original ambient sketches for approval only; not included in the office build."""
import pathlib, wave, json
import numpy as np

out = pathlib.Path(__file__).resolve().parent.parent / 'artifacts/music-options'
out.mkdir(parents=True, exist_ok=True)
rate, seconds = 44100, 22
t = np.arange(rate * seconds) / rate
def hz(note): return 440 * 2 ** ((note - 69) / 12)
options = [
 ('A-bruma', 'Bruma: pad cálido y estable', [[45, 52, 60, 64, 71], [41, 48, 57, 60, 67], [48, 55, 59, 64, 69]], .12),
 ('B-luz', 'Luz: acordes suaves con notas de campana apagada', [[48, 55, 62, 64, 71], [45, 52, 59, 60, 67], [41, 48, 55, 57, 64]], .32),
 ('C-horizonte', 'Horizonte: textura amplia y pausada', [[43, 50, 57, 62, 66], [45, 52, 59, 64, 67], [48, 55, 62, 64, 69]], .05),
]
manifest=[]
for name, title, chords, bell_amount in options:
    audio = np.zeros((len(t), 2))
    for chord_index, chord in enumerate(chords):
        start = chord_index * 7
        age = t - start
        envelope = np.clip(age / 3, 0, 1) * np.clip((11 - age) / 4, 0, 1)
        for i, note in enumerate(chord):
            frequency = hz(note)
            for channel in range(2):
                detune = 1 + (channel * 2 - 1) * .0007
                phase = 2 * np.pi * frequency * detune * t + i * .37
                pad = np.sin(phase) + .18 * np.sin(phase * 2) + .035 * np.sin(phase * 3)
                audio[:, channel] += pad * envelope * (.7 if i == 0 else 1) / len(chord)
        for i, note in enumerate(chord[2:]):
            age = t - start - 1 - i * 1.7
            bell_env = (age >= 0) * np.clip(age / .08, 0, 1) * np.exp(-np.maximum(age, 0) / 1.8)
            bell = np.sin(2 * np.pi * hz(note + 12) * t) * bell_env * bell_amount
            audio[:, 0] += bell * .65
            audio[:, 1] += bell * .75
    fade = np.minimum(np.clip(t / 3, 0, 1), np.clip((seconds - t) / 4, 0, 1))
    audio *= fade[:, None]
    rms = np.sqrt(np.mean(audio**2))
    audio *= 10 ** (-24 / 20) / rms
    pcm = np.asarray(np.clip(audio, -.95, .95) * 32767, dtype='<i2')
    with wave.open(str(out / (name + '.wav')), 'wb') as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(rate); f.writeframes(pcm.tobytes())
    manifest.append({'file':name+'.wav','title':title,'seconds':seconds,'rmsDb':-24,'originalSyntheticComposition':True})
(out / 'options.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print('Created three original ambient previews; no application music enabled.')
