"""Original quiet lounge demos for review; no runtime integration."""
import pathlib, wave, json, sys
import numpy as np

LOOP = '--loop' in sys.argv
RATE = 22050 if LOOP else 44100
OUT = pathlib.Path(__file__).resolve().parent.parent / ('assets/audio/music' if LOOP else 'artifacts/lounge-options')
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(814)

def hz(n): return 440 * 2 ** ((n - 69) / 12)

manifest = []
for name, bpm, feel in [('A-lounge-suave', 76, 'Lounge suave: piano eléctrico, bajo y escobillas'),
                         ('B-lounge-bossa', 84, 'Lounge bossa: acordes sincopados y percusión ligera'),
                         ('C-lounge-nocturno', 70, 'Lounge nocturno: acordes amplios y ritmo espaciado')]:
    beat = 60 / bpm
    if LOOP and name != 'C-lounge-nocturno': continue
    length = 8 * 4 * beat + 3
    audio = np.zeros((int(length * RATE), 2))

    def add(start, signal, gain=1, pan=0):
        offset = int(start * RATE)
        count = min(len(signal), len(audio) - offset)
        if count <= 0: return
        audio[offset:offset+count, 0] += signal[:count] * gain * np.sqrt((1-pan)/2)
        audio[offset:offset+count, 1] += signal[:count] * gain * np.sqrt((1+pan)/2)

    def rhodes(note, duration=3):
        t = np.arange(int(duration * RATE)) / RATE
        f = hz(note)
        env = (1-np.exp(-t/.007)) * np.exp(-t/1.25)
        # Decaying FM tine gives an electric-piano attack and rounded sustain.
        tone = np.sin(2*np.pi*f*t + .75*np.exp(-t/.16)*np.sin(2*np.pi*f*2*t))
        return env * (tone + .14*np.sin(2*np.pi*f*2*t)*np.exp(-t/.4))

    chords = [[60,64,67,71,74], [57,60,64,67,71], [53,57,60,64,67], [55,59,62,65,69]]
    roots = [36,33,29,31]
    for bar in range(8):
        chord = chords[bar % 4]
        base = bar * 4 * beat
        offsets = [0, 1.5, 3] if 'bossa' in name else [0, 2.5]
        for pos in offsets:
            for j, note in enumerate(chord):
                add(base + pos*beat + j*.013, rhodes(note), .115 if pos == 0 else .072, (j-2)*.18)
        for pos, note in [(0, roots[bar%4]), (2, roots[bar%4]+7), (3.5, roots[(bar+1)%4]-1)]:
            t = np.arange(int(beat*1.4*RATE))/RATE
            env = (1-np.exp(-t/.012))*np.exp(-t/.3)
            add(base+pos*beat, (np.sin(2*np.pi*hz(note)*t)+.17*np.sin(4*np.pi*hz(note)*t))*env, .23)
        for pos in range(4):
            t = np.arange(int(.18*RATE))/RATE
            noise = rng.normal(0, 1, len(t))
            high = noise - np.convolve(noise, np.ones(11)/11, mode='same')
            add(base+(pos+.5)*beat, high*np.exp(-t/.035)*(1-np.exp(-t/.003)), .013, .3)
            if pos in [1,3]:
                brush = np.convolve(noise, np.ones(5)/5, mode='same')
                add(base+pos*beat, brush*np.exp(-t/.07)*(1-np.exp(-t/.007)), .035, -.2)
            if pos in [0,2]:
                kick = np.sin(2*np.pi*(48*t+2*(1-np.exp(-t*24))))*np.exp(-t/.04)
                add(base+pos*beat, kick, .055)
        # Sparse upper-register phrase, leaving space for spoken conversation.
        if bar % 2:
            for pos, note in zip([1,2.5,3.25], [chord[2]+12,chord[1]+12,chord[0]+12]):
                add(base+pos*beat, rhodes(note, 1.7), .037, -.15)
    dry = audio.copy()
    for delay, gain in [(.071,.12),(.113,.09),(.193,.055),(.307,.035)]:
        shift = int(delay*RATE)
        audio[shift:] += dry[:-shift, ::-1] * gain
    t = np.arange(len(audio))/RATE
    if LOOP:
        period = int(8 * 4 * beat * RATE)
        tail = audio[period:].copy()
        audio = audio[:period].copy()
        audio[:len(tail)] += tail
        # Round the sub-sample bar boundary without a gap or endpoint click.
        n = 128
        delta = audio[-1] - audio[0]
        audio[-n:] -= np.linspace(0,1,n)[:,None] * delta
    else:
        audio *= np.minimum(np.clip(t/1.4,0,1), np.clip((length-t)/3,0,1))[:,None]
    audio *= 10**(-32/20) / np.sqrt(np.mean(audio**2))
    with wave.open(str(OUT/(name+'.wav')), 'wb') as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(RATE)
        f.writeframes((np.clip(audio,-.95,.95)*32767).astype('<i2').tobytes())
    manifest.append(dict(file=name+'.wav', description=feel, bpm=bpm, rmsDb=-32, original=True))
(OUT/'options.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2),encoding='utf-8')
print('Three quiet lounge previews created; application music remains disabled.')
