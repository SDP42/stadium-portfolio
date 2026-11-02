# SDP42 FC · Swayam Panchal's portfolio

A portfolio you walk into. A real-time 3D twin of a football stadium inspired by Manchester's Etihad Stadium, lit sky blue, full of fans, with a live match on the pitch. Each section of the portfolio is a place in the stadium, and the camera flies you there.

**Swayam Panchal** · B.Tech AI & Data Science, DJ Sanghvi College of Engineering (CGPA 9.70) · 5× hackathon winner
[GitHub](https://github.com/SDP42) · [LinkedIn](https://www.linkedin.com/in/swayam-panchal-11281b34a/)

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/ (Vercel, Netlify or GitHub Pages)
```

## The tour

| Route | Camera | What's there |
|---|---|---|
| `#/` | Outside, slow orbit over the esplanade | Name, pitch, featured captain, "Enter the stadium" |
| `#/stadium` | High in the bowl | Zone markers for every section; fireworks on first entry; start a Mexican wave |
| `#/squad` | Top-down through the roof | The starting XI: 11 projects in a 4-3-3 |
| `#/squad/<no>` | Player cam | Broadcast card per project. "Pass to" kicks the ball to the next player and the camera follows |
| `#/squad/9` | Captain cam | **MIRAGE**, the best project: gold kit, armband, floodlights dim, spotlight, deep-dive card |
| `#/goal` | Behind the striker | Shot, net bulge, confetti, fireworks, scoreboard flips to 1–0 |
| `#/penalty` | Penalty spot | **Shootout mini-game** against the BUGS FC keeper |
| `#/about` | Players' tunnel | Profile, #17 kit, education (CGPA 9.70 · HSC 87.67% · SSC 93%) |
| `#/honours` | Centre spot, trophy rises | 5× hackathon, 2× ideathon, JPMC Code for Good, Secretary of DJS NSDC × Infomatrix, roles |
| `#/skills` | West big screen | Toolkit as match stats |
| `#/bench` | The dugout | Substitutes: earlier-stage projects |
| `#/contact` | Press box | Email, LinkedIn, GitHub, contact form |

Scroll, swipe or use the arrow keys to walk the story (outside → inside → players 1 to 11 → goal). Esc zooms out. Every route is a shareable URL.

## What makes it feel real
- **Stadium twin (Etihad-style):** 12 spiral ramp towers, 8 cable-stayed masts with blinking beacons, a saddle-shaped roof on a truss ring, a finned silver facade whose LED band changes colour per section, a tight three-tier bowl with seat rows and aisles, roof trusses, a ring of floodlights with glare and light shafts, LED boards, glass dugouts, players' tunnel, press box, goals with nets, corner flags.
- **Full house:** around 44,000 instanced fans, one per seat, with an "SDP42" tifo mosaic, arms up in the Mexican wave, camera flashes and waving flags.
- **Live match:** both XIs and a referee with articulated running animation. Players jog, press, face the ball, sprint onto passes and kick. The ball rolls with real spin, or lofts and bounces; the selected player does keepy-uppies.
- **Outside:** esplanade paving, a winding approach path, trees, street lamps, fans walking in, ring-road traffic and a city skyline with lit windows.
- **Day / night:** one switch crossfades sky, sun, clouds, fog, exposure, bloom, floodlights, lamps, windows and the facade.
- **Cinematic camera:** long, damped swooping flights, adaptive quality that keeps motion smooth on slower machines, a speed-based chromatic blur, letterbox bars with a broadcast caption, a stinger wipe between outside and inside, and panels that reveal with a mask wipe.
- **Sound** (opt-in): crowd ambience, whooshes, the referee's whistle, a goal roar and fireworks. All synthesised with Web Audio, so there are no audio files.

## Scout mode (gamification)
XP and levels (Academy → Reserves → First team → Captain → Club legend), 16 badges with toasts and a badge cabinet, progress for scouting all 11 projects, and the penalty shootout with your best score. Progress is stored in the visitor's browser.

## Editing content
Everything lives in [`src/data.js`](src/data.js): `profile`, the starting XI (`squad`, with `captain: true` on the featured project), `bench`, `education`, `honours`, `roles`, `interests` and `skills`. Add a phone number and set `showPhone: true` to list it on the contact page.

## Code map
| File | Role |
|---|---|
| `src/scene.js` | Three.js stadium: shell, bowl, crowd, lights, pitch, surroundings, day/night, post-processing, camera flights |
| `src/match.js` | Articulated players, team movement, ball physics, penalties |
| `src/main.js` | Routing, camera shot per view, UI, input, tour, goal, shootout |
| `src/game.js` | XP, levels, badges, toasts |
| `src/audio.js` | Synthesised stadium sound |
| `src/style.css` | Interface |

Built with [three.js](https://threejs.org) and [GSAP](https://gsap.com) on [Vite](https://vitejs.dev). Respects `prefers-reduced-motion`; phones get bottom-sheet panels and a lighter scene.
