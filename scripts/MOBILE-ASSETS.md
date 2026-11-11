# Mobile avatar variants

The original meshes, UVs, skin weights and animation buffers are preserved. Only external texture resolution changes: a maximum of 1024 pixels per side, PNG with alpha retained.

After rebuilding any character GLB, run `python scripts/build-mobile-avatars.py` with Pillow installed. Generated `*-mobile.glb` and `mobile/texture-*.png` files are committed alongside the desktop assets, so deployment needs no Python or image processing.

Mobile rendering is chosen before creating GPU render targets. Phones, touch iPads identifying as Mac, and devices reporting <=4 GiB of device memory use this profile. `?graphics=mobile` enables the same profile for local QA; changing viewport width alone does not simulate device memory or Safari.

Local validation on 2026-11-11: estimated uncompressed avatar texture storage with RGBA mipmaps is 725.3 MiB for desktop sources and 53.3 MiB for mobile variants. PNG transfer size is 103.1 MiB versus 8.3 MiB. These numbers exclude geometry, other textures, driver overhead and browser memory. Real-phone validation is still required.

No SSAO/HDR postprocessing, reflection probe capture or multisampled mirror buffers are allocated in the mobile profile. Mirrors use smaller targets; avatars decode sequentially. Desktop detail stays available.
