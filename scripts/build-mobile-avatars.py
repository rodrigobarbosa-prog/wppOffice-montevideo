"""Build bounded texture variants without changing the original meshes or skins."""
import json, struct
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1] / 'assets' / 'avatars'
for folder, name in [('mixamo', 'presenter'), ('client', 'client'), ('collaborator', 'collaborator')]:
    directory = root / folder
    data = (directory / (name + '.glb')).read_bytes()
    size = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20 + size])
    output = directory / 'mobile'
    output.mkdir(exist_ok=True)
    for image in doc.get('images', []):
        source = directory / image['uri']
        with Image.open(source) as texture:
            texture.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
            texture.save(output / source.name, optimize=True)
        image['uri'] = 'mobile/' + source.name
    encoded = json.dumps(doc, separators=(',', ':')).encode()
    encoded += b' ' * (-len(encoded) % 4)
    chunks = struct.pack('<II', len(encoded), 0x4E4F534A) + encoded + data[20 + size:]
    (directory / (name + '-mobile.glb')).write_bytes(struct.pack('<III', 0x46546C67, 2, 12 + len(chunks)) + chunks)
    print(folder, 'mobile textures <=1024; original geometry, skins and animations preserved')
