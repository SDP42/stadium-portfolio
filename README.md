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
| `#/resume` | West big screen | **Résumé**: the screen shows the CV, with an in-page PDF preview, Download and Open in new tab |
| `#/contact` | Press box | Email, LinkedIn, GitHub, résumé download, contact form |

Scroll, swipe or use the arrow keys to walk the story (outside → inside → players 1 to 11 → goal). Esc zooms out. Every route is a shareable URL.

## What makes it feel real
- **Stadium twin (Etihad-style, modelled from photos):** drum towers with a sky-blue spiral stripe, cable-stayed masts and V-struts, a saddle roof with a grey metal band, wide glazed inner band and white fascia, a banded glass-and-metal facade, and a three-tier sky-blue bowl with the white LED band.
- **Full house:** 26,000 instanced fans with an "SDP42" tifo mosaic, the Mexican wave, camera flashes and waving flags.
- **Live match:** both XIs and a referee with articulated running animation. Players jog, press, face the ball, sprint onto passes and kick. The ball rolls with real spin, or lofts and bounces; the selected player does keepy-uppies.
- **Outside:** esplanade, approach path, marked car parks with parked cars, the academy stadium with its blue track, teal-roofed halls, brick terraces, trees, street lamps, fans walking in and ring-road traffic.
- **Time of day and weather:** Day, Golden hour and Night crossfade sky, sun, clouds, fog, exposure, bloom, floodlights, lamps, windows and the facade. **Rain** adds falling streaks, an overcast sky, a wet glossy pitch and rain sound.
- **Performance first:** no shadow maps or CSS blur over the canvas, merged and instanced geometry, a roof-accurate sun shadow computed in the pitch shader, and adaptive quality that sheds anti-aliasing, resolution and glow if frames run long. Holds 60 fps on an Apple M1.
- **Cinematic camera:** long, damped swooping flights, adaptive quality that keeps motion smooth on slower machines, a speed-based chromatic blur, letterbox bars with a broadcast caption, a stinger wipe between outside and inside, and panels that reveal with a mask wipe.
- **Sound** (opt-in): crowd ambience, whooshes, the referee's whistle, a goal roar and fireworks. All synthesised with Web Audio, so there are no audio files.

## Scout mode (gamification)
XP and levels (Academy → Reserves → First team → Captain → Club legend), 17 badges with toasts and a badge cabinet, progress for scouting all 11 projects, and the penalty shootout with your best score. Progress is stored in the visitor's browser.

## Editing content
The résumé PDF is [`public/resume/Swayam_Panchal_Resume.pdf`](public/resume/Swayam_Panchal_Resume.pdf); replace that file to update it. Everything else lives in [`src/data.js`](src/data.js): `profile`, the starting XI (`squad`, with `captain: true` on the featured project), `bench`, `education`, `honours`, `roles`, `interests` and `skills`. Add a phone number and set `showPhone: true` to list it on the contact page.

## Code map
| File | Role |
|---|---|
| `src/scene.js` | Three.js stadium: shell, bowl, crowd, lights, pitch, surroundings, day/night, post-processing, camera flights |
| `src/match.js` | Articulated players, team movement, ball physics, penalties |
| `src/main.js` | Routing, camera shot per view, UI, input, tour, goal, shootout |
| `src/game.js` | XP, levels, badges, toasts |
| `src/audio.js` | Synthesised stadium sound |
| `src/style.css` | Interface |

Built with [three.js](https://threejs.org) and [GSAP](https://gsap.com) on [Vite](https://vitejs.dev), with [Vercel Web Analytics](https://vercel.com/docs/analytics). Respects `prefers-reduced-motion`; phones get bottom-sheet panels and a lighter scene.
