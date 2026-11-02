import './style.css';
import * as THREE from 'three';
import gsap from 'gsap';
import { Stadium } from './scene.js';
import { StadiumAudio } from './audio.js';
import { Scout, BADGES, LEVELS, toast } from './game.js';
import { profile, squad, bench, skills, education, honours, roles, interests } from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const mobile = matchMedia('(max-width: 820px)').matches || matchMedia('(pointer: coarse)').matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const byNo = Object.fromEntries(squad.map((p, i) => [p.no, i]));

// ------------------------------------------------------------ static content
function fillContent() {
  const cap = squad.find((p) => p.captain);
  $('#lineup').insertAdjacentHTML('beforebegin', `
    <a class="captain-pick" href="#/squad/${cap.no}" data-link data-hover-player="${byNo[cap.no]}">
      <span class="cp-badge mono">C · PLAYER OF THE MATCH</span>
      <b>${cap.title}</b><small>${cap.tagline} ${cap.subtitle}.</small>
      <span class="cp-stats">${cap.numbers.map(([v, l]) => `<i><b>${v}</b>${l}</i>`).join('')}</span>
      <span class="cp-go mono">Watch the captain →</span>
    </a>`);
  $('#lineup').innerHTML = squad.map((p) => `
    <li class="${p.captain ? 'is-captain' : ''}"><a href="#/squad/${p.no}" data-link data-hover-player="${byNo[p.no]}">
      <span class="ln-no">${p.no}</span>
      <span class="ln-main"><b>${p.title}${p.captain ? ' <em class="armband">C</em>' : ''}</b><small>${p.tagline}</small></span>
      <span class="ln-pos mono">${p.pos}</span>
    </a></li>`).join('');

  $('#formationDots').innerHTML = squad.map((p) =>
    `<a href="#/squad/${p.no}" data-link style="--x:${(p.at[0] + 52.5) / 105};--y:${(p.at[1] + 34) / 68}" aria-label="#${p.no} ${p.title}"><span>${p.no}</span></a>`
  ).join('') + '<i class="f-goal"></i><i class="f-mid"></i>';

  $('#stats').innerHTML = [['9.70', 'CGPA / 10'], ['5×', 'Hackathon wins'], ['2×', 'Ideathon wins'], [`${profile.repos}`, 'Public repos']]
    .map(([v, l]) => `<div class="stat"><b data-count="${v}">${v}</b><span class="mono">${l}</span></div>`).join('');
  $('#skills').innerHTML = skills.map((s, i) => `
    <div class="skill" style="--i:${i}"><h4 class="mono">${s.k}</h4><div class="chips">${s.v.map((x) => `<span>${x}</span>`).join('')}</div></div>`).join('');

  $('#eduList').innerHTML = education.map((e) => `
    <li><div class="edu-score"><b>${e.score}</b><span class="mono">${e.unit}</span></div>
      <div><span class="mono small">${e.years}</span><h4>${e.school}</h4><p>${e.detail}</p></div></li>`).join('');

  $('#honoursList').innerHTML = honours.map((h) => `
    <div class="honour"><b>${h.big}</b><h4>${h.label}</h4><p>${h.note}</p></div>`).join('');
  $('#rolesList').innerHTML = roles.map((r) => `
    <li><span class="mono small">${r.when}</span><h4>${r.title} <em>· ${r.org}</em></h4><p>${r.text}</p></li>`).join('');
  $('#interestList').innerHTML = interests.map((x) => `<span>${x}</span>`).join('');

  $('#benchList').innerHTML = bench.map((b, i) => {
    const tag = b.repo ? 'a' : 'div';
    const attrs = b.repo ? `href="${b.repo}" target="_blank" rel="noopener"` : '';
    return `<${tag} class="sub" ${attrs}>
      <span class="sub-no mono">${String(12 + i).padStart(2, '0')}</span>
      <div><h4>${b.title}</h4><p>${b.tagline}</p><div class="chips sm">${b.stack.map((s) => `<span>${s}</span>`).join('')}</div></div>
      <span class="sub-go mono">${b.repo ? (b.linkLabel || 'Repo') + ' ↗' : 'Private'}</span>
    </${tag}>`;
  }).join('');

  $('#mailLink').href = `mailto:${profile.email}`;
  $('#mailText').textContent = profile.email;
  $('#liLink').href = profile.linkedin;
  $('#ghLink').href = profile.github;
  if (profile.showPhone) {
    $('.contact-links').insertAdjacentHTML('beforeend',
      `<a class="clink" href="tel:${profile.phone.replace(/\s/g, '')}"><span class="mono">PHONE</span><b>${profile.phone}</b><i>↗</i></a>`);
  }
  $('#contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const body = `${f.get('msg')}\n\n${f.get('name')} · ${f.get('email')}`;
    location.href = `mailto:${profile.email}?subject=${encodeURIComponent('Hello from your portfolio · ' + f.get('name'))}&body=${encodeURIComponent(body)}`;
  });

  const items = ['SDP42 FC take the field', 'CGPA 9.70 / 10', '5× hackathon winner', '2× ideathon winner', 'JPMC Code for Good',
    'Secretary · DJS NSDC × Infomatrix', 'MIRAGE: 41/42 laundered voice deepfakes caught', 'Learnova: 700+ tests',
    'Elevate 1.0: 700+ registrations', 'Transfer window: OPEN', 'Penalty shootout: can you beat the BUGS FC keeper?', 'Scout all 11 to unlock the full report'];
  const row = items.map((t) => `<span>${t}</span><i>◆</i>`).join('');
  $('#ticker').innerHTML = row + row;
}

// ------------------------------------------------------------ player card
function renderCard(i) {
  const p = squad[i];
  const prev = squad[i - 1], next = squad[i + 1];
  const maxC = Math.max(...squad.map((s) => s.commits));
  $('#playerCard').classList.toggle('captain', !!p.captain);
  $('#playerCard').innerHTML = `
    ${p.captain ? '<div class="motm mono"><span>★</span> CAPTAIN · PLAYER OF THE MATCH · BEST PROJECT</div>' : ''}
    <div class="card-top">
      <span class="card-no" aria-hidden="true">${p.no}</span>
      <div class="card-id">
        <span class="mono eyebrow">#${p.no} · ${p.posName.toUpperCase()} · ${i + 1}/11</span>
        <h2 class="card-title" data-scramble>${p.title}</h2>
        <p class="card-event mono">${p.event}</p>
      </div>
    </div>
    <p class="card-tag">${p.tagline}</p>
    ${p.subtitle ? `<p class="card-sub mono">${p.subtitle}</p>` : ''}
    ${p.numbers ? `<div class="card-numbers">${p.numbers.map(([v, l]) => `<div><b>${v}</b><span class="mono">${l}</span></div>`).join('')}</div>` : ''}
    <p class="card-about">${p.about}</p>
    ${p.deep ? `<div class="card-deep">${p.deep.map(([h, t], k) => `<details ${k === 0 ? 'open' : ''}><summary><span class="mono">0${k + 1}</span>${h}</summary><p>${t}</p></details>`).join('')}</div>` : ''}
    <ul class="card-points">${p.points.map((x) => `<li>${x}</li>`).join('')}</ul>
    <div class="chips">${p.stack.map((x) => `<span>${x}</span>`).join('')}</div>
    <div class="card-meter mono"><span>Commits</span><i style="--w:${Math.max(0.04, p.commits / maxC)}"></i><b>${p.commits}</b></div>
    <div class="card-links">
      <a class="btn btn-primary" href="${p.repo}" target="_blank" rel="noopener">View on GitHub <span>↗</span></a>
      ${p.live ? `<a class="btn btn-ghost" href="${p.live}" target="_blank" rel="noopener">Live demo <span>↗</span></a>` : ''}
    </div>
    <div class="card-nav">
      ${prev ? `<a href="#/squad/${prev.no}" data-link class="pass prev"><span class="mono">← Pass back</span><b>#${prev.no} ${prev.title}</b></a>` : '<span></span>'}
      ${next
        ? `<a href="#/squad/${next.no}" data-link class="pass next"><span class="mono">Pass to →</span><b>#${next.no} ${next.title}</b></a>`
        : `<a href="#/goal" data-link class="pass next shoot"><span class="mono">Final third</span><b>Take the shot ⚽</b></a>`}
    </div>`;
  $$('#formationDots a').forEach((a, k) => a.classList.toggle('on', k === i));
  scramble($('#playerCard [data-scramble]'));
}

// ------------------------------------------------------------ text scramble
const glyphs = '01#%&/<>[]{}=+*?ABCDEFGHJKLMNPRSTUVWXYZ';
function scramble(el) {
  if (!el || reduced) return;
  const final = el.dataset.final || el.textContent;
  el.dataset.final = final;
  let f = 0;
  const total = 22;
  cancelAnimationFrame(el._raf);
  const tick = () => {
    f++;
    el.textContent = [...final].map((ch, i) => (ch === ' ' || i < (f / total) * final.length ? ch : glyphs[(Math.random() * glyphs.length) | 0])).join('');
    if (f < total) el._raf = requestAnimationFrame(tick);
    else el.textContent = final;
  };
  tick();
}

// ------------------------------------------------------------ boot
fillContent();
let stadium;
try {
  // quality follows the device (touch = phone/tablet GPU), not the window width
  stadium = new Stadium($('#stage'), { mobile: matchMedia('(pointer: coarse)').matches });
  stadium.addPlayers(squad);
  if (import.meta.env.DEV) {
    window.__stadium = stadium;
    if (location.search.includes('nolag')) gsap.ticker.lagSmoothing(0); // headless screenshot runs
  }
} catch (e) {
  console.error(e);
  document.body.classList.add('no-webgl');
}

// Camera framing: put `focus` on the side opposite the panel (or above a mobile sheet).
const UP = new THREE.Vector3(0, 1, 0);
function frame(pos, focus, side = 'center', amount = 0.22) {
  const P = new THREE.Vector3(...pos), F = new THREE.Vector3(...focus);
  const dist = P.distanceTo(F);
  const dir = F.clone().sub(P).normalize();
  const right = dir.clone().cross(UP).normalize();
  const T = F.clone();
  if (mobile) T.add(UP.clone().multiplyScalar(-dist * 0.2 * (side === 'center' ? 0.3 : 1)));
  else if (side === 'left') T.add(right.multiplyScalar(dist * amount));   // focus appears left
  else if (side === 'right') T.add(right.multiplyScalar(-dist * amount)); // focus appears right
  return { pos: [P.x, P.y, P.z], target: [T.x, T.y, T.z] };
}

function playerShot(i) {
  const [x, z] = squad[i].at;
  const a = -z / 42;
  return frame([x - Math.cos(a) * 12.5, 5.2, z + Math.sin(a) * 12.5 + 3], [x, 2.2, z], 'left', 0.2);
}

const VIEWS = {
  home:    { shot: () => frame([200, 64, 270], [0, mobile ? 30 : 16, 0], 'right', 0.3), fov: 40, orbit: 0.045, shell: ['#62c8ff', '#62c8ff', 0], hot: true, parent: null, crumb: 'Outside the arena' },
  stadium: { shot: () => ({ pos: [56, 38, 30], target: [-12, 3, -6] }), fov: 56, orbit: 0.022, shell: ['#62c8ff', '#ffffff', 1], hot: true, parent: 'home', crumb: 'Inside the arena' },
  squad:   { shot: () => frame([0, 118, 52], [0, 0, 0], 'left', 0.2), fov: 44, shell: ['#62c8ff', '#ffffff', 0.6], parent: 'stadium', crumb: 'The pitch · Starting XI' },
  player:  { fov: 46, shell: ['#62c8ff', '#d4ff3a', 0.5], parent: 'squad' },
  goal:    { shot: () => ({ pos: [24, 4.5, -11], target: [52, 1.6, 1] }), fov: 40, shell: ['#d4ff3a', '#62c8ff', 1], parent: 'stadium', crumb: 'Final third' },
  skills:  { shot: () => frame([-26, 20, 6], [-80, 33, 0], 'right', 0.2), fov: 44, shell: ['#62c8ff', '#b8ecff', 0.6], parent: 'stadium', crumb: 'The big screen · Skills' },
  about:   { shot: () => frame([5, 4.5, 26], [0, 2.6, 44.5], 'left', 0.18), fov: 46, shell: ['#b8ecff', '#ffffff', 0.3], parent: 'stadium', crumb: "Players' tunnel · About" },
  honours: { shot: () => frame([8, 3.2, 8], [0, 2.4, 0], 'left', 0.2), fov: 44, shell: ['#f3c75a', '#62c8ff', 1], parent: 'stadium', crumb: 'Centre spot · Honours' },
  bench:   { shot: () => frame([24, 5, 29], [12, 1.5, 42.5], 'left', 0.2), fov: 46, shell: ['#62c8ff', '#d4ff3a', 0.4], parent: 'stadium', crumb: 'The dugout · Bench' },
  penalty: { shot: () => ({ pos: [33.2, 2.5, 0], target: [52.5, 1.3, 0] }), fov: 38, shell: ['#62c8ff', '#d4ff3a', 1], parent: 'stadium', crumb: 'Penalty spot · Shootout' },
  contact: { shot: () => frame([8, 7, -26], [0, 24, -75], 'right', 0.2), fov: 44, shell: ['#62c8ff', '#ffffff', 1], parent: 'stadium', crumb: 'Press box · Contact' },
};

// Hotspots: clickable zone markers projected from 3D.
// Scene cards: what each camera stop is, in the broadcast lower-third.
const SCENES = {
  home: ['Outside the arena', 'An Etihad-style twin: spiral ramp towers, cable-stayed masts, a saddle roof. The light band changes colour with every section.'],
  stadium: ['Inside the arena', 'Every glowing marker is a section. Click one and the camera flies you there.'],
  squad: ['The pitch · 4-3-3', 'Eleven projects line up as a starting XI. Click any player.'],
  player: ['Player cam', 'Each project is a player. “Pass to” sends the ball, and the camera, to the next one.'],
  goal: ['Final third', 'The striker shoots. Watch the net.'],
  skills: ['West big screen', 'The toolkit, shown as match stats.'],
  about: ["Players' tunnel", 'Where every match starts. Profile and education.'],
  honours: ['Centre spot', 'The trophy rises: hackathon wins, leadership and roles.'],
  bench: ['The dugout', 'Substitutes: earlier-stage projects warming up.'],
  contact: ['Press box', 'The transfer window is open. Get in touch.'],
  penalty: ['Penalty shootout', 'Five kicks against the BUGS FC keeper. Aim with the mouse, click to shoot.'],
};
let sceneNo = 0;
function showScene(view) {
  const [t, x] = SCENES[view] || [];
  if (!t) return;
  sceneNo++;
  $('#scNo').textContent = String(sceneNo).padStart(2, '0');
  $('#scTitle').textContent = t;
  $('#scText').textContent = x;
  const c = $('#sceneCard');
  c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
  clearTimeout(showScene.t);
  showScene.t = setTimeout(() => c.classList.remove('show'), 4200);
}

const HOTSPOTS = [
  { view: 'squad', href: '#/squad', title: 'The Pitch', sub: 'Projects · Starting XI', at: () => new THREE.Vector3(-26, 1, -12) },
  { view: 'honours', href: '#/honours', title: 'Centre Spot', sub: 'Honours & roles', at: () => new THREE.Vector3(0, 1.5, 0) },
  { view: 'about', href: '#/about', title: "Players' Tunnel", sub: 'About & education', at: () => stadium.anchors.about },
  { view: 'skills', href: '#/skills', title: 'Big Screen', sub: 'Skills & stats', at: () => stadium.anchors.skills },
  { view: 'bench', href: '#/bench', title: 'The Dugout', sub: 'More projects', at: () => stadium.anchors.bench },
  { view: 'penalty', href: '#/penalty', title: 'Penalty Spot', sub: 'Play the shootout', at: () => new THREE.Vector3(41.5, 1, 0) },
  { view: 'contact', href: '#/contact', title: 'Press Box', sub: 'Contact me', at: () => stadium.anchors.contact },
];
const HOME_HOT = [{ view: 'stadium', href: '#/stadium', title: 'Enter', sub: 'Step inside the arena', at: () => new THREE.Vector3(0, 46, -20) }];
const hotWrap = $('#hotspots');
const hotEls = [...HOTSPOTS, ...HOME_HOT].map((h, i) => {
  const a = document.createElement('a');
  a.href = h.href; a.dataset.link = ''; a.className = 'hotspot';
  a.innerHTML = `<span class="hs-dot"><i></i></span><span class="hs-label"><b>${h.title}</b><small class="mono">${h.sub}</small></span>`;
  a.style.setProperty('--d', `${i * 0.07}s`);
  hotWrap.appendChild(a);
  return { ...h, el: a, home: i >= HOTSPOTS.length };
});

// ------------------------------------------------------------ router
let current = { view: null, i: -1 };
let firstEntry = false;
let penaltyActive = false;
const scout = new Scout({ onChange: renderHud });
const audio = new StadiumAudio();
if (stadium) stadium.onFirework = () => audio.boom();
let busy = false;

function parse() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const v = parts[0] || 'home';
  if (v === 'squad' && parts[1] && byNo[parts[1]] !== undefined) return { view: 'player', i: byNo[parts[1]] };
  return { view: VIEWS[v] ? v : 'home', i: -1 };
}

function hrefFor(r) { return r.view === 'player' ? `#/squad/${squad[r.i].no}` : r.view === 'home' ? '#/' : `#/${r.view}`; }

async function go(route) {
  const prev = current;
  current = route;
  const cfg = VIEWS[route.view];
  document.body.dataset.view = route.view;

  // UI out
  $$('.view').forEach((el) => el.classList.toggle('active', el.dataset.view === route.view));
  $$('.nav a').forEach((a) => a.classList.toggle('on', a.dataset.view === route.view || (route.view === 'player' && a.dataset.view === 'squad')));
  $('#crumbs').classList.toggle('show', route.view !== 'home');
  $('#trail').textContent = route.view === 'player' ? `The pitch / #${squad[route.i].no} ${squad[route.i].title}` : cfg.crumb;
  document.body.classList.remove('menu-open');
  if (route.view === 'player') renderCard(route.i);
  if (route.view !== 'goal') $('#goal').classList.remove('show');
  $$(`.view[data-view="${route.view}"] [data-scramble]`).forEach(scramble);
  if (route.view === 'skills') countUp();

  showScene(route.view);
  if (!stadium) return;
  // cinematic dressing for the move: stinger wipe between worlds, letterbox for every flight
  const crossing = prev.view && ((prev.view === 'home') !== (route.view === 'home') || ['goal', 'penalty'].includes(route.view));
  if (crossing && !reduced) stinger();
  if (prev.view && !reduced) {
    $('#lbText').textContent = `CAM ${String(sceneNo).padStart(2, '0')} → ${(SCENES[route.view] || [''])[0].toUpperCase()}`;
    $('#lbSub').textContent = route.view === 'player' ? `#${squad[route.i].no} ${squad[route.i].title} · ${squad[route.i].posName}` : (SCENES[route.view] || ['', ''])[1];
    document.body.classList.add('in-flight');
  }
  if (route.view !== prev.view || route.i !== prev.i) audio.whoosh(route.view === 'player' && prev.view === 'player' ? 1.1 : 1.8);
  if (route.view === 'player' && prev.view !== 'player') audio.whistle();
  if (route.view === 'stadium' && !firstEntry) { firstEntry = true; setTimeout(() => stadium.launchFireworks(9), 1400); }
  stadium.showTrophy(route.view === 'honours');
  stadium.setActivePlayer(route.view === 'player' ? route.i : -1);
  const isCaptain = route.view === 'player' && squad[route.i].captain;
  stadium.spotlight(isCaptain ? squad[route.i].at : null);
  if (isCaptain && !(prev.view === 'player' && prev.i === route.i)) setTimeout(() => stadium.launchFireworks(8, ['#f3c75a', '#7fd4ff', '#ffffff']), 1600);
  stadium.drawScreen(route.view === 'skills' ? 'skills' : 'board');
  const [a, b, chase] = isCaptain ? ['#f3c75a', '#7fd4ff', 1] : cfg.shell;
  stadium.setShell(a, b, chase);

  // the ball follows the story
  if (prev.view === 'penalty' && route.view !== 'penalty') { stadium.penaltyEnd(); penaltyActive = false; }
  if (route.view === 'player') {
    const fromPlayer = prev.view === 'player';
    if (!fromPlayer) { stadium.giveBall(route.i); scout.streak = 0; }
    else {
      stadium.passTo(route.i);
      if (++scout.streak >= 5) scout.award('tikitaka');
    }
    scout.scout(squad[route.i].no, squad.length);
    if (squad[route.i].captain) scout.award('captain');
  } else if (route.view !== 'goal' && prev.view === 'goal') {
    stadium.giveBall(0);
  }
  if (route.view !== 'player') scout.streak = 0;
  if (['about', 'squad', 'skills', 'honours', 'bench', 'contact', 'stadium'].includes(route.view)) scout.visit(route.view);
  if (route.view === 'stadium') scout.award('kickoff');
  if (route.view === 'honours') scout.award('trophy');
  if (route.view === 'contact') scout.award('transfer');
  if (route.view === 'skills') scout.award('analyst');

  const shot = route.view === 'player' ? playerShot(route.i) : cfg.shot();
  busy = true;
  const flight = stadium.flyTo({ ...shot, fov: cfg.fov, orbit: reduced ? 0 : cfg.orbit || 0, duration: reduced ? 0.6 : undefined });
  if (route.view === 'goal') {
    if (prev.view !== 'player' || prev.i !== squad.length - 1) stadium.giveBall(squad.length - 1);
    await flight;
    document.body.classList.remove('in-flight');
    await new Promise((r) => setTimeout(r, 250));
    if (current.view !== 'goal') { busy = false; return; }
    await stadium.shoot();
    audio.roar();
    stadium.launchFireworks(14);
    celebrate();
    scout.award('golazo');
  } else if (route.view === 'penalty') {
    stadium.penaltySetup();
    await flight;
    document.body.classList.remove('in-flight');
    startShootout();
  } else {
    await flight;
  }
  if (current === route) document.body.classList.remove('in-flight');
  busy = false;
}

function navigate(href) {
  if (href === location.hash || (href === '#/' && !location.hash)) { go(parse()); return; }
  location.hash = href;
}
window.addEventListener('hashchange', () => go(parse()));

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-link]');
  if (!a) return;
  e.preventDefault();
  navigate(a.getAttribute('href'));
});
$('#backBtn').addEventListener('click', zoomOut);
$('.menu-btn').addEventListener('click', () => {
  const open = document.body.classList.toggle('menu-open');
  $('.menu-btn').setAttribute('aria-expanded', String(open));
});

$('#soundBtn').addEventListener('click', () => {
  const on = audio.toggle();
  $('#soundBtn').setAttribute('aria-pressed', String(on));
  $('#soundBtn').classList.toggle('on', on);
  $('#soundLabel').textContent = on ? 'SOUND ON' : 'SOUND OFF';
  if (on) { audio.whistle([0.5]); scout.award('ultras'); }
});

// day / night
function setDay(on, animate = true) {
  document.body.classList.toggle('is-day', on);
  $('#dayBtn').setAttribute('aria-pressed', String(on));
  $('#dayLabel').textContent = on ? 'DAY' : 'NIGHT';
  stadium?.setDay(on, animate ? 2.4 : 0.01);
  try { localStorage.setItem('sdp42fc.day', on ? '1' : '0'); } catch { /* ignore */ }
}
$('#dayBtn').addEventListener('click', () => {
  setDay(!document.body.classList.contains('is-day'));
  audio.whoosh(2.2);
  scout.award('daynight');
});
try { if (localStorage.getItem('sdp42fc.day') === '1') setDay(true, false); } catch { /* ignore */ }

$('#waveBtn').addEventListener('click', () => {
  stadium?.startWave();
  audio.roar();
  scout.award('wave');
});

// scout HUD + badge cabinet
function renderHud() {
  const l = scout.level();
  $('#hudLevel').textContent = l.name.toUpperCase();
  $('#hudBar').style.transform = `scaleX(${l.pct})`;
  $('#hudXp').textContent = scout.xp;
  $('#hudScout').textContent = scout.scouted.size;
  $('#hudBadges').textContent = scout.badges.size;
  $('#cabLevel').textContent = `${l.name} · ${scout.xp} XP${l.next ? ` · ${l.next.xp - scout.xp} XP to ${l.next.name}` : ' · max level'} · ${scout.badges.size}/${BADGES.length} badges`;
  $('#cabGrid').innerHTML = BADGES.map((b) => `
    <div class="badge ${scout.badges.has(b.id) ? 'got' : ''}"><span>${b.icon}</span><b>${b.name}</b><small>${b.hint}</small></div>`).join('');
}
renderHud();
const cabinet = $('#cabinet');
const openCab = (on) => { cabinet.classList.toggle('open', on); cabinet.setAttribute('aria-hidden', String(!on)); };
$('#hud').addEventListener('click', () => openCab(true));
$('#cabClose').addEventListener('click', () => openCab(false));
cabinet.addEventListener('click', (e) => { if (e.target === cabinet) openCab(false); });
$('#cabReset').addEventListener('click', () => { if (confirm('Reset all scouting progress?')) scout.reset(); });

// ------------------------------------------------------------ penalty shootout
const pen = { kick: 0, goals: 0, results: [], busy: false, aim: null };
function startShootout() {
  Object.assign(pen, { kick: 0, goals: 0, results: [], busy: false });
  penaltyActive = true;
  $('#penEnd').classList.remove('show');
  renderPen();
}
function renderPen() {
  $('#penKick').textContent = Math.min(pen.kick + 1, 5);
  $('#penBest').textContent = scout.best;
  $('#penDots').innerHTML = [0, 1, 2, 3, 4].map((k) => `<i class="${pen.results[k] || ''}"></i>`).join('');
}
function penFlash(text, kind) {
  const f = $('#penFlash');
  f.textContent = text; f.className = `pen-flash show ${kind}`;
  clearTimeout(penFlash.t); penFlash.t = setTimeout(() => f.classList.remove('show'), 1300);
}
async function shootPenalty() {
  if (!penaltyActive || pen.busy || pen.kick >= 5 || !pen.aim || busy) return;
  pen.busy = true;
  audio.whistle([0.25]);
  const r = await stadium.penaltyKick(pen.aim.clone());
  pen.results[pen.kick] = r;
  pen.kick++;
  if (r === 'goal') { pen.goals++; penFlash('GOAL!', 'goal'); audio.roar(); stadium.launchFireworks(4); scout.add(30, 'Penalty scored'); scout.award('spot'); }
  else if (r === 'saved') { penFlash('SAVED!', 'saved'); audio.boom(); }
  else { penFlash('WIDE!', 'miss'); }
  renderPen();
  await new Promise((res) => setTimeout(res, 1500));
  if (pen.kick >= 5) {
    scout.best = Math.max(scout.best, pen.goals); scout.save();
    if (pen.goals >= 3) scout.award('hattrick');
    if (pen.goals === 5) scout.award('perfect');
    $('#penResult').innerHTML = `${pen.goals} <em>/ 5</em> · ${['Keep training', 'Bench warmer', 'Squad player', 'Hat-trick hero', 'Ice cold', 'Perfect. Legend.'][pen.goals]}`;
    $('#penEnd').classList.add('show');
    renderPen();
  } else stadium.penaltyReset();
  pen.busy = false;
}
$('#penAgain').addEventListener('click', () => { stadium.penaltyReset(); startShootout(); });

// magnetic buttons
document.addEventListener('pointermove', (e) => {
  const b = e.target.closest('.btn, .nav a, .sound');
  if (magnet && magnet !== b) { magnet.style.transform = ''; magnet = null; }
  if (!b || mobile) return;
  const r = b.getBoundingClientRect();
  b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.25}px)`;
  magnet = b;
});
let magnet = null;

function zoomOut() {
  const p = VIEWS[current.view]?.parent;
  if (p) navigate(hrefFor({ view: p }));
}

// Linear story for scroll / keys
const STORY = ['home', 'stadium', ...squad.map((_, i) => ({ view: 'player', i })), 'goal'].map((s) => (typeof s === 'string' ? { view: s, i: -1 } : s));
function storyStep(dir) {
  const idx = STORY.findIndex((s) => s.view === current.view && s.i === current.i);
  if (idx < 0) return false;
  const next = STORY[idx + dir];
  if (!next) return false;
  navigate(hrefFor(next));
  return true;
}

let wheelLock = 0;
window.addEventListener('wheel', (e) => {
  if (e.target.closest('.panel-inner, .card')) return;
  const now = performance.now();
  if (now < wheelLock || Math.abs(e.deltaY) < 12) return;
  if (storyStep(e.deltaY > 0 ? 1 : -1)) wheelLock = now + 1300;
}, { passive: true });

window.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea')) return;
  if (e.key === 'Escape') { if (cabinet.classList.contains('open')) openCab(false); else zoomOut(); }
  if (e.key === ' ' && current.view === 'penalty') { e.preventDefault(); shootPenalty(); }
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') { if (storyStep(1)) e.preventDefault(); }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') { if (storyStep(-1)) e.preventDefault(); }
});

// touch: swipe up/down on the stage walks the story
let touchY = null;
window.addEventListener('touchstart', (e) => { touchY = e.target.closest('.panel-inner, .card') ? null : e.touches[0].clientY; }, { passive: true });
window.addEventListener('touchend', (e) => {
  if (touchY == null) return;
  const dy = touchY - e.changedTouches[0].clientY;
  if (Math.abs(dy) > 60 && ['home', 'stadium', 'goal'].includes(current.view)) storyStep(dy > 0 ? 1 : -1);
  touchY = null;
}, { passive: true });

function stinger() {
  const s = $('#stinger');
  s.classList.remove('run'); void s.offsetWidth; s.classList.add('run');
}

// ------------------------------------------------------------ goal
function celebrate() {
  const g = $('#goal');
  g.classList.add('show');
  $('#scoreHome').textContent = '1';
  gsap.fromTo('.goal-word span', { yPercent: 120, rotate: () => gsap.utils.random(-25, 25), opacity: 0 },
    { yPercent: 0, rotate: 0, opacity: 1, stagger: 0.05, duration: 0.7, ease: 'back.out(2.5)' });
  gsap.fromTo('.goal-sub, .goal-cta', { y: 20, opacity: 0 }, { y: 0, opacity: 1, delay: 0.6, stagger: 0.1 });
  document.body.classList.add('shake');
  setTimeout(() => document.body.classList.remove('shake'), 700);
}

// ------------------------------------------------------------ stat count-up
function countUp() {
  $$('#stats b').forEach((b) => {
    const raw = b.dataset.count, n = parseFloat(raw), suffix = raw.replace(/[\d.]/g, ''), dec = raw.includes('.') ? 2 : 0;
    const o = { v: 0 };
    gsap.to(o, { v: n, duration: 1.4, ease: 'power3.out', onUpdate: () => { b.textContent = o.v.toFixed(dec) + suffix; } });
  });
}

// ------------------------------------------------------------ pointer: cursor, hover, drag, pick
const cursor = $('.cursor');
const cpos = { x: innerWidth / 2, y: innerHeight / 2 }, ctarget = { ...cpos };
let hoverIdx = -1, down = null;
window.addEventListener('pointermove', (e) => {
  ctarget.x = e.clientX; ctarget.y = e.clientY;
  if (!stadium) return;
  const nx = (e.clientX / innerWidth) * 2 - 1, ny = -(e.clientY / innerHeight) * 2 + 1;
  stadium.setMouse(nx, ny);
  if (down && ['home', 'stadium'].includes(current.view)) {
    stadium.dragging = true;
    stadium.nudge(-(e.clientX - down.x) * 0.004, (e.clientY - down.y) * 0.0015);
    down.x = e.clientX; down.y = e.clientY; down.moved = true;
  }
  const onStage = e.target === $('#stage');
  if (current.view === 'penalty') {
    pen.aim = stadium.aimAt(nx, ny);
    const r = $('#reticle');
    if (pen.aim) {
      const p = stadium.project(pen.aim);
      r.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      const off = Math.abs(pen.aim.z) > 3.6 || pen.aim.y > 2.4;
      r.classList.toggle('off', off);
    }
    cursor.classList.toggle('aim', onStage);
  } else cursor.classList.remove('aim');
  hoverIdx = onStage && ['stadium', 'squad', 'player'].includes(current.view) ? stadium.pickPlayer(nx, ny) : -1;
  const linkHover = e.target.closest('[data-hover-player]');
  if (linkHover) hoverIdx = +linkHover.dataset.hoverPlayer;
  stadium.setHover(hoverIdx);
  cursor.classList.toggle('player', hoverIdx >= 0 && onStage);
  cursor.classList.toggle('link', !!e.target.closest('a, button, input, textarea, .hotspot'));
  cursor.classList.toggle('drag', onStage && ['home', 'stadium'].includes(current.view) && hoverIdx < 0);
});
$('#stage').addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, moved: false }; cursor.classList.add('down'); });
window.addEventListener('pointerup', (e) => {
  cursor.classList.remove('down');
  if (stadium) stadium.dragging = false;
  if (down && !down.moved && e.target === $('#stage') && stadium && current.view === 'penalty') {
    const nx = (e.clientX / innerWidth) * 2 - 1, ny = -(e.clientY / innerHeight) * 2 + 1;
    pen.aim = stadium.aimAt(nx, ny);
    shootPenalty();
  } else if (down && !down.moved && e.target === $('#stage') && stadium) {
    const i = stadium.pickPlayer((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    if (i >= 0) navigate(`#/squad/${squad[i].no}`);
  }
  down = null;
});

// ------------------------------------------------------------ loop
const clockEl = $('#clock');
const t0 = performance.now();
function loop() {
  requestAnimationFrame(loop);
  cpos.x += (ctarget.x - cpos.x) * 0.22; cpos.y += (ctarget.y - cpos.y) * 0.22;
  cursor.style.transform = `translate3d(${cpos.x}px, ${cpos.y}px, 0)`;
  const s = Math.floor((performance.now() - t0) / 1000);
  clockEl.textContent = `${String(Math.min(90, Math.floor(s / 60))).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  if (!stadium) return;
  stadium.update();
  // hotspots follow their 3D anchors
  const showHot = ['stadium', 'home'].includes(current.view) && !busy;
  hotEls.forEach((h) => {
    const visible = showHot && (h.home ? current.view === 'home' : current.view === 'stadium');
    const p = stadium.project(h.at());
    const off = p.behind || p.x < -50 || p.x > innerWidth + 50 || p.y < 40 || p.y > innerHeight - 40;
    h.el.classList.toggle('show', visible && !off);
    if (visible) h.el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
  });
}

// ------------------------------------------------------------ loader → lights → first view
async function start() {
  const pct = { v: 0 };
  const pctEl = $('#loadPct'), bar = $('#loadBar');
  const fonts = document.fonts?.ready || Promise.resolve();
  const tw = gsap.to(pct, { v: 92, duration: 1.4, ease: 'power2.out', onUpdate: () => { pctEl.textContent = String(Math.round(pct.v)).padStart(2, '0'); bar.style.transform = `scaleX(${pct.v / 100})`; } });
  await fonts;
  if (stadium) {
    // redraw canvases that used web fonts, then warm up shaders
    stadium.drawScreen('board');
    stadium.renderer.compile(stadium.scene, stadium.camera);
  }
  await tw;
  await gsap.to(pct, { v: 100, duration: 0.3, onUpdate: () => { pctEl.textContent = String(Math.round(pct.v)).padStart(2, '0'); bar.style.transform = `scaleX(${pct.v / 100})`; } });
  loop();
  $('#loader').classList.add('done');
  document.body.classList.add('ready');
  if (stadium) stadium.lightsOn();
  go(parse());
}
start();
