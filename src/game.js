// Scout mode: XP, levels, badges and toasts. Progress is a per-visitor
// convenience kept in localStorage; the site works the same without it.
const KEY = 'sdp42fc.scout.v1';

export const LEVELS = [
  { xp: 0, name: 'Academy' },
  { xp: 150, name: 'Reserves' },
  { xp: 400, name: 'First team' },
  { xp: 800, name: 'Captain' },
  { xp: 1300, name: 'Club legend' },
];

export const BADGES = [
  { id: 'kickoff', icon: '🏟️', name: 'Through the turnstiles', hint: 'Enter the stadium' },
  { id: 'scout1', icon: '🔎', name: 'First scout', hint: 'Open any project' },
  { id: 'captain', icon: '©️', name: "Captain's call", hint: 'Meet the captain, MIRAGE' },
  { id: 'tikitaka', icon: '🔁', name: 'Tiki-taka', hint: 'Make 5 passes in a row' },
  { id: 'fullsquad', icon: '📋', name: 'Full scouting report', hint: 'Scout all 11 projects' },
  { id: 'golazo', icon: '⚽', name: 'Golazo', hint: 'Finish the tour with a goal' },
  { id: 'spot', icon: '🎯', name: 'Ice in the veins', hint: 'Score a penalty' },
  { id: 'hattrick', icon: '🎩', name: 'Hat-trick', hint: 'Score 3 in one shootout' },
  { id: 'perfect', icon: '💯', name: 'Perfect shootout', hint: 'Score 5 out of 5' },
  { id: 'wave', icon: '🌊', name: 'Wave maker', hint: 'Start a Mexican wave' },
  { id: 'ultras', icon: '📣', name: 'Ultras', hint: 'Turn the stadium sound on' },
  { id: 'daynight', icon: '🌗', name: 'Groundskeeper', hint: 'Change the time of day' },
  { id: 'trophy', icon: '🏆', name: 'Trophy hunter', hint: 'Visit the trophy at the centre spot' },
  { id: 'analyst', icon: '📊', name: 'Analyst', hint: 'Read the stats on the big screen' },
  { id: 'cv', icon: '📄', name: 'Background check', hint: 'Open the résumé' },
  { id: 'transfer', icon: '✍️', name: 'Transfer request', hint: 'Visit the press box' },
  { id: 'legend', icon: '👑', name: 'Club legend', hint: 'Unlock every other badge' },
];

const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };

export class Scout {
  constructor({ onChange } = {}) {
    const d = load();
    this.xp = d.xp || 0;
    this.badges = new Set(d.badges || []);
    this.scouted = new Set(d.scouted || []);
    this.seen = new Set(d.seen || []);
    this.best = d.best || 0;
    this.onChange = onChange;
    this.streak = 0;
  }

  save() {
    try { localStorage.setItem(KEY, JSON.stringify({ xp: this.xp, badges: [...this.badges], scouted: [...this.scouted], seen: [...this.seen], best: this.best })); } catch { /* private mode */ }
    this.onChange?.(this);
  }

  level() {
    let i = 0;
    while (i < LEVELS.length - 1 && this.xp >= LEVELS[i + 1].xp) i++;
    const cur = LEVELS[i], next = LEVELS[i + 1];
    return { i, name: cur.name, next, pct: next ? (this.xp - cur.xp) / (next.xp - cur.xp) : 1 };
  }

  add(xp, reason) {
    const before = this.level().i;
    this.xp += xp;
    toast({ kind: 'xp', title: `+${xp} XP`, text: reason });
    const after = this.level();
    if (after.i > before) toast({ kind: 'level', title: `Promoted: ${after.name}`, text: 'Your scouting level went up.' });
    this.save();
  }

  award(id) {
    if (this.badges.has(id)) return false;
    const b = BADGES.find((x) => x.id === id);
    this.badges.add(id);
    toast({ kind: 'badge', icon: b.icon, title: b.name, text: 'Badge unlocked · +50 XP' });
    this.xp += 50;
    if (id !== 'legend' && BADGES.every((x) => x.id === 'legend' || this.badges.has(x.id))) setTimeout(() => this.award('legend'), 1200);
    this.save();
    return true;
  }

  visit(view) {
    if (this.seen.has(view)) return;
    this.seen.add(view);
    this.add(10, `Found a new zone`);
  }

  scout(no, total) {
    if (this.scouted.has(no)) return;
    this.scouted.add(no);
    this.add(25, `Scouted #${no}`);
    if (this.scouted.size === 1) this.award('scout1');
    if (this.scouted.size >= total) this.award('fullsquad');
  }

  reset() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } location.reload(); }
}

// ------------------------------------------------------------ toasts
let stack;
export function toast({ kind = 'xp', icon = '', title, text }) {
  stack ||= document.getElementById('toasts');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.innerHTML = `${icon ? `<span class="t-icon">${icon}</span>` : ''}<div><b>${title}</b><small>${text}</small></div>`;
  stack.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 500); }, kind === 'xp' ? 1800 : 3600);
  while (stack.children.length > 4) stack.firstChild.remove();
}
