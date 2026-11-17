# Performance

## Measured

On an Apple M1 at Retina resolution (device pixel ratio 2), headless Chrome with GPU:

| Version | Frames per second | Worst frame |
|---|---|---|
| Before the performance pass | 6–7 | over 600 ms |
| After | 52–60 on every view | about 20–35 ms |

## What made the difference

- No CSS `backdrop-filter`, `mix-blend-mode`, film grain or custom cursor over the canvas: each forced the browser to re-composite the whole 3D view every frame.
- No shadow maps: instanced blob shadows for players, and the roof's sun shadow computed in the pitch shader.
- A chromatic split that runs only while the camera is moving, instead of an 18-sample blur on every pixel.
- Bloom at quarter resolution, turned off by day.
- Merged and instanced geometry: one draw call for the crowd, towers, masts, stewards, cars, trees and city.
- Zero allocations in the frame loop, and hover raycasts throttled to one per frame.
- Rain built on first use, the résumé preview loaded on first open, and shaders compiled asynchronously.
- three.js and GSAP shipped as separate long-cached chunks.

## Adaptive quality

`Stadium.adaptQuality()` averages frame time over 40 frames, starting a few seconds after load. If frames run long it steps down:

| Level | What changes |
|---|---|
| 3 (start) | Full quality: 2× multisampling, pixel ratio up to 1.25 |
| 2 | Multisampling off |
| 1 | Pixel ratio 1 |
| 0 | Bloom off and the crowd cut to 55% |

When frames stay comfortably fast for a few seconds at level 1, it raises the pixel ratio again (at most twice), so a brief hitch does not leave the site blurry. The pixel ratio also follows the display when the window moves between screens.

Phones (coarse pointers) start lighter: pixel ratio 1, no multisampling, 9,000 fans and no rival team.
