// The live match: articulated players who jog, press, sprint onto passes and
// kick; a rolling / lofted / bouncing ball; a rival XI, a referee, and the
// penalty shootout mini-game.
import * as THREE from 'three';
import gsap from 'gsap';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const BALL_R = 0.45;
const UP = new THREE.Vector3(0, 1, 0);
const tmp = new THREE.Vector3();

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const SKINS = ['#e9bf98', '#b97f55', '#8a5a3c', '#d9a77f', '#f1cfae', '#6e4630'];
const shared = {};
function geo(key, make) { return (shared[key] ||= make()); }

// An articulated footballer: 10 meshes, sharing geometry and one vertex-colour
// material wherever possible. Forward is +z in the figure's local space.
const vcMat = new THREE.MeshLambertMaterial({ vertexColors: true });
const cache = new Map();
const cached = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
function paint(g, hex) {
  const c = new THREE.Color(hex), a = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
const cap = (r, l, y, z = 0) => new THREE.CapsuleGeometry(r, l, 3, 8).translate(0, y, z);
const HAIRS = ['#1a120c', '#3a2616', '#0d0d0f', '#6b4a24'];

function makeFigure({ base, trim, number, shortsCol = '#f4f7fb', socksCol = base, skinCol, hairCol = HAIRS[0], gloves, gold }) {
  const shirt = cached(`shirt|${base}|${trim}|${number}`, () => new THREE.MeshLambertMaterial({
    map: canvasTex(128, 128, (x, w, h) => {
      x.fillStyle = base; x.fillRect(0, 0, w, h);
      x.fillStyle = trim; for (let i = 0; i < 6; i++) x.fillRect(i * 22 + 4, 0, 3, h);
      if (number != null) {
        x.fillStyle = '#ffffff'; x.font = '900 56px Archivo, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(number, w * 0.75, h * 0.5);
      }
    }),
    emissive: base, emissiveIntensity: 0,
  }));
  const thighG = cached(`thigh|${shortsCol}`, () => paint(cap(0.1, 0.24, -0.17), shortsCol));
  const shinG = cached(`shin|${socksCol}|${skinCol}`, () => mergeGeometries([
    paint(cap(0.075, 0.08, -0.02), skinCol),
    paint(cap(0.072, 0.3, -0.24), socksCol),
    paint(new THREE.BoxGeometry(0.11, 0.08, 0.27).translate(0, -0.47, 0.05), '#111'),
  ]));
  const upperG = cached(`upper|${base}`, () => paint(cap(0.065, 0.2, -0.13), base));
  const bandG = cached(`band|${base}`, () => mergeGeometries([paint(cap(0.065, 0.2, -0.13), base), paint(new THREE.CylinderGeometry(0.075, 0.075, 0.07, 8).translate(0, -0.1, 0), '#ffffff')]));
  const foreG = cached(`fore|${gloves || skinCol}`, () => paint(cap(0.055, 0.22, -0.14), gloves || skinCol));
  const coreG = cached(`core|${shortsCol}|${skinCol}|${hairCol}`, () => mergeGeometries([
    paint(new THREE.CylinderGeometry(0.2, 0.2, 0.18, 12), shortsCol),
    paint(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 8).translate(0, 0.71, 0), skinCol),
    paint(new THREE.SphereGeometry(0.13, 14, 10).translate(0, 0.87, 0), skinCol),
    paint(new THREE.SphereGeometry(0.135, 14, 6, 0, TAU, 0, Math.PI * 0.5).rotateX(-0.25).translate(0, 0.9, -0.01), hairCol),
  ]));
  const torsoG = geo('torso', () => new THREE.CylinderGeometry(0.21, 0.19, 0.6, 14));

  const add = (g, m, parent, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); parent.add(o); return o; };
  const root = new THREE.Group();          // world position + heading
  const body = new THREE.Group();          // lean / dive
  root.add(body);
  const pelvis = new THREE.Group(); pelvis.position.y = 0.95; body.add(pelvis);
  const legs = [-1, 1].map((s) => {
    const hip = new THREE.Group(); hip.position.set(0.11 * s, 0, 0); pelvis.add(hip);
    add(thighG, vcMat, hip);
    const knee = add(shinG, vcMat, hip, 0, -0.43, 0);
    return { hip, knee };
  });
  add(coreG, vcMat, pelvis);
  add(torsoG, shirt, pelvis, 0, 0.36, 0).scale.z = 0.72;
  const arms = [-1, 1].map((s, i) => {
    const sh = new THREE.Group(); sh.position.set(0.28 * s, 0.6, 0); pelvis.add(sh);
    add(gold && i === 0 ? bandG : upperG, vcMat, sh);
    const el = add(foreG, vcMat, sh, 0, -0.29, 0);
    sh.rotation.z = 0.12 * s;
    return { sh, el };
  });
  root.scale.setScalar(1.45);
  return { root, body, pelvis, legs, arms, shirt };
}

export class Match {
  constructor(stadium, squad) {
    this.st = stadium;
    this.ball = stadium.ball;
    this.agents = [];
    this.players = [];
    this.time = 0;

    // our XI (sky blue; the captain in gold; keeper in charcoal)
    squad.forEach((p, i) => {
      const gold = !!p.captain, keeper = p.pos === 'GK';
      const base = gold ? '#f3c75a' : keeper ? '#1d2230' : '#5cc3ff';
      const f = makeFigure({ base, trim: gold ? '#e3b23f' : keeper ? '#2a3142' : '#4fb2ee', number: p.no, socksCol: base, skinCol: SKINS[i % SKINS.length], hairCol: HAIRS[i % HAIRS.length], gloves: keeper ? '#d4ff3a' : null, gold });
      const a = this.addAgent(f, p.at, 'home', i);
      a.data = p;
      this.players.push(a);
    });

    // the rival XI and the referee (desktop only: they cost draw calls)
    if (!stadium.mobile) {
      squad.forEach((p, i) => {
        const keeper = p.pos === 'GK';
        const base = keeper ? '#39ff88' : '#c8102e';
        const f = makeFigure({ base, trim: keeper ? '#2bd86f' : '#a00d24', number: null, shortsCol: '#15171c', socksCol: keeper ? '#39ff88' : '#c8102e', skinCol: SKINS[(i + 3) % SKINS.length], gloves: keeper ? '#ffffff' : null });
        const a = this.addAgent(f, [-p.at[0] * 0.92, -p.at[1] * 0.9 + (i % 2 ? 2 : -2)], 'away', i);
        if (keeper) this.awayKeeper = a;
      });
      const rf = makeFigure({ base: '#101216', trim: '#f2d22e', shortsCol: '#101216', socksCol: '#101216', skinCol: SKINS[1] });
      this.ref = this.addAgent(rf, [-6, 14], 'ref', 0);
    }

    // soft ground shadows: one instanced draw instead of a shadow-map pass
    this.blobs = new THREE.InstancedMesh(
      new THREE.CircleGeometry(0.85, 14).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.34, depthWrite: false }),
      this.agents.length
    );
    this.blobs.frustumCulled = false;
    stadium.scene.add(this.blobs);
    this.blobM = new THREE.Matrix4();

    this.owner = null;      // agent with the ball at their feet
    this.juggler = null;    // active player doing keepy-uppies
    this.flight = null;     // ball in the air / rolling
    this.ballVel = new THREE.Vector3();
    this.giveBall(this.players[0]);
  }

  addAgent(f, at, team, idx) {
    const home = new THREE.Vector3(at[0], 0, at[1]);
    const a = {
      ...f, team, idx, home,
      pos: home.clone(), vel: new THREE.Vector3(), heading: team === 'away' ? -Math.PI / 2 : Math.PI / 2,
      phase: Math.random() * TAU, seed: Math.random() * 100, kick: -1, kickPow: 1, target: null, mode: 'play',
      hover: 0, active: 0,
    };
    f.root.position.copy(a.pos);
    this.st.scene.add(f.root);
    this.agents.push(a);
    return a;
  }

  // ------------------------------------------------------------ ball control
  footOf(a, side = 1) {
    const fwd = tmp.set(Math.sin(a.heading), 0, Math.cos(a.heading));
    return a.pos.clone().addScaledVector(fwd, 0.75).add(new THREE.Vector3(Math.cos(a.heading) * 0.15 * side, 0, -Math.sin(a.heading) * 0.15 * side));
  }

  giveBall(a) {
    this.cancelFlight();
    this.owner = a;
    const p = this.footOf(a);
    this.ball.position.set(p.x, BALL_R, p.z);
  }

  placeBall(x, z) {
    this.cancelFlight();
    this.owner = null; this.juggler = null;
    this.ball.position.set(x, BALL_R, z);
  }

  cancelFlight() { if (this.flight) { this.flight.kill(); this.flight = null; } }

  setActive(i) {
    this.players.forEach((p, k) => { p.activeTarget = k === i ? 1 : 0; });
    this.juggler = i >= 0 ? this.players[i] : null;
  }

  // Kick the ball from the current owner to player i: ground pass or lofted ball.
  passTo(i) {
    const to = this.players[i];
    const from = this.owner || this.nearest(this.ball.position, this.players);
    if (from === to) { this.giveBall(to); return Promise.resolve(); }
    this.juggler = null;
    // receiver steps toward the ball to meet it
    const dir = from.pos.clone().sub(to.home).setY(0).normalize();
    const meet = to.home.clone().addScaledVector(dir, 1.6);
    to.target = meet; to.urgent = true;
    from.heading = Math.atan2(meet.x - from.pos.x, meet.z - from.pos.z);
    this.kickAnim(from, 1);
    return new Promise((res) => {
      setTimeout(() => {
        this.owner = null;
        const start = this.ball.position.clone();
        const end = meet.clone().addScaledVector(dir, 0.6); end.y = BALL_R;
        this.launch(start, end, { lofted: start.distanceTo(end) > 26 }).then(() => {
          to.target = null; to.urgent = false;
          this.giveBall(to);
          this.juggler = to.activeTarget ? to : null;
          res();
        });
      }, 230);
    });
  }

  // Physical-looking ball path. Ground pass decelerates; a lofted ball arcs and bounces.
  launch(start, end, { lofted = false, duration, height } = {}) {
    this.cancelFlight();
    const dist = start.distanceTo(end);
    const dur = duration ?? (lofted ? 0.9 + dist / 32 : 0.45 + dist / 20);
    const h = height ?? (lofted ? Math.min(14, dist * 0.17) : 0);
    const flat = end.clone().sub(start).setY(0);
    const axis = new THREE.Vector3().crossVectors(UP, flat).normalize();
    const s = { t: 0 };
    let last = start.clone();
    this.st.audio?.kick?.();
    return new Promise((res) => {
      this.flight = gsap.to(s, {
        t: 1, duration: dur, ease: 'none',
        onUpdate: () => {
          const t = s.t;
          let k, y;
          if (lofted) {
            // 0..0.8 flight, then two shrinking bounces while still travelling
            k = t < 0.8 ? t / 0.8 * 0.86 : 0.86 + (t - 0.8) / 0.2 * 0.14;
            if (t < 0.8) y = Math.sin((t / 0.8) * Math.PI) * h;
            else if (t < 0.92) y = Math.sin(((t - 0.8) / 0.12) * Math.PI) * h * 0.14;
            else y = Math.sin(((t - 0.92) / 0.08) * Math.PI) * h * 0.04;
          } else {
            k = 1 - (1 - t) * (1 - t); // decelerating roll
            y = 0;
          }
          const p = start.clone().lerp(end, k);
          p.y = BALL_R + y;
          const moved = p.distanceTo(last);
          this.ball.rotateOnWorldAxis(axis, moved / BALL_R);
          this.ball.position.copy(p);
          last = p;
        },
        onComplete: () => { this.flight = null; res(); },
      });
    });
  }

  kickAnim(a, pow = 1) { a.kick = 0; a.kickPow = pow; }

  nearest(p, list) {
    let best = null, d = Infinity;
    for (const a of list) { const k = a.pos.distanceToSquared(p); if (k < d) { d = k; best = a; } }
    return best;
  }

  // Tour finale: the striker smashes it into the top corner.
  shootGoal() {
    const striker = this.players[this.players.length - 1];
    if (this.owner !== striker) this.giveBall(striker);
    this.juggler = null;
    striker.heading = Math.atan2(52.5 - striker.pos.x, 2.4 - striker.pos.z);
    this.kickAnim(striker, 1.4);
    if (this.awayKeeper) this.dive(this.awayKeeper, -1.6, 0.25);
    return new Promise((res) => setTimeout(() => {
      this.owner = null;
      const end = new THREE.Vector3(53.4, 2.0, 2.6);
      this.launch(this.ball.position.clone(), end, { duration: 0.42, height: 1.1, lofted: false }).then(() => {
        this.ball.position.copy(end);
        res(end);
        gsap.to(this.ball.position, { y: BALL_R, x: 53.2, duration: 0.8, ease: 'bounce.out' });
      });
    }, 220));
  }

  // ------------------------------------------------------------ penalties
  penaltySetup() {
    this.mode = 'penalty';
    const taker = this.players[this.players.length - 1];
    this.taker = taker;
    this.placeBall(41.5, 0);
    taker.mode = 'scripted'; taker.target = new THREE.Vector3(38.6, 0, -1.1); taker.urgent = false;
    if (this.awayKeeper) {
      const k = this.awayKeeper;
      k.mode = 'scripted'; k.target = new THREE.Vector3(52.0, 0, 0); k.faceX = -1;
      gsap.killTweensOf(k.body.rotation); gsap.killTweensOf(k.body.position);
      k.body.rotation.set(0, 0, 0); k.body.position.set(0, 0, 0);
    }
  }

  penaltyEnd() {
    this.mode = null;
    for (const a of this.agents) { if (a.mode === 'scripted') { a.mode = 'play'; a.target = null; a.faceX = 0; } }
    if (this.awayKeeper) { this.awayKeeper.body.rotation.set(0, 0, 0); this.awayKeeper.body.position.set(0, 0, 0); }
  }

  dive(k, z, delay = 0.12) {
    const side = Math.sign(z) || 0;
    const reach = Math.min(Math.abs(z), 2.8) * side;
    gsap.killTweensOf(k.body.rotation); gsap.killTweensOf(k.body.position);
    const tl = gsap.timeline({ delay });
    if (side) {
      // keeper faces -x, so body-local +x is world +z
      tl.to(k.body.rotation, { z: -1.25 * side, duration: 0.35, ease: 'power2.out' }, 0)
        .to(k.body.position, { x: reach / 1.45, y: 0.35, duration: 0.35, ease: 'power2.out' }, 0)
        .to(k.body.position, { y: 0.05, duration: 0.25, ease: 'power2.in' }, 0.35);
    } else {
      tl.to(k.body.position, { y: 0.45, duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.out' });
    }
    return reach;
  }

  // aim: Vector3 on the goal plane. Resolves 'goal' | 'saved' | 'miss'.
  penaltyKick(aim) {
    const taker = this.taker, k = this.awayKeeper;
    return new Promise((res) => {
      taker.target = new THREE.Vector3(40.9, 0, -0.35); taker.urgent = true;
      setTimeout(() => {
        taker.heading = Math.atan2(aim.x - taker.pos.x, aim.z - taker.pos.z);
        this.kickAnim(taker, 1.4);
        // keeper guesses: reads the shot 40% of the time
        const guess = Math.random() < 0.4 ? aim.z : [-2.4, 0, 2.4][(Math.random() * 3) | 0];
        const reach = k ? this.dive(k, guess, 0.1) : 99;
        setTimeout(() => {
          const wide = Math.abs(aim.z) > 3.6 || aim.y > 2.4;
          const saved = !wide && k && Math.abs(aim.z - reach) < (reach ? 1.25 : 0.9) && aim.y < (reach ? 1.9 : 2.1);
          const end = wide ? aim.clone().setX(58) : saved ? new THREE.Vector3(52.0, aim.y, aim.z) : aim.clone().setX(53.3);
          this.launch(this.ball.position.clone(), end, { duration: wide ? 0.6 : 0.4, height: 0.3 }).then(() => {
            if (saved) {
              this.launch(this.ball.position.clone(), new THREE.Vector3(46 + Math.random() * 2, BALL_R, aim.z + (Math.random() - 0.5) * 8), { lofted: true, duration: 0.9, height: 2.5 });
              res('saved');
            } else if (wide) {
              this.ball.position.y = BALL_R; res('miss');
            } else {
              gsap.to(this.ball.position, { y: BALL_R, duration: 0.5, ease: 'bounce.out' });
              res('goal');
            }
          });
        }, 200);
      }, 520);
    });
  }

  penaltyReset() {
    this.placeBall(41.5, 0);
    this.taker.target = new THREE.Vector3(38.6, 0, -1.1); this.taker.urgent = false;
    if (this.awayKeeper) {
      const k = this.awayKeeper;
      gsap.to(k.body.rotation, { z: 0, duration: 0.4 });
      gsap.to(k.body.position, { x: 0, y: 0, z: 0, duration: 0.4 });
    }
  }

  // ------------------------------------------------------------ frame
  update(dt) {
    this.time += dt;
    const t = this.time;
    const ball = this.ball.position;

    let n = 0;
    for (const a of this.agents) {
      // where do I want to be?
      let goal;
      if (a.target) goal = a.target;
      else if (a.team === 'ref') goal = tmp.set(THREE.MathUtils.clamp(ball.x - 7, -45, 45), 0, THREE.MathUtils.clamp(ball.z + 11, -30, 30)).clone();
      else {
        const wander = a.activeTarget ? 0.25 : 2.2;
        goal = a.home.clone().add(new THREE.Vector3(Math.sin(t * 0.23 + a.seed) * wander, 0, Math.cos(t * 0.19 + a.seed * 1.7) * wander));
        if (a.team === 'away') goal.addScaledVector(ball.clone().sub(a.home).setY(0), 0.14); // press the ball
      }
      const to = goal.clone().sub(a.pos).setY(0);
      const dist = to.length();
      const vmax = a.urgent ? 7.5 : a.mode === 'scripted' ? 3.2 : 2.4;
      const want = dist > 0.05 ? to.multiplyScalar(Math.min(vmax, dist * 1.4) / dist) : to.set(0, 0, 0);
      a.vel.lerp(want, Math.min(1, dt * (a.urgent ? 6 : 2.5)));
      a.pos.addScaledVector(a.vel, dt);
      const speed = a.vel.length();

      // heading: run direction when moving, otherwise watch the ball
      let face;
      if (a.faceX) face = a.faceX > 0 ? Math.PI / 2 : -Math.PI / 2;
      else if (speed > 0.5 && a.kick < 0) face = Math.atan2(a.vel.x, a.vel.z);
      else face = Math.atan2(ball.x - a.pos.x, ball.z - a.pos.z);
      if (a.kick < 0 || a.kick > 0.6) {
        let d = face - a.heading; d = Math.atan2(Math.sin(d), Math.cos(d));
        a.heading += d * Math.min(1, dt * 5);
      }

      // gait
      const amp = Math.min(speed / 6.5, 1) * 0.95 + (speed > 0.25 ? 0.12 : 0);
      a.phase += dt * (2.2 + speed * 1.55);
      const ph = a.phase;
      a.legs[0].hip.rotation.x = Math.sin(ph) * amp;
      a.legs[1].hip.rotation.x = -Math.sin(ph) * amp;
      a.legs[0].knee.rotation.x = Math.max(0, Math.sin(ph + 1.6)) * amp * 1.6 + 0.05;
      a.legs[1].knee.rotation.x = Math.max(0, -Math.sin(ph + 1.6)) * amp * 1.6 + 0.05;
      a.arms[0].sh.rotation.x = -Math.sin(ph) * amp * 0.9;
      a.arms[1].sh.rotation.x = Math.sin(ph) * amp * 0.9;
      a.arms[0].el.rotation.x = a.arms[1].el.rotation.x = -0.35 - amp * 0.7;
      a.pelvis.position.y = 0.95 + Math.abs(Math.sin(ph)) * 0.05 * amp + Math.sin(t * 2 + a.seed) * 0.006;
      a.pelvis.rotation.x = amp * 0.18;
      a.pelvis.rotation.y = Math.sin(ph) * amp * 0.12;

      // keeper ready stance during penalties
      if (a === this.awayKeeper && this.mode === 'penalty') {
        a.legs[0].knee.rotation.x = a.legs[1].knee.rotation.x = 0.7;
        a.legs[0].hip.rotation.x = a.legs[1].hip.rotation.x = -0.45;
        a.pelvis.position.y = 0.82; a.pelvis.rotation.x = 0.35;
        a.arms[0].sh.rotation.x = a.arms[1].sh.rotation.x = -0.6;
        a.legs[0].hip.position.x = -0.18; a.legs[1].hip.position.x = 0.18;
      }

      // kick: right leg back-swing then strike
      if (a.kick >= 0) {
        a.kick += dt * 2.6;
        const k = a.kick;
        const hip = a.legs[1].hip, knee = a.legs[1].knee;
        if (k < 0.35) { hip.rotation.x = (k / 0.35) * 0.75; knee.rotation.x = (k / 0.35) * 1.4; }
        else if (k < 0.65) { const q = (k - 0.35) / 0.3; hip.rotation.x = 0.75 - q * (0.75 + 1.1 * a.kickPow); knee.rotation.x = 1.4 * (1 - q); }
        else { const q = Math.min(1, (k - 0.65) / 0.35); hip.rotation.x = -1.1 * a.kickPow * (1 - q); knee.rotation.x = 0.1; }
        a.arms[0].sh.rotation.x = -0.9; a.arms[0].sh.rotation.z = -0.6;
        if (k >= 1) { a.kick = -1; a.arms[0].sh.rotation.z = -0.12; }
      }

      a.root.position.copy(a.pos);
      a.root.rotation.y = a.heading;
      this.blobs.setMatrixAt(n++, this.blobM.makeTranslation(a.pos.x, 0.03, a.pos.z));

      // selection highlight
      if (a.team === 'home') {
        const act = a.activeTarget || 0, hov = this.hover === a ? 1 : 0;
        a.active += (act - a.active) * Math.min(1, dt * 5);
        a.hover += (hov - a.hover) * Math.min(1, dt * 8);
        a.shirt.emissiveIntensity = a.active * 0.22 + a.hover * 0.25;
      }
    }

    this.blobs.instanceMatrix.needsUpdate = true;

    // ball at feet: dribble touches, or keepy-uppies for the active player
    if (!this.flight) {
      if (this.juggler && this.mode !== 'penalty') {
        const j = this.juggler;
        const foot = this.footOf(j, 1);
        const beat = (t * 1.35) % 1;
        const h = Math.sin(beat * Math.PI) * 1.25;
        if (beat < 0.08 && !j._touched) { j._touched = true; j.kick = 0.45; j.kickPow = 0.25; }
        if (beat > 0.5) j._touched = false;
        this.ball.position.set(foot.x, BALL_R + 0.25 + h, foot.z);
        this.ball.rotation.x -= dt * 6;
      } else if (this.owner) {
        const foot = this.footOf(this.owner, 1);
        const prev = this.ball.position.clone();
        this.ball.position.lerp(new THREE.Vector3(foot.x, BALL_R, foot.z), Math.min(1, dt * 8));
        const mv = this.ball.position.clone().sub(prev);
        if (mv.lengthSq() > 1e-6) this.ball.rotateOnWorldAxis(new THREE.Vector3().crossVectors(UP, mv).normalize(), mv.length() / BALL_R);
      }
    }
  }
}
