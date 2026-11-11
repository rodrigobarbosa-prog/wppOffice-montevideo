"""CPU-only comparison against the actual BC7/ASTC transcode, including hair alpha.
Requires Pillow and numpy. Does not open a browser or exercise the GPU.
"""
import json, pathlib, subprocess, math
import numpy as np
from PIL import Image

root = pathlib.Path(__file__).resolve().parent.parent
encoder = root / 'artifacts/texture-tools/package/bin/win32-x64/basisu.exe'
report = json.loads((root / 'artifacts/texture-compression/report.json').read_text())
records = []
for entry in report:
    name = entry['model'].removesuffix('-mobile')
    folder = {'presenter': 'mixamo', 'client': 'client', 'collaborator': 'collaborator'}[name]
    base = root / 'assets/avatars' / folder
    # Check the textures actually used by the runtime physical materials.
    if entry['source'].split('/')[-1] not in ({'texture-0.png', 'texture-3.png', 'texture-4.png'} if name == 'presenter' else {'texture-0.png', 'texture-3.png'}):
        continue
    original = np.asarray(Image.open(base / entry['source']).convert('RGBA'), dtype=np.float32)
    for fmt, code in [('BC7_RGBA', 6), ('ASTC_RGBA', 10)]:
        output = root / 'artifacts/texture-comparison' / entry['model'] / fmt
        output.mkdir(parents=True, exist_ok=True)
        result = subprocess.run([str(encoder), '-unpack', '-file', str(base / entry['uri']), '-format_only', str(code), '-no_ktx'], cwd=output, capture_output=True, text=True)
        if result.returncode:
            raise RuntimeError(result.stdout + result.stderr)
        if fmt == 'ASTC_RGBA':
            # This encoder validates ASTC transcoding but does not decode ASTC to PNG.
            assert 'format ASTC_RGBA succeeded' in result.stdout
            records.append({**entry, 'format': fmt, 'transcodeValidated': True, 'pixelComparison': False})
            continue
        images = list(output.glob(pathlib.Path(entry['uri']).stem + '_unpacked_rgba_*_0_0000.png'))
        if len(images) != 1:
            raise RuntimeError('Missing base-level decoded image: ' + str(output))
        decoded = np.asarray(Image.open(images[0]).convert('RGBA'), dtype=np.float32)
        assert decoded.shape == original.shape
        mse = np.mean((decoded[:, :, :3] - original[:, :, :3]) ** 2)
        psnr = float(10 * math.log10(255**2 / mse)) if mse else 100.0
        alpha_rms = float(np.sqrt(np.mean((decoded[:, :, 3] - original[:, :, 3]) ** 2)))
        alpha_coverage = float(np.mean((decoded[:, :, 3] >= 97) != (original[:, :, 3] >= 97)))
        record = {**entry, 'format': fmt, 'psnrRGB': round(psnr, 3), 'alphaRMS': round(alpha_rms, 3), 'alphaCoverageChange': round(alpha_coverage, 6)}
        assert psnr > 35, record
        assert alpha_rms < 2, record
        assert alpha_coverage < .005, record
        records.append(record)
        print(entry['model'], entry['source'], fmt, round(psnr, 2), 'dB; alpha RMS', round(alpha_rms, 3), flush=True)
(root / 'artifacts/texture-comparison/quality.json').write_text(json.dumps(records, indent=2))
