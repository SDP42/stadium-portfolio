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
| `#/squad` | Top-down through the roof | The starting XI: 11 projects in a 4-3-3, led by MIRAGE (captain), OpsDesk and MERIDIAN |
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

## Starting XI

| # | Pos | Project | In one line | Commits | Case study |
|---|---|---|---|---|---|
| 1 | GK | [Elevate 1.0](https://github.com/SDP42/Elevate1.0) · [live](https://elevate1-0.vercel.app) | The official platform that ran a 24-hour national hackathon. | 145 | [Word](public/case-studies/elevate-case-study.docx) |
| 2 | RB | [NAMASTE × ICD-11](https://github.com/SDP42/SIH_PS_10) | A FHIR R4 service linking traditional and modern medical codes. | 40 | [Word](public/case-studies/namaste-icd11-case-study.docx) |
| 3 | LB | [East Coast Freight Desk](https://github.com/SDP42/east-coast-freight-desk) · [live](https://east-coast-freight-desk.vercel.app) | Freight forecasts and chartering calls for SAIL's coal imports. | 34 | [Word](public/case-studies/east-coast-freight-desk-case-study.docx) |
| 4 | CB | [OHMEN](https://github.com/SDP42/ohmen) | See the cascade before it happens, across critical systems. | 62 | [Word](public/case-studies/ohmen-case-study.docx) |
| 5 | CB | [DataPilot](https://github.com/SDP42/datapilot) | An autonomous data scientist that explains every single step. | 71 | [Word](public/case-studies/datapilot-case-study.docx) |
| 6 | CDM | [BrainMapAI](https://github.com/SDP42/BrainMapAI) | Turns PDFs and research papers into navigable knowledge graphs. | 58 | [Word](public/case-studies/brainmapai-case-study.docx) |
| 7 | RW | [MERIDIAN](https://github.com/SDP42/agentx) | Speak the market, trust every trade: an agentic paper desk. | 116 | [Word](public/case-studies/meridian-case-study.docx) |
| 8 | CM | [Learnova V2](https://github.com/SDP42/LearnovaV2) | Rebuilds lecture PDFs into illustrated, interactive slide decks. | 185 | [Word](public/case-studies/learnova-v2-case-study.docx) |
| 9 | ST | [MIRAGE](https://github.com/SDP42/isacaps2) | Seeing is no longer believing. Is it really safe to act on this? | 201 | [Word](public/case-studies/mirage-case-study.docx) |
| 10 | CAM | [OpsDesk](https://github.com/SDP42/OpsDesk) | Every ticket is a flight: a travel-ops desk run like a tower. | 472 | [Word](public/case-studies/opsdesk-case-study.docx) |
| 11 | LW | [WorldCupAI 2026](https://github.com/SDP42/WorldCupAI-2026) | Predicts the complete FIFA World Cup 2026 knockout bracket. | 8 | [Word](public/case-studies/worldcupai-2026-case-study.docx) |


## On the bench

| Project | In one line | Case study |
|---|---|---|
| Stratify · [live](https://dombivli-hackathon-s6vb.vercel.app) | AI-powered algorithmic trading platform with a Pandas and NumPy strategy backtester. | [Word](public/case-studies/stratify-case-study.docx) |
| Medical AI · Chest X-ray | YOLOv9 and DenseNet-121 diagnosis on 2,000+ chest X-rays, explained with Grad-CAM. | [Word](public/case-studies/medical-ai-case-study.docx) |
| Parallel · [repo](https://github.com/SDP42/parallel) | Attention digital twin that shows both futures of a notification before you tap. | [Word](public/case-studies/parallel-case-study.docx) |
| Smart Resort 360 · [repo](https://github.com/SDP42/guestexperience) | Guest portal with a live 3D twin of a 130-suite resort and a trilingual concierge. | [Word](public/case-studies/smart-resort-360-case-study.docx) |
| DriftWard · [repo](https://github.com/SDP42/driftward) | Behavioural identity layer that contains hijacked AI agents with still-valid tokens. | [Word](public/case-studies/driftward-case-study.docx) |
| CityPulse AI · [repo](https://github.com/SDP42/citypulse-ai) | Local-first civic evidence workbench: every number traces back to its source rows. | [Word](public/case-studies/citypulse-ai-case-study.docx) |
| Learnova IPD · [repo](https://github.com/SDP42/LearnovaIPD) | The original engine behind Learnova, turning text-heavy decks into visual slides. | [Word](public/case-studies/learnova-ipd-case-study.docx) |
| Football Analytics · [repo](https://github.com/SDP42/Football-Analytics) | Tactical football analytics platform, currently in research and architecture phase. | [Word](public/case-studies/football-analytics-case-study.docx) |
| HackNova L5614 · [repo](https://github.com/SDP42/HackNova-L5614) | A logistics platform built against the clock at the HackNova L5614 hackathon event. | [Word](public/case-studies/hacknova-case-study.docx) |


## Case studies

Every project has a Word dossier in [`public/case-studies`](public/case-studies), downloadable from its card on the site. Each one is set in Times New Roman 12 pt, justified, and covers the overview, problem, solution, key features, a layered architecture diagram, the processing pipeline, the technology stack, data and models, engineering and testing, results, and charts of the repository's language mix and commit activity drawn from the GitHub API.


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
