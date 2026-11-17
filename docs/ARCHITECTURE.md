# Architecture

The site is a static Vite app: one HTML page, six ES modules and a stylesheet. There is no server-side code; everything runs in the browser, and the build in `dist/` can be hosted on any static host.

## Modules

| Module | Responsibility |
|---|---|
| `src/main.js` | Boot, routing, camera shot per view, UI rendering, input, tour, goal, penalty shootout, scout HUD |
| `src/scene.js` | `Stadium` class: the three.js world, crowd, lights, pitch, surroundings, time of day, weather, post-processing and camera flights |
| `src/match.js` | `Match` class: articulated players, team movement, ball physics, celebrations and penalties |
| `src/game.js` | Scout mode: XP, levels, badges and toasts |
| `src/audio.js` | `StadiumAudio`: crowd, whistle, whooshes, roar and rain, synthesised with Web Audio |
| `src/data.js` | All content: profile, squad, bench, education, honours, roles, skills and case-study links |

## Routing

Every view is a hash route (`#/stadium`, `#/squad/9`, `#/resume` …), so each one is a shareable URL and the browser's back button works. `go(route)` in `main.js` does the work for each change:

1. Updates the DOM: active view, nav state (`aria-current`), breadcrumb, document title and scene card.
2. Tells the stadium what to show: facade colour, big-screen content, trophy, spotlight and player markers.
3. Moves the ball: a fresh possession, a pass to the next player, the shot, or the penalty setup.
4. Flies the camera with `stadium.flyTo()` along a lifted Bézier arc, then reveals the panel.

## The frame loop

`requestAnimationFrame` drives one loop in `main.js`, which calls `stadium.update()` and then positions the hotspot labels. `Stadium.update()`:

1. Advances time and shared shader uniforms.
2. Updates the camera rig (orbit, drag, parallax, damping, shake) and the speed used for the chromatic effect.
3. Calls `match.update(dt)` for every player, the referee and the ball.
4. Animates the confetti, fireworks, flags and trophy.
5. Lets adaptive quality adjust, then renders through the effect composer.

The loop allocates nothing per frame: scratch vectors are reused so the garbage collector never causes stutter.

## Rendering pipeline

`RenderPass` → `UnrealBloomPass` (quarter resolution, skipped by day) → a small effects pass (vignette, flash and a chromatic split only while the camera moves) → `OutputPass` (tone mapping and colour space). The composer renders into a half-float target with 2× multisampling on desktop.
