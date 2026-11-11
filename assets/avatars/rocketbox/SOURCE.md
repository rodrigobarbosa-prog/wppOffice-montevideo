# Presenter asset provenance

Source: [Microsoft Rocketbox](https://github.com/microsoft/Microsoft-Rocketbox), MIT license (copyright 2020 Microsoft). The full license is included in ../ROCKETBOX-LICENSE.md.

Character: Assets/Avatars/Adults/Male_Adult_08/Export/Male_Adult_08_facial.fbx. Original m014 body, head and opacity textures retain their 2048 x 2048 resolution and were converted from TGA to PNG without resizing.

Animations from the same repository: m_idle_breathe_01.max.fbx, m_walk_neutral_01.max.fbx, m_wave_01.max.fbx and m_gestic_talk_neutral_01.max.fbx. The converted GLB retains the 81-bone skeleton, the authored quaternion animation, and six facial blend shapes for blinking, smiling, brow movement and jaw opening. Horizontal root motion was removed so the application's collision-aware route controls translation. Original bone lengths are retained. The browser normalizes the avatar to 1.8 metres.

The conversion is reproducible with node scripts/build-presenter.mjs using the original files cached under artifacts/rocketbox-source. Three.js r180 FBXLoader, TGALoader and GLTFExporter are bundled build tools; the browser uses the bundled GLTFLoader and local files only. No external avatar service is called while running the visit.

Runtime materials use physical shading, separate colour/normal/specular maps, fabric sheen, cutout hair and authored facial morphs. The runtime controller crossfades idle, walking, greeting and explanatory gestures and adjusts walking playback speed to the navigation speed.
