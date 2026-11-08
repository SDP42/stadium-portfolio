// A night-match digital twin of an Etihad-style football stadium: spiral ramp
// towers, cable-stayed masts, a saddle roof and a sky-blue three-tier bowl,
// plus everything the portfolio needs to fly between.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Match } from './match.js';
import gsap from 'gsap';

const TAU = Math.PI * 2;
const LIME = new THREE.Color('#d4ff3a');

// Superellipse point at angle t: the plan shape of the bowl, roof and shell.
function se(t, A, B, n) {
  const c = Math.cos(t), s = Math.sin(t);
  const r = Math.pow(Math.pow(Math.abs(c) / A, n) + Math.pow(Math.abs(s) / B, n), -1 / n);
  return [r * c, r * s];
}

// Grid surface: fn(u, v) → [x, y, z], u wraps around the stadium.
function surface(U, V, fn) {
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= V; j++) {
    for (let i = 0; i <= U; i++) {
      pos.push(...fn(i / U, j / V));
      uv.push(i / U, j / V);
    }
  }
  for (let j = 0; j < V; j++) {
    for (let i = 0; i < U; i++) {
      const a = j * (U + 1) + i, b = a + 1, c = a + U + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Stand profile: (offset from the front row, height). Three tiers with concourse bands.
const BOWL = { A: 66, B: 47, n: 4 };
const STAND = [[0, 0], [0, 1.4], [17, 12.5], [17, 16], [19, 16.5], [29, 25], [29, 29], [31, 29.5], [44, 44]];
const TIERS = [[1, 2], [4, 5], [7, 8]]; // seating segments of STAND
const ROOF_OPEN = { A: 72, B: 53, n: 4 };
const SHELL = { A: 120, B: 101, n: 4 };
// saddle roof: lower at the ends, higher along the sides
const roofOutY = (t) => 45.5 + 6.5 * Math.abs(Math.sin(t)) ** 3;
const roofInY = (t) => 47.5 + 3.5 * Math.abs(Math.sin(t)) ** 3;

export class Stadium {
  constructor(canvas, { mobile = false } = {}) {
    this.mobile = mobile;
    this.clock = new THREE.Clock();
    this.time = 0;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1 : 1.25));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x05080d, 0.0011);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.3, 4000);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    this.uniforms = {
      uTime: { value: 0 },
      uLights: { value: 0 },   // 0 → 1 floodlight warm-up
      uWave: { value: 0 },     // Mexican wave head (0..1 around the bowl)
      uHype: { value: 0 },     // crowd excitement
      uDay: { value: 0 },      // 0 night → 1 day
      uDusk: { value: 0 },     // golden-hour tint
      uRain: { value: 0 },     // weather
      uCam: { value: new THREE.Vector3() },
    };
    this.shellColor = { a: new THREE.Color('#62c8ff'), b: new THREE.Color('#62c8ff'), chase: 0, power: 0 };

    this.anchors = {};
    this.players = [];
    this.netLines = null;

    this.buildSky();
    this.buildGround();
    this.buildPitch();
    this.buildBowl();
    this.buildShell();
    this.buildLights();
    this.buildFixtures();
    this.buildBall();
    this.buildTrophy();
    this.buildScreen();
    this.buildConfetti();
    this.buildFireworks();
    this.buildRain();
    this.buildPost();

    // Camera rig state: base pose + transient effects
    this.rig = {
      pos: new THREE.Vector3(260, 140, 360),
      target: new THREE.Vector3(0, 20, 0),
      fov: 42,
      drift: 1,          // idle breathing amount
      orbit: 0,          // auto-orbit speed (rad/s) around target
      yaw: 0, yawTarget: 0, pitch: 0, pitchTarget: 0,
      shake: 0,
    };
    this.mouse = new THREE.Vector2();
    this.mouseEase = new THREE.Vector2();
    this.prevCam = new THREE.Vector3();
    this.speed = 0;
    this.raycaster = new THREE.Raycaster();

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  // ---------------------------------------------------------------- world
  buildSky() {
    this.sunDir = new THREE.Vector3(0.55, 0.62, 0.35).normalize();
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(2500, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: { ...this.uniforms, uSun: { value: this.sunDir } },
        vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
        fragmentShader: `varying vec3 vP; uniform float uLights, uDay, uTime, uDusk, uRain; uniform vec3 uSun;
          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
          float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
            return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
          void main(){ vec3 d = normalize(vP); float h = d.y;
            // night
            vec3 nTop = vec3(0.012,0.016,0.035);
            vec3 nHor = mix(vec3(0.04,0.05,0.09), vec3(0.07,0.1,0.16), uLights);
            vec3 night = mix(nHor, nTop, smoothstep(-0.02, 0.35, h)) + vec3(0.1,0.25,0.4) * exp(-abs(h)*28.) * 0.3 * uLights;
            // day: sky blue gradient, warm horizon, sun disc and drifting clouds
            vec3 dTop = vec3(0.1,0.33,0.75), dHor = vec3(0.6,0.76,0.92);
            vec3 day = mix(dHor, dTop, pow(smoothstep(-0.05, 0.6, h), 0.7));
            float sd = max(dot(d, uSun), 0.);
            day += vec3(1., .9, .7) * (pow(sd, 900.) * 6. + pow(sd, 12.) * .25);
            vec2 cp = d.xz / max(h, .05) * 1.2 + uTime * .01;
            float cl = smoothstep(.55, .85, noise(cp) * .65 + noise(cp * 2.3) * .35) * smoothstep(.02, .25, h);
            day = mix(day, vec3(1.), cl * .75);
            vec3 c = mix(night, day, uDay);
            // golden hour: purple zenith, burning horizon, low sun
            vec3 duskC = mix(vec3(1., .52, .26), vec3(.16, .14, .34), pow(smoothstep(-0.04, 0.55, h), .6));
            duskC += vec3(1., .6, .3) * (pow(sd, 400.) * 5. + pow(sd, 6.) * .45);
            duskC = mix(duskC, vec3(1., .7, .55), cl * .45);
            c = mix(c, duskC, uDusk);
            // rain: low grey overcast
            vec3 overcast = mix(vec3(.05,.055,.065), vec3(.42,.45,.5), max(uDay, uDusk * .6)) * (.8 + .2 * smoothstep(-.1, .5, h));
            c = mix(c, overcast, uRain * .85);
            gl_FragColor = vec4(c,1.); }`,
      })
    );
    this.scene.add(sky);

    // stars (fade out by day)
    const n = this.mobile ? 900 : 1600;
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection();
      v.y = Math.abs(v.y) * 0.9 + 0.08;
      v.normalize().multiplyScalar(2000);
      p.set([v.x, v.y, v.z], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.stars = new THREE.Points(g, new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, color: 0xdde6ff, fog: false, transparent: true, opacity: 0.85 }));
    this.scene.add(this.stars);
  }

  buildGround() {
    const g = new THREE.Mesh(
      new THREE.CircleGeometry(1800, 96),
      new THREE.ShaderMaterial({
        uniforms: this.uniforms, fog: false,
        vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
        fragmentShader: `varying vec3 vW; uniform float uLights, uDay, uRain;
          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
          float cp(vec2 p, vec2 c, vec2 h){ vec2 q = abs(p - c) - h; return step(max(q.x, q.y), 0.); }
          void main(){
            vec2 p = vW.xz; float d = length(p / vec2(1.12, 1.));
            // zones: esplanade paving, lawns, ring road, city
            float plaza = 1. - smoothstep(205., 215., d);
            float road = smoothstep(296., 300., d) * (1. - smoothstep(318., 322., d));
            // the long approach path from the south-east
            vec2 dir = normalize(vec2(.62, .78));
            float along = dot(p, dir), across = abs(dot(p, vec2(-dir.y, dir.x)) + sin(along * .02) * 18.);
            float path = step(150., along) * step(along, 700.) * (1. - smoothstep(9., 11., across));
            float paved = max(plaza, path);
            // tiles
            vec2 tg = abs(fract(p / 3.) - .5);
            float tile = smoothstep(.47, .5, max(tg.x, tg.y));
            vec3 dayPave = vec3(.47, .49, .52) - tile * .06 + (hash(floor(p / 3.)) - .5) * .03;
            vec3 dayGrass = vec3(.22, .38, .17) + (hash(floor(p / 4.)) - .5) * .04;
            vec3 dayRoad = vec3(.18, .19, .21) + step(.96, fract(atan(p.y, p.x) * 60.)) * step(abs(d - 309.), .4) * .5;
            vec3 dayC = mix(mix(dayGrass, dayPave, paved), dayRoad, road);
            float lot = max(cp(p, vec2(195., 170.), vec2(60., 32.)), max(cp(p, vec2(-205., -140.), vec2(55., 34.)), cp(p, vec2(215., -150.), vec2(48., 30.))));
            float bay = step(fract(p.x / 2.8), .05) * step(fract(p.y / 14.), .72);
            dayC = mix(dayC, vec3(.17, .18, .2) + bay * .55, lot);
            dayC *= mix(.55, 1., smoothstep(1700., 600., d));
            // night: dark, with lamp pools on the paving and blue spill from the shell
            vec3 nightC = mix(vec3(.012,.02,.012), vec3(.03,.032,.04) - tile * .01, paved);
            nightC = mix(nightC, vec3(.018,.02,.024) + bay * .03, lot);
            nightC = mix(nightC, vec3(.02,.02,.025), road);
            vec2 lp = fract(p / 26.) - .5;
            nightC += vec3(1., .78, .45) * exp(-dot(lp, lp) * 40.) * .12 * paved;
            nightC += vec3(.12,.38,.6) * exp(-max(d-120.,0.)/40.) * .35 * uLights;
            nightC *= 1. - smoothstep(600., 1700., d);
            vec3 gc = mix(nightC, dayC, uDay);
            gc *= 1. - uRain * .35;
            gl_FragColor = vec4(gc, 1.);
          }`,
      })
    );
    g.rotation.x = -Math.PI / 2;
    g.position.y = -0.05;
    this.scene.add(g);
    this.buildSurroundings();
  }

  // Trees, street lamps, fans walking in, traffic, and a city skyline.
  buildSurroundings() {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
    const rnd = (a, b) => a + Math.random() * (b - a);
    const inPlaza = (x, z) => Math.hypot(x / 1.12, z) < 215;
    const onPath = (x, z) => { const al = x * 0.62 + z * 0.78, ac = Math.abs(-x * 0.78 + z * 0.62 + Math.sin(al * 0.02) * 18); return al > 140 && al < 710 && ac < 14; };
    const onRoad = (x, z) => { const d = Math.hypot(x / 1.12, z); return d > 292 && d < 326; };

    // trees: trunk + two-lobe crown
    const N = this.mobile ? 120 : 240;
    const nearAcademy = (x, z, r) => Math.hypot(x + 330, z + 290) < r;
    const trunkG = new THREE.CylinderGeometry(0.35, 0.5, 4, 6); trunkG.translate(0, 2, 0);
    const crownG = mergeGeometries([new THREE.IcosahedronGeometry(3.2, 0).translate(0, 6.2, 0), new THREE.IcosahedronGeometry(2.4, 0).translate(0.8, 8.3, 0.3)]);
    const trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshLambertMaterial({ color: '#3b2a1e' }), N);
    const crowns = new THREE.InstancedMesh(crownG, new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), N);
    let k = 0;
    for (let tries = 0; k < N && tries < N * 20; tries++) {
      const a = Math.random() * TAU, r = rnd(222, 520);
      const x = Math.cos(a) * r * 1.12, z = Math.sin(a) * r;
      if (onPath(x, z) || onRoad(x, z) || nearAcademy(x, z, 120)) continue;
      const sc = rnd(1.2, 2);
      m4.compose(v.set(x, 0, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * TAU), s.set(sc, sc, sc));
      trunks.setMatrixAt(k, m4); crowns.setMatrixAt(k, m4);
      crowns.setColorAt(k, new THREE.Color().setHSL(0.27 + Math.random() * 0.06, 0.45, 0.22 + Math.random() * 0.1));
      k++;
    }
    trunks.count = crowns.count = k;
    this.scene.add(trunks, crowns);

    // street lamps along the approach path and round the plaza
    const lamps = [];
    for (let al = 160; al < 700; al += 46) for (const side of [-1, 1]) {
      const px = 0.62 * al, pz = 0.78 * al, off = -Math.sin(al * 0.02) * 18 + side * 12;
      lamps.push([px - 0.78 * off, pz + 0.62 * off]);
    }
    for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; lamps.push([Math.cos(a) * 212 * 1.12, Math.sin(a) * 212]); }
    const poleG = new THREE.CylinderGeometry(0.12, 0.16, 7, 6); poleG.translate(0, 3.5, 0);
    const poles = new THREE.InstancedMesh(poleG, new THREE.MeshLambertMaterial({ color: '#2b3038' }), lamps.length);
    const heads = new Float32Array(lamps.length * 3);
    lamps.forEach(([x, z], i) => { poles.setMatrixAt(i, m4.makeTranslation(x, 0, z)); heads.set([x, 7.1, z], i * 3); });
    this.scene.add(poles);
    const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(heads, 3));
    this.lampHeads = new THREE.Points(hg, new THREE.ShaderMaterial({
      uniforms: this.uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uDay; varying float vA; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mv; gl_PointSize = min(40., 900. / -mv.z); vA = 1. - uDay; }`,
      fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = (exp(-d*14.) + exp(-d*5.)*.25) * vA; gl_FragColor = vec4(vec3(1., .82, .55) * a * 2., 1.); }`,
    }));
    this.scene.add(this.lampHeads);

    // fans walking in along the path and across the plaza (animated on the GPU)
    const F = this.mobile ? 200 : 500;
    const fanBody = mergeGeometries([new THREE.CylinderGeometry(0.22, 0.2, 1.1, 6).translate(0, 0.95, 0).toNonIndexed(), new THREE.SphereGeometry(0.13, 6, 4).translate(0, 1.65, 0).toNonIndexed()]);
    const fans = new THREE.InstancedMesh(fanBody, null, F);
    const route = new Float32Array(F * 4);
    const fcol = ['#62c8ff', '#ffffff', '#1c3a6b', '#62c8ff', '#2b2f38', '#d9e6f2'];
    for (let i = 0; i < F; i++) {
      fans.setMatrixAt(i, m4.identity());
      fans.setColorAt(i, new THREE.Color(fcol[i % fcol.length]));
      // x: 0 path walker / 1 plaza walker, y: start offset, z: lateral offset, w: speed
      route.set([Math.random() < 0.55 ? 0 : 1, Math.random(), (Math.random() - 0.5) * 16, rnd(0.8, 1.5)], i * 4);
    }
    fanBody.setAttribute('route', new THREE.InstancedBufferAttribute(route, 4));
    fans.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `attribute vec4 route; uniform float uTime, uDay, uLights; varying vec3 vC;
        void main(){
          float t = fract(route.y + uTime * route.w * .004);
          vec3 base;
          vec2 fwd;
          if (route.x < .5) {               // walk the approach path toward the stadium
            float al = mix(690., 175., t);
            float off = -sin(al * .02) * 18. + route.z * .6;
            base = vec3(.62 * al - .78 * off, 0., .78 * al + .62 * off);
            fwd = -vec2(.62, .78);
          } else {                          // stroll round the esplanade
            float a = route.y * 6.2832 + t * 6.2832 * sign(route.z) * .25;
            float r = 168. + abs(route.z) * 3.;
            base = vec3(cos(a) * r * 1.12, 0., sin(a) * r);
            fwd = normalize(vec2(-sin(a), cos(a)));
          }
          vec3 p = position;
          p.y += abs(sin(uTime * 8. * route.w + route.y * 50.)) * .06;
          float ang = atan(fwd.x, fwd.y);
          p.xz = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * p.xz;
          vec4 w = vec4(base + p * 1.5, 1.);
          gl_Position = projectionMatrix * viewMatrix * w;
          vC = instanceColor * (0.18 + .82 * max(uDay, uLights * .5)) * (.6 + .4 * normal.y);
        }`,
      fragmentShader: `varying vec3 vC; void main(){ gl_FragColor = vec4(vC, 1.); }`,
    });
    fans.frustumCulled = false;
    this.scene.add(fans);

    // traffic on the ring road: headlights one way, tail-lights the other
    const C = this.mobile ? 60 : 140;
    const cp = new Float32Array(C * 3), ca = new Float32Array(C * 2);
    for (let i = 0; i < C; i++) ca.set([Math.random(), i % 2], i * 2);
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.BufferAttribute(cp, 3));
    cg.setAttribute('lane', new THREE.BufferAttribute(ca, 2));
    const cars = new THREE.Points(cg, new THREE.ShaderMaterial({
      uniforms: this.uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec2 lane; uniform float uTime, uDay; varying vec3 vC;
        void main(){ float dirn = lane.y > .5 ? 1. : -1.;
          float a = (lane.x + uTime * .006 * dirn) * 6.2832; float r = 304. + lane.y * 10.;
          vec4 mv = modelViewMatrix * vec4(cos(a) * r * 1.12, 1., sin(a) * r, 1.);
          gl_Position = projectionMatrix * mv; gl_PointSize = 700. / -mv.z;
          vC = (lane.y > .5 ? vec3(1., .95, .8) : vec3(1., .15, .1)) * (1. - uDay * .85); }`,
      fragmentShader: `varying vec3 vC; void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(vC * exp(-d * 9.) * 2., 1.); }`,
    }));
    cars.frustumCulled = false;
    this.scene.add(cars);

    // east-Manchester low-rise: brick terraces and a few blocks, lit windows at night
    const B = this.mobile ? 160 : 380;
    const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
    const city = new THREE.InstancedMesh(box, null, B);
    const bseed = new Float32Array(B);
    for (let i = 0; i < B; i++) {
      let a, r, x, z;
      do { a = Math.random() * TAU; r = rnd(440, 1500); x = Math.cos(a) * r; z = Math.sin(a) * r; } while (nearAcademy(x, z, 130) || onPath(x, z));
      const tall = Math.random() < 0.05;
      const w = rnd(10, 26), d = rnd(9, 20), h = tall ? rnd(32, 62) : rnd(7, 15);
      m4.compose(v.set(x, 0, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random()), s.set(w, h, d));
      city.setMatrixAt(i, m4);
      bseed[i] = Math.random();
    }
    box.setAttribute('bseed', new THREE.InstancedBufferAttribute(bseed, 1));
    city.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `attribute float bseed; varying vec3 vL; varying vec3 vN; varying float vS;
        void main(){ vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.); vL = w.xyz;
          vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); vS = bseed; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `varying vec3 vL; varying vec3 vN; varying float vS; uniform float uDay;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        void main(){
          vec2 f = abs(vN.x) > .5 ? vL.zy : vL.xy;
          vec2 cell = floor(f / vec2(3.4, 3.2)), g = fract(f / vec2(3.4, 3.2));
          float roof = step(.9, vN.y);
          float win = step(.28, g.x) * step(g.x, .72) * step(.3, g.y) * step(g.y, .75) * (1. - roof);
          float lit = step(.62, hash(cell + vS * 13.));
          vec3 night = vec3(.02, .025, .035) + win * lit * vec3(1., .78, .45) * .8;
          float shade = .55 + .45 * max(dot(vN, normalize(vec3(.55, .62, .35))), 0.);
          vec3 brick = mix(vec3(.42, .22, .16), vec3(.55, .5, .46), step(.65, vS));
          vec3 day = mix(mix(brick, vec3(.2, .24, .3), win * .8), vec3(.34, .33, .34), roof) * shade;
          vec3 c = mix(night, day, uDay);
          c = mix(c, mix(vec3(.04,.05,.09), vec3(.62,.76,.9), uDay), smoothstep(450., 1500., length(vL.xz)) * .75);
          gl_FragColor = vec4(c, 1.);
        }`,
    });
    this.scene.add(city);

    // parked cars in the marked bays
    const lots = [[195, 170, 60, 32], [-205, -140, 55, 34], [215, -150, 48, 30]];
    const carG = mergeGeometries([new THREE.BoxGeometry(1.8, 0.7, 4.2).translate(0, 0.55, 0), new THREE.BoxGeometry(1.55, 0.55, 2.1).translate(0, 1.15, -0.2)]);
    const CARS = this.mobile ? 90 : 240;
    const cars2 = new THREE.InstancedMesh(carG, new THREE.MeshLambertMaterial({ color: '#ffffff' }), CARS);
    const paints = ['#e8eaee', '#1a1c22', '#9aa2ad', '#b3202a', '#27406e', '#e8eaee', '#5c636d'];
    for (let i = 0; i < CARS; i++) {
      const [cx, cz, hw, hh] = lots[i % lots.length];
      const x = Math.floor(rnd(cx - hw, cx + hw) / 2.8) * 2.8 + 1.4;
      const z = Math.floor(rnd(cz - hh, cz + hh - 10) / 14) * 14 + (Math.random() < 0.5 ? 2.6 : 7.6);
      cars2.setMatrixAt(i, m4.makeTranslation(x, 0, z));
      cars2.setColorAt(i, new THREE.Color(paints[i % paints.length]));
    }
    cars2.frustumCulled = false;
    this.scene.add(cars2);

    // the academy stadium with its blue running track, and the teal-roofed halls
    const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
    const ac = new THREE.Group(); ac.position.set(-330, 0, -290);
    const track = new THREE.Mesh(new THREE.CircleGeometry(1, 36).rotateX(-Math.PI / 2).scale(62, 1, 42), lam('#2c4f9e')); track.position.y = 0.06;
    const field = new THREE.Mesh(new THREE.PlaneGeometry(66, 42).rotateX(-Math.PI / 2), lam('#2f8a3a')); field.position.y = 0.12;
    ac.add(track, field);
    for (const side of [0, Math.PI]) {
      ac.add(new THREE.Mesh(surface(20, 1, (u, w) => { const a = side + Math.PI / 2 + (u - .5) * 1.9; return [Math.cos(a) * (64 + w * 12), w * 10, Math.sin(a) * (44 + w * 12)]; }), lam('#e6e8ea', { side: THREE.DoubleSide })));
    }
    this.scene.add(ac);
    for (const [x, z, w, h, d, roof] of [[-70, -390, 120, 15, 60, '#6e7276'], [70, -392, 95, 13, 58, '#74c2b4']]) {
      const hall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), lam('#7c8087')); hall.position.set(x, 0, z);
      const top = new THREE.Mesh(new THREE.BoxGeometry(w + 2, 1.2, d + 2), lam(roof)); top.position.set(x, h + .6, z);
      this.scene.add(hall, top);
    }
  }

  buildPitch() {
    const W = 105, H = 68, S = 20; // texture px per metre
    const tex = canvasTex(W * S + 200, H * S + 200, (x, w, h) => {
      const pad = 100;
      // apron + mowing stripes
      x.fillStyle = '#16451f'; x.fillRect(0, 0, w, h);
      const stripes = 14;
      for (let i = 0; i < stripes; i++) {
        x.fillStyle = i % 2 ? '#1b6a2b' : '#35923f';
        x.fillRect(pad + (i * W * S) / stripes, pad, (W * S) / stripes + 1, H * S);
      }
      // cross-mowing: faint perpendicular bands
      for (let j = 0; j < 12; j++) {
        x.fillStyle = j % 2 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.03)';
        x.fillRect(pad, pad + (j * H * S) / 12, W * S, (H * S) / 12 + 1);
      }
      // goalmouth and centre wear
      for (const [cx, cy, r] of [[5, H / 2, 6], [W - 5, H / 2, 6], [W / 2, H / 2, 5], [11, H / 2, 3], [W - 11, H / 2, 3]]) {
        const g = x.createRadialGradient(pad + cx * S, pad + cy * S, 0, pad + cx * S, pad + cy * S, r * S);
        g.addColorStop(0, 'rgba(120,110,60,0.35)'); g.addColorStop(1, 'rgba(120,110,60,0)');
        x.fillStyle = g; x.fillRect(pad + (cx - r) * S, pad + (cy - r) * S, 2 * r * S, 2 * r * S);
      }
      // fine grass grain
      const img = x.getImageData(0, 0, w, h);
      for (let i = 0; i < img.data.length; i += 4) {
        const n = (Math.random() - 0.5) * 16 + (Math.random() < 0.02 ? 12 : 0);
        img.data[i] += n * 0.6; img.data[i + 1] += n; img.data[i + 2] += n * 0.5;
      }
      x.putImageData(img, 0, 0);
      x.strokeStyle = 'rgba(255,255,255,0.92)';
      x.lineWidth = 0.12 * S;
      const m = (v) => pad + v * S;
      x.strokeRect(m(0), m(0), W * S, H * S);
      x.beginPath(); x.moveTo(m(W / 2), m(0)); x.lineTo(m(W / 2), m(H)); x.stroke();
      x.beginPath(); x.arc(m(W / 2), m(H / 2), 9.15 * S, 0, TAU); x.stroke();
      x.fillStyle = '#fff';
      x.beginPath(); x.arc(m(W / 2), m(H / 2), 0.3 * S, 0, TAU); x.fill();
      for (const side of [0, 1]) {
        const dir = side ? -1 : 1, gx = side ? W : 0;
        x.strokeRect(m(side ? W - 16.5 : 0), m(H / 2 - 20.16), 16.5 * S, 40.32 * S);
        x.strokeRect(m(side ? W - 5.5 : 0), m(H / 2 - 9.16), 5.5 * S, 18.32 * S);
        x.beginPath(); x.arc(m(gx + dir * 11), m(H / 2), 0.3 * S, 0, TAU); x.fill();
        x.beginPath();
        const a = Math.acos(5.5 / 9.15);
        if (side) x.arc(m(W - 11), m(H / 2), 9.15 * S, Math.PI - a, Math.PI + a);
        else x.arc(m(11), m(H / 2), 9.15 * S, -a, a);
        x.stroke();
        for (const cy of [0, H]) { x.beginPath(); x.arc(m(gx), m(cy), S, 0, TAU); x.stroke(); }
      }
    });
    this.pitchMat = new THREE.ShaderMaterial({
      uniforms: { ...this.uniforms, map: { value: tex }, uSun: { value: this.sunDir }, uSpot: { value: new THREE.Vector3(0, 0, 0) } },
      vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `varying vec2 vUv; varying vec3 vW; uniform sampler2D map; uniform vec3 uSun, uCam, uSpot; uniform float uLights, uDay, uDusk, uRain;
        void main(){
          vec3 c = texture2D(map, vUv).rgb;
          // sunlight only reaches the grass through the roof opening
          vec2 hit = abs(vW.xz + uSun.xz / max(uSun.y, .05) * 49.) / vec2(${ROOF_OPEN.A}., ${ROOF_OPEN.B}.);
          hit *= hit;
          float sun = smoothstep(1.12, .9, sqrt(sqrt(dot(hit, hit))));
          float flood = .07 + uLights * 1.05;
          float dayL = mix(.5, 1.25, sun);
          vec3 L = vec3(mix(flood, dayL, uDay)) * mix(vec3(1.), vec3(1.2, .9, .68), uDusk * sun);
          c *= L * (1. - uRain * .15);
          if (uRain > .01) {
            float f = pow(1. - abs(normalize(uCam - vW).y), 3.);
            c += vec3(.5, .55, .65) * f * uRain * .3 * flood;
          }
          if (uSpot.z > .01) c *= mix(1., .55 + .95 * smoothstep(11., 3., length(vW.xz - uSpot.xy)), uSpot.z);
          gl_FragColor = vec4(c, 1.);
        }`,
    });
    const pitch = new THREE.Mesh(new THREE.PlaneGeometry(W + 10, H + 10), this.pitchMat);
    pitch.rotation.x = -Math.PI / 2;
    this.scene.add(pitch);

    // dark apron out to the stands
    const apron = new THREE.Mesh(
      surface(160, 1, (u, v) => {
        const t = u * TAU;
        const [ax, az] = v ? se(t, BOWL.A + 0.5, BOWL.B + 0.5, BOWL.n) : [Math.cos(t) * 60 * 1.0, Math.sin(t) * 39];
        if (!v) { const k = Math.min(57.5 / Math.abs(Math.cos(t) || 1e-6), 39 / Math.abs(Math.sin(t) || 1e-6)); return [Math.cos(t) * k, -0.02, Math.sin(t) * k]; }
        return [ax, -0.02, az];
      }),
      new THREE.MeshLambertMaterial({ color: '#7b8078' })
    );
    this.scene.add(apron);
    this.pitchLights = new THREE.HemisphereLight(0xdfe9ff, 0x0b1a10, 0.15);
    this.scene.add(this.pitchLights);
  }

  buildBowl() {
    const pt = (u, d, h) => { const [x, z] = se(u * TAU, BOWL.A + d, BOWL.B + d, BOWL.n); return [x, h, z]; };
    const U = this.mobile ? 180 : 320;

    // seat rows: sky-blue seat backs over concrete risers, tiled along each tier
    const seatTex = canvasTex(256, 64, (x, w, h) => {
      x.fillStyle = '#3a4350'; x.fillRect(0, 0, w, h);           // riser
      x.fillStyle = '#4b5562'; x.fillRect(0, h * 0.62, w, h * 0.38); // tread
      for (let i = 0; i < 8; i++) {
        const sx = i * 32 + 3;
        const g = x.createLinearGradient(0, 6, 0, 40);
        g.addColorStop(0, '#8fd2f7'); g.addColorStop(1, '#4a9ad6');
        x.fillStyle = g;
        x.beginPath(); x.roundRect(sx, 6, 26, 34, 5); x.fill();
        x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(sx, 36, 26, 4);
      }
    });
    seatTex.wrapS = seatTex.wrapT = THREE.RepeatWrapping;
    const concrete = new THREE.MeshLambertMaterial({ color: '#2a323d', side: THREE.DoubleSide });
    this.bowlMat = concrete;
    for (let k = 0; k < STAND.length - 1; k++) {
      const [d0, h0] = STAND[k], [d1, h1] = STAND[k + 1];
      const seating = TIERS.some(([a]) => a === k);
      const geo = surface(U, 1, (u, v) => pt(u, v ? d1 : d0, v ? h1 : h0));
      let mat = concrete;
      if (seating) {
        const t = seatTex.clone(); t.needsUpdate = true;
        const len = Math.hypot(d1 - d0, h1 - h0);
        t.repeat.set(Math.round((2 * (BOWL.A + BOWL.B + d0 + d1)) * 1.6 / 4), Math.round(len / 0.85));
        mat = new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide });
      }
      const mesh = new THREE.Mesh(geo, mat);
      this.scene.add(mesh);
    }

    // aisles (vomitory stairs) cutting through every tier
    const aisleMat = new THREE.MeshLambertMaterial({ color: '#8e99a6', side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
    const aisles = 28, aisleGeos = [];
    for (const [a, b] of TIERS) for (let i = 0; i < aisles; i++) {
      const u0 = (i + 0.5) / aisles, du = 0.0035;
      aisleGeos.push(surface(2, 1, (u, v) => pt(u0 - du + u * du * 2, v ? STAND[b][0] : STAND[a][0], (v ? STAND[b][1] : STAND[a][1]) + 0.02)));
    }
    this.scene.add(new THREE.Mesh(mergeGeometries(aisleGeos), aisleMat));

    // concourse LED ribbons on the tier fronts
    // the sky-blue perimeter ring, and the white band between the upper tiers
    for (const [d, y0, y1, c] of [[17, 12.6, 15.9, [.3, .62, .95]], [29, 25.1, 28.9, [1, 1, 1]]]) {
      this.scene.add(new THREE.Mesh(surface(U, 1, (u, v) => pt(u, d - 0.05, v ? y1 : y0)), new THREE.ShaderMaterial({
        uniforms: { ...this.uniforms, uCol: { value: new THREE.Vector3(...c) } }, side: THREE.DoubleSide,
        vertexShader: `void main(){ gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
        fragmentShader: `uniform vec3 uCol; uniform float uLights; void main(){ gl_FragColor = vec4(uCol * (.2 + uLights * .9), 1.); }`,
      })));
    }

    // crowd: a full house. One spectator per seat on a real row/seat grid,
    // with a two-tier "SDP42" tifo mosaic behind the west goal.
    const body = new THREE.BoxGeometry(0.46, 0.58, 0.3).toNonIndexed(); body.translate(0, 0.36, 0);
    const head = new THREE.IcosahedronGeometry(0.13, 0); head.translate(0, 0.79, 0.02);
    const geo = mergeGeometries([body, head]);
    const part = new Float32Array(geo.attributes.position.count); // 0 body, 1 head
    part.fill(1, body.attributes.position.count);
    geo.setAttribute('part', new THREE.BufferAttribute(part, 1));

    // tifo bitmap
    const TW = 150, TH = 34;
    const tc = document.createElement('canvas'); tc.width = TW; tc.height = TH;
    const tx = tc.getContext('2d');
    tx.fillStyle = '#2a8fe0'; tx.fillRect(0, 0, TW, TH);
    tx.fillStyle = '#ffffff'; for (let i = 0; i < TW; i += 10) tx.fillRect(i, 0, 3, TH);
    tx.fillStyle = '#0b2a52'; tx.fillRect(16, 4, TW - 32, TH - 8);
    tx.fillStyle = '#ffffff'; tx.font = '900 25px Arial'; tx.textAlign = 'center'; tx.textBaseline = 'middle';
    tx.fillText('SDP42', TW / 2, TH / 2 + 1);
    const tifo = tx.getImageData(0, 0, TW, TH).data;

    const seatW = 0.55, rowD = 0.85;
    const perim = (d) => { let L = 0, prev = se(0, BOWL.A + d, BOWL.B + d, BOWL.n); for (let i = 1; i <= 200; i++) { const q = se((i / 200) * TAU, BOWL.A + d, BOWL.B + d, BOWL.n); L += Math.hypot(q[0] - prev[0], q[1] - prev[1]); prev = q; } return L; };
    const seats = [];
    let tifoRow = 0;
    TIERS.forEach(([a, b], ti) => {
      const len = Math.hypot(STAND[b][0] - STAND[a][0], STAND[b][1] - STAND[a][1]);
      const rows = Math.round(len / rowD);
      for (let r = 0; r < rows; r++) {
        const f = (r + 0.55) / rows;
        const d = STAND[a][0] + (STAND[b][0] - STAND[a][0]) * f;
        const h = STAND[a][1] + (STAND[b][1] - STAND[a][1]) * f;
        const n = Math.floor(perim(d) / seatW);
        const inTifo = ti < 2; // lower + middle tiers carry the mosaic
        const trow = inTifo ? tifoRow++ : -1;
        for (let k = 0; k < n; k++) {
          const u = (k + 0.5) / n;
          if (Math.abs(((u * aisles) % 1) - 0.5) < 0.05) continue; // aisle
          seats.push([u, d, h, trow, ti]);
        }
      }
    });
    const totalRowsTifo = tifoRow;
    const cap = this.mobile ? 9000 : 26000;
    const stride = Math.max(1, seats.length / cap);
    const count = Math.min(cap, seats.length);
    const mesh = new THREE.InstancedMesh(geo, null, count);
    const phase = new Float32Array(count * 2);
    const palette = ['#1b2330', '#2a3444', '#6cabdd', '#101521', '#39465a', '#d9e6f2', '#6cabdd', '#1c3a6b', '#0c1018', '#4a5668'].map((h) => new THREE.Color(h));
    const skin = ['#f1c9a5', '#c68d62', '#8d5a3c', '#e0ac85'].map((h) => new THREE.Color(h));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), yAxis = new THREE.Vector3(0, 1, 0);
    const col = new THREE.Color();
    let k = 0;
    for (let i = 0; i < count; i++) {
      const [u, d, h, trow] = seats[Math.floor(i * stride)];
      const [x, y, z] = pt(u, d, h);
      q.setFromAxisAngle(yAxis, Math.atan2(-x, -z) + (Math.random() - 0.5) * 0.25);
      const s = (this.mobile ? 1.5 : 1.2) + Math.random() * 0.14;
      m4.compose(new THREE.Vector3(x, y, z), q, sc.set(s, s, s));
      mesh.setMatrixAt(k, m4);
      // west stand (u ≈ 0.5) between 0.40 and 0.60 holds up the tifo
      const tu = (u - 0.4) / 0.2;
      if (trow >= 0 && tu >= 0 && tu <= 1) {
        const px = Math.floor(tu * (TW - 1)), py = Math.floor((1 - trow / (totalRowsTifo - 1)) * (TH - 1));
        const j = (py * TW + px) * 4;
        col.setRGB(tifo[j] / 255, tifo[j + 1] / 255, tifo[j + 2] / 255, THREE.SRGBColorSpace);
        phase.set([u, -1], k * 2); // negative = holding a card
      } else {
        col.copy(palette[(Math.random() * palette.length) | 0]).multiplyScalar(0.7 + Math.random() * 0.3);
        phase.set([u, Math.random()], k * 2);
      }
      mesh.setColorAt(k, col);
      k++;
    }
    geo.setAttribute('phase', new THREE.InstancedBufferAttribute(phase, 2));
    mesh.material = new THREE.ShaderMaterial({
      uniforms: { ...this.uniforms, uSkin: { value: skin.map((c) => new THREE.Vector3(c.r, c.g, c.b)) } },
      vertexShader: `attribute vec2 phase; attribute float part; varying vec3 vC; varying float vL; varying float vFlash;
        uniform float uTime, uWave, uHype, uLights, uDay; uniform vec3 uSkin[4];
        void main(){
          bool card = phase.y < 0.;
          float seed = card ? fract(phase.x * 91.7) : phase.y;
          float dw = abs(fract(phase.x - uWave + .5) - .5);
          float wave = smoothstep(.05, .0, dw);
          float bounce = uHype * abs(sin(uTime*7. + seed*6.2832)) * .3;
          vec3 p = position;
          float isHead = part;
          p.y += wave * .5 + bounce;
          vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.);
          gl_Position = projectionMatrix * viewMatrix * w;
          vec3 n = normalize(mat3(modelMatrix * instanceMatrix) * normal);
          vL = .4 + .6 * max(dot(n, normalize(vec3(.2, 1., .3))), 0.);
          int si = int(mod(seed * 37., 4.));
          vec3 sk = si == 0 ? uSkin[0] : si == 1 ? uSkin[1] : si == 2 ? uSkin[2] : uSkin[3];
          vec3 c = card ? instanceColor * 1.25 : mix(instanceColor, sk, isHead);
          vC = c * (0.2 + .8 * max(uLights, uDay));
          float f = fract(sin(dot(phase, vec2(12.9898,78.233)) + floor(uTime*8.)) * 43758.5453);
          vFlash = card ? 0. : step(.9995 - uHype*.004, f) * isHead * (1. - uDay);
        }`,
      fragmentShader: `varying vec3 vC; varying float vL; varying float vFlash;
        void main(){ gl_FragColor = vec4(mix(vC * vL, vec3(8.), vFlash), 1.); }`,
    });
    mesh.frustumCulled = false;
    this.crowd = mesh;
    this.seatCount = seats.length;
    this.scene.add(mesh);

    // big flags waving from the front rows
    const flagTex = canvasTex(256, 160, (x, w, h) => {
      for (let i = 0; i < 6; i++) { x.fillStyle = i % 2 ? '#ffffff' : '#4fb8f5'; x.fillRect(0, (i * h) / 6, w, h / 6 + 1); }
      x.fillStyle = '#0b2a52'; x.font = '900 46px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('SDP42', w / 2, h / 2);
    });
    const flagMat = new THREE.ShaderMaterial({
      uniforms: { ...this.uniforms, map: { value: flagTex } }, side: THREE.DoubleSide,
      vertexShader: `varying vec2 vUv; uniform float uTime; void main(){ vUv = uv; vec3 p = position;
          float k = uv.x; p.z += sin(uTime*4. + p.x*1.6) * .35 * k; p.y += sin(uTime*3. + p.x*2.) * .12 * k;
          gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
      fragmentShader: `varying vec2 vUv; uniform sampler2D map; uniform float uLights, uDay;
        void main(){ vec3 c = texture2D(map, vUv).rgb; gl_FragColor = vec4(c * (0.25 + .75 * max(uLights, uDay)), 1.); }`,
    });
    for (let i = 0; i < 12; i++) {
      const u = (i + 0.25) / 12;
      if (u > 0.38 && u < 0.62) continue; // not over the tifo
      const [x, y, z] = pt(u, 4 + (i % 3) * 3, 3.5 + (i % 3) * 2.2);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.5, 16, 8), flagMat);
      flag.geometry.translate(2, 0, 0);
      flag.position.set(x, y + 3.2, z);
      flag.rotation.y = Math.atan2(-x, -z) + Math.PI / 2;
      this.scene.add(flag);
    }
  }

  // Etihad-style exterior, modelled from aerial and interior photos: banded
  // glass-and-metal facade, grey metal roof with a wide glazed inner band,
  // white fascia, drum towers with a spiral stripe, masts and cable stays.
  buildShell() {
    const U = this.mobile ? 160 : 240;
    const facadeGeo = surface(U, 1, (u, v) => {
      const t = u * TAU;
      const [x, z] = se(t, SHELL.A * 0.965, SHELL.B * 0.965, SHELL.n);
      return [x, v * (roofOutY(t) - 1.6), z];
    });
    const roofGeo = surface(U, 8, (u, v) => {
      const t = u * TAU;
      const [ox, oz] = se(t, SHELL.A, SHELL.B, SHELL.n);
      const [ix, iz] = se(t, ROOF_OPEN.A, ROOF_OPEN.B, ROOF_OPEN.n);
      const y0 = roofOutY(t), y1 = roofInY(t);
      return [ox + (ix - ox) * v, y0 + (y1 - y0) * v + Math.sin(v * Math.PI) * 1.1, oz + (iz - oz) * v];
    });
    const fasciaGeo = surface(U, 1, (u, v) => {
      const t = u * TAU;
      const [x, z] = se(t, SHELL.A + 0.05, SHELL.B + 0.05, SHELL.n);
      return [x, roofOutY(t) - v * 2.6, z];
    });

    const common = () => ({
      ...this.uniforms,
      uA: { value: this.shellColor.a }, uB: { value: this.shellColor.b },
      uChase: { value: 0 }, uPower: { value: 0 },
    });
    const vert = `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;
    const norm = `float norm(vec2 p){ vec2 q = abs(p) / vec2(${SHELL.A}., ${SHELL.B}.); q *= q; return sqrt(sqrt(dot(q, q))); }`;

    this.shellMat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide, uniforms: common(), vertexShader: vert,
      fragmentShader: `varying vec2 vUv; varying vec3 vW; ${norm}
        uniform vec3 uA, uB, uCam; uniform float uChase, uPower, uTime, uDay, uLights;
        void main(){
          vec3 c;
          if (norm(uCam.xz) < norm(vW.xz)) { c = mix(vec3(.03, .035, .045), vec3(.26, .28, .32), uDay); }
          else {
            float y = vW.y;
            float mull = step(.43, abs(fract(vUv.x * 300.) - .5));
            float trans = step(.45, abs(fract(y / 3.5) - .5));
            float glass = step(7., y) * step(y, 27.);
            float banner = glass * step(fract(vUv.x * 8. + .06), .1);
            float band = smoothstep(1.2, .9, abs(y - 29.5));
            float louvre = step(27., y) * (.5 + .5 * sin(y * 9.));
            vec3 led = mix(uA, uB, (.5 + .5 * sin(vUv.x * 37.7 - uTime * 2.)) * uChase);
            // day: grey cladding base, dark glazing with silver mullions, metal top
            vec3 day = vec3(.5, .52, .55) - smoothstep(.03, .0, abs(fract(vUv.x * 120.) - .5) - .47) * .05;
            day = mix(day, mix(vec3(.13, .17, .22), vec3(.6, .64, .68), max(mull, trans)), glass);
            if (y > 27.) day = vec3(.56, .58, .62) - louvre * .05;
            day = mix(day, vec3(.25, .55, .85), banner * .9);
            // night: lit concourses, glowing banners and a sky-blue crown
            vec3 night = vec3(.03, .035, .05);
            night = mix(night, mix(vec3(.75, .6, .4) * (.2 + .8 * uLights), vec3(.05), max(mull, trans)), glass);
            night = mix(night, led * 1.1 * uPower, banner);
            night += led * band * uPower * 1.5;
            c = mix(night, day, uDay);
          }
          gl_FragColor = vec4(c, 1.);
        }`,
    });
    this.roofMat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide, uniforms: common(), vertexShader: vert,
      fragmentShader: `varying vec2 vUv; varying vec3 vW;
        uniform vec3 uA, uCam; uniform float uPower, uDay, uDusk, uRain;
        void main(){
          vec2 q = abs(vW.xz) / vec2(${SHELL.A}., ${SHELL.B}.);
          float ridge = smoothstep(.014, .0, abs(q.x - q.y));
          float glazed = smoothstep(.44, .47, vUv.y) * smoothstep(1., .985, vUv.y);
          float rib = step(.84, abs(fract(vUv.x * 72.) - .5) * 2.);
          float seam = step(.8, abs(fract(vUv.x * 300.) - .5) * 2.);
          float purlin = step(.86, abs(fract(vUv.y * 11.) - .5) * 2.);
          vec3 c;
          if (uCam.y > vW.y) {
            // top: pale metal sheet, glazed panels with a dark grid, corner ridges
            vec3 d = vec3(.72, .74, .77) - seam * .05 + step(q.x, q.y) * .03;
            d = mix(d, vec3(.84, .88, .9) - max(rib, purlin) * .42, glazed);
            d -= ridge * .25;
            vec3 n = mix(vec3(.05, .06, .075) + seam * .01, uA * .14 * uPower + vec3(.03) - max(rib, purlin) * .02, glazed);
            c = mix(n, d, uDay);
          } else {
            // underside: dark steel with heavy ribs; sky glows through the glazing
            vec3 d = mix(vec3(.13, .14, .16), vec3(.82, .88, .94), glazed);
            d = mix(d, vec3(.06, .065, .08), max(rib, purlin * glazed));
            vec3 n = mix(vec3(.018, .02, .028), vec3(.07, .085, .11), glazed) * (1. - max(rib, purlin * glazed) * .7);
            c = mix(n, d, uDay);
          }
          c *= 1. - uRain * .3;
          gl_FragColor = vec4(c, 1.);
        }`,
    });
    const fasciaMat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide, uniforms: common(), vertexShader: vert,
      fragmentShader: `uniform float uDay, uPower; uniform vec3 uA;
        void main(){ gl_FragColor = vec4(mix(vec3(.13, .15, .18) + uA * .12 * uPower, vec3(.86, .88, .9), uDay), 1.); }`,
    });
    this.scene.add(new THREE.Mesh(facadeGeo, this.shellMat), new THREE.Mesh(roofGeo, this.roofMat), new THREE.Mesh(fasciaGeo, fasciaMat));

    // drum towers: one instanced mesh, a ramp stripe sheared into a real spiral
    const H = 26, bands = 5, bh = H / bands;
    const dark = [.17, .19, .23], grey = [.6, .62, .65], sky = [.36, .66, .92], white = [.86, .87, .89], disc = [.3, .31, .34];
    const prof = [];
    for (let j = 0; j < bands; j++) {
      const y = j * bh;
      prof.push([7, y, dark], [7, y + bh * .46, dark], [8.2, y + bh * .5, grey], [8.2, y + bh * .66, grey], [8.2, y + bh * .66, sky], [8.2, y + bh * .86, sky], [8.2, y + bh * .86, grey], [8.2, y + bh * .98, grey], [7, y + bh, dark]);
    }
    prof.push([9.8, H, disc], [9.8, H + .7, disc], [3.6, H + 1.4, disc], [3.4, H + 1.4, white], [3.4, H + 5.2, white], [.7, H + 7, grey]);
    const rows = prof.length - 1, SEG = 28;
    const towerGeo = surface(SEG, rows, (u, v) => {
      const [r, y] = prof[Math.round(v * rows)], a = u * TAU;
      const shear = THREE.MathUtils.clamp(y / bh, 0, 1) * (1 - THREE.MathUtils.smoothstep(y, H - bh, H));
      return [Math.cos(a) * r, y + u * bh * shear, Math.sin(a) * r];
    });
    const col = new Float32Array((rows + 1) * (SEG + 1) * 3);
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= SEG; i++) col.set(prof[j][2], (j * (SEG + 1) + i) * 3);
    towerGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));

    // four along each end, two on each long side; masts on the end towers
    const spots = [];
    for (const base of [0, Math.PI]) for (const o of [-.48, -.17, .17, .48]) spots.push({ t: base + o, mast: true });
    for (const base of [Math.PI / 2, Math.PI * 1.5]) for (const o of [-.62, .62]) spots.push({ t: base + o, mast: false });
    const towers = new THREE.InstancedMesh(towerGeo, new THREE.ShaderMaterial({
      uniforms: { ...this.uniforms, uSun: { value: this.sunDir } }, side: THREE.DoubleSide,
      vertexShader: `attribute vec3 color; varying vec3 vC; varying vec3 vN; varying float vY;
        void main(){ vC = color; vY = position.y; vN = normalize(mat3(instanceMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * instanceMatrix * vec4(position, 1.); }`,
      fragmentShader: `varying vec3 vC; varying vec3 vN; varying float vY; uniform float uDay, uLights; uniform vec3 uSun;
        void main(){
          float nl = abs(dot(normalize(vN), uSun));
          vec3 d = vC * (.48 + .72 * nl);
          float glow = step(.3, vC.b - vC.r);
          vec3 n = vC * (.14 + .2 * exp(-vY / 9.)) + vec3(.3, .62, 1.) * glow * (.15 + 1.1 * uLights);
          gl_FragColor = vec4(mix(n, d, uDay), 1.);
        }`,
    }), spots.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), yA = new THREE.Vector3(0, 1, 0);
    const steel = new THREE.MeshLambertMaterial({ color: '#aeb6c0', emissive: '#262c34' });
    const mastGeo = new THREE.CylinderGeometry(.42, 1, 1, 8); mastGeo.translate(0, .5, 0);
    const struts = [], cables = [];
    const strut = (from, to, r = 1) => struts.push({ from, to, r });
    spots.forEach((s, i) => {
      const [x, z] = se(s.t, SHELL.A + 17, SHELL.B + 17, SHELL.n);
      const out = new THREE.Vector3(x, 0, z).normalize();
      q.setFromAxisAngle(yA, Math.atan2(out.z, -out.x));
      towers.setMatrixAt(i, m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(1, 1, 1)));
      if (!s.mast) return;
      const base = new THREE.Vector3(x, H + 6, z);
      const top = base.clone().addScaledVector(out, 8).add(new THREE.Vector3(0, 48, 0));
      strut(base, top);
      for (let k = -3; k <= 3; k++) {
        const tt = s.t + k * .05, [rx, rz] = se(tt, SHELL.A, SHELL.B, SHELL.n);
        cables.push(top.x, top.y, top.z, rx, roofOutY(tt), rz);
      }
      cables.push(top.x, top.y, top.z, x + out.x * 28, .2, z + out.z * 28);
    });
    // V-shaped struts along the long sides
    for (const base of [Math.PI / 2, Math.PI * 1.5]) for (const o of [-.2, .2]) {
      const t = base + o, [rx, rz] = se(t, SHELL.A, SHELL.B, SHELL.n);
      const out = new THREE.Vector3(rx, 0, rz).normalize();
      const apex = new THREE.Vector3(rx, roofOutY(t) + 12, rz).addScaledVector(out, 5);
      for (const s of [-1, 1]) {
        const [gx, gz] = se(t + s * .09, SHELL.A + 16, SHELL.B + 16, SHELL.n);
        strut(new THREE.Vector3(gx, 0, gz), apex);
      }
      for (let k = -2; k <= 2; k++) { const tt = t + k * .05, [cx, cz] = se(tt, SHELL.A, SHELL.B, SHELL.n); cables.push(apex.x, apex.y, apex.z, cx, roofOutY(tt), cz); }
    }
    const masts = new THREE.InstancedMesh(mastGeo, steel, struts.length);
    struts.forEach(({ from, to }, i) => {
      const dir = to.clone().sub(from), len = dir.length();
      q.setFromUnitVectors(yA, dir.normalize());
      masts.setMatrixAt(i, m4.compose(from, q, new THREE.Vector3(1, len, 1)));
    });
    towers.frustumCulled = masts.frustumCulled = false;
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cables, 3));
    this.scene.add(towers, masts, new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color: 0xc4ccd6, transparent: true, opacity: .75 })));
  }

  buildLights() {
    // floodlight strip hung under the roof's inner edge; switches on sector by sector
    const g = surface(this.mobile ? 160 : 240, 1, (u, v) => {
      const t = u * TAU;
      const [x, z] = se(t, ROOF_OPEN.A + 1 + v * 3, ROOF_OPEN.B + 1 + v * 3, ROOF_OPEN.n);
      return [x, roofInY(t) - .7 + v * .3, z];
    });
    this.lightRing = new THREE.Mesh(g, new THREE.ShaderMaterial({
      uniforms: { ...this.uniforms, uDim: { value: 1 } }, side: THREE.DoubleSide,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `varying vec2 vUv; uniform float uLights, uDim, uDay;
        void main(){
          float lamp = step(abs(fract(vUv.x * 140.) - .5), .3);
          float on = step(floor(vUv.x * 8.) / 8., uLights * 1.12 - .12);
          vec3 c = vec3(1., .96, .88) * (.03 + on * lamp * 2.4 * uDim * (1. - uDay * .8));
          gl_FragColor = vec4(c, 1.); }`,
    }));
    this.scene.add(this.lightRing);

    this.sun = new THREE.DirectionalLight(0xf3f6ff, 0);
    this.sun.position.set(30, 120, 40);
    this.scene.add(this.sun);
    this.fill = new THREE.DirectionalLight(0xffe6d0, 0);
    this.fill.position.set(-40, 90, -60);
    this.scene.add(this.fill);

    // radial roof trusses and a catwalk ring, seen from inside the bowl
    const truss = [], N = 48;
    const at = (j, f) => {
      const t = (j / N) * TAU, [ox, oz] = se(t, SHELL.A, SHELL.B, SHELL.n), [ix, iz] = se(t, ROOF_OPEN.A, ROOF_OPEN.B, ROOF_OPEN.n);
      const y0 = roofOutY(t), y1 = roofInY(t);
      return [ox + (ix - ox) * f, y0 + (y1 - y0) * f - 1.1, oz + (iz - oz) * f];
    };
    for (let i = 0; i < N; i++) truss.push(...at(i, 0), ...at(i, .96), ...at(i, .5), ...at(i + 1, .5));
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(truss, 3));
    this.scene.add(new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ color: 0x3c444e })));

    // a little floodlight glare (one small draw, kept modest for overdraw)
    const G = this.mobile ? 20 : 36;
    const gp = new Float32Array(G * 3), gu = new Float32Array(G);
    for (let i = 0; i < G; i++) {
      const u = (i + .5) / G, t = u * TAU;
      const [x, z] = se(t, ROOF_OPEN.A + 2.5, ROOF_OPEN.B + 2.5, ROOF_OPEN.n);
      gp.set([x, roofInY(t) - 1, z], i * 3); gu[i] = u;
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.BufferAttribute(gp, 3));
    gg.setAttribute('u', new THREE.BufferAttribute(gu, 1));
    this.glare = new THREE.Points(gg, new THREE.ShaderMaterial({
      uniforms: { ...this.uniforms, uDim: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float u; uniform float uLights, uDim, uDay; varying float vOn;
        void main(){ vOn = step(floor(u * 8.) / 8., uLights * 1.12 - .12) * uDim * (1. - uDay);
          vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = min(90., 1200. / -mv.z); }`,
      fragmentShader: `varying float vOn; void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(vec3(1., .97, .9) * (exp(-d * 16.) + exp(-d * 6.) * .2) * vOn, 1.); }`,
    }));
    this.scene.add(this.glare);

    // captain's spotlight: a visible beam; the pool of light is drawn by the pitch shader
    this.spotBeam = new THREE.Mesh(new THREE.CylinderGeometry(.6, 5.5, 48, 20, 1, true), new THREE.ShaderMaterial({
      uniforms: { uA: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `varying vec2 vUv; uniform float uA; void main(){ float a = (pow(1. - vUv.y, 2.) * .07 + vUv.y * .008) * uA; gl_FragColor = vec4(vec3(1., .93, .75) * a, a); }`,
    }));
    this.spotBeam.visible = false;
    this.scene.add(this.spotBeam);

    // corner flags
    const poleG = new THREE.CylinderGeometry(.03, .03, 1.6, 6), flagG = new THREE.PlaneGeometry(.5, .35);
    const white = new THREE.MeshLambertMaterial({ color: '#fff' }), sky = new THREE.MeshLambertMaterial({ color: '#62c8ff', side: THREE.DoubleSide });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const pole = new THREE.Mesh(poleG, white); pole.position.set(52.5 * sx, .8, 34 * sz);
      const flag = new THREE.Mesh(flagG, sky); flag.position.set(52.5 * sx + .25, 1.4, 34 * sz);
      this.scene.add(pole, flag);
    }
  }

  buildFixtures() {
    // goals with nets
    const post = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.2, roughness: 0.3 });
    const netPts = [];
    for (const side of [-1, 1]) {
      const g = new THREE.Group();
      const cyl = (h) => new THREE.CylinderGeometry(0.07, 0.07, h, 10);
      for (const z of [-3.66, 3.66]) { const m = new THREE.Mesh(cyl(2.44), post); m.position.set(0, 1.22, z); g.add(m); }
      const bar = new THREE.Mesh(cyl(7.32), post); bar.rotation.x = Math.PI / 2; bar.position.y = 2.44; g.add(bar);
      g.position.x = side * 52.5;
      this.scene.add(g);
      // net: grid on back, top and sides
      const D = 2.2 * side, X = side * 52.5;
      const add = (a, b) => netPts.push(...a, ...b);
      for (let i = 0; i <= 24; i++) {
        const z = -3.66 + (i / 24) * 7.32;
        add([X, 2.44, z], [X + D, 2.0, z]); add([X + D, 2.0, z], [X + D, 0, z]);
      }
      for (let j = 0; j <= 8; j++) {
        const y = (j / 8) * 2.0;
        add([X + D, y, -3.66], [X + D, y, 3.66]);
        for (const z of [-3.66, 3.66]) add([X, y * 1.22, z], [X + D, y, z]);
      }
      for (let j = 0; j <= 6; j++) { const t = j / 6; add([X + D * t, 2.44 - 0.44 * t, -3.66], [X + D * t, 2.44 - 0.44 * t, 3.66]); }
    }
    const ng = new THREE.BufferGeometry();
    ng.setAttribute('position', new THREE.Float32BufferAttribute(netPts, 3));
    this.netBase = Float32Array.from(netPts);
    this.netLines = new THREE.LineSegments(ng, new THREE.LineBasicMaterial({ color: 0xdfe6ee, transparent: true, opacity: 0.5 }));
    this.scene.add(this.netLines);
    this.netBulge = 0;

    // LED advertising boards round the pitch
    const board = canvasTex(2048, 64, (x, w, h) => {
      x.fillStyle = '#05080d'; x.fillRect(0, 0, w, h);
      x.font = '900 40px Archivo, Arial, sans-serif'; x.textBaseline = 'middle';
      const words = ['SDP42 FC', 'DATA → DECISIONS', 'MACHINE LEARNING', 'GENERATIVE AI', 'MUMBAI'];
      let px = 20, i = 0;
      while (px < w) { x.fillStyle = i % 2 ? '#62c8ff' : '#ffffff'; const s = words[i % words.length] + '  ◆  '; x.fillText(s, px, h / 2 + 2); px += x.measureText(s).width; i++; }
    });
    board.wrapS = THREE.RepeatWrapping;
    this.boardTex = board;
    const bm = new THREE.MeshBasicMaterial({ map: board, side: THREE.DoubleSide, toneMapped: false });
    const mkBoard = (len, x, z, ry) => {
      const t = board.clone(); t.repeat.set(len / 40, 1); t.needsUpdate = true;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.9), bm.clone()); m.material.map = t;
      m.position.set(x, 0.45, z); m.rotation.y = ry; this.scene.add(m); return t;
    };
    this.boardTexes = [mkBoard(100, 0, -40, 0), mkBoard(100, 0, 40, Math.PI), mkBoard(60, -58, 0, Math.PI / 2), mkBoard(60, 58, 0, -Math.PI / 2)];

    // players' tunnel (extendable walkway onto the pitch)
    const tun = new THREE.Group();
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.6, 8, 24, 1, true, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: '#f2f2f2', roughness: 0.5, side: THREE.DoubleSide, emissive: '#ffffff', emissiveIntensity: 0.05 })
    );
    tube.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    tun.add(tube);
    const mouth = new THREE.Mesh(new THREE.RingGeometry(2.45, 2.75, 24, 1, 0, Math.PI), new THREE.MeshBasicMaterial({ color: LIME, side: THREE.DoubleSide, toneMapped: false }));
    mouth.position.z = -4; tun.add(mouth);
    const dark = new THREE.Mesh(new THREE.CircleGeometry(2.45, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#000' }));
    dark.position.z = 3.9; tun.add(dark);
    tun.position.set(0, 0, 44.5);
    this.scene.add(tun);
    this.anchors.about = new THREE.Vector3(0, 2.4, 40.5);

    // dugouts: glass bubbles either side of the tunnel
    const glass = new THREE.MeshPhysicalMaterial({ color: '#bfe3ff', roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.35, metalness: 0, side: THREE.DoubleSide });
    for (const x of [-12, 12]) {
      const d = new THREE.Group();
      const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI, 0, Math.PI / 2), glass);
      shell.scale.set(5, 2.2, 2.4); shell.rotation.y = Math.PI; d.add(shell);
      const seats = new THREE.Mesh(new THREE.BoxGeometry(9, 0.5, 1), new THREE.MeshStandardMaterial({ color: '#2a7fc0', emissive: '#62c8ff', emissiveIntensity: 0.25 }));
      seats.position.set(0, 0.5, 1.4); d.add(seats);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(10, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: LIME, toneMapped: false }));
      strip.position.set(0, 0.05, 0); d.add(strip);
      d.position.set(x, 0, 42.5);
      this.scene.add(d);
    }
    this.anchors.bench = new THREE.Vector3(12, 2, 42.5);

    // press box: a lit glass gallery in the middle tier
    const press = new THREE.Mesh(new THREE.BoxGeometry(30, 3.2, 1.2), new THREE.MeshStandardMaterial({ color: '#0b1520', emissive: '#ffd9a0', emissiveIntensity: 0.0, roughness: 0.2, metalness: 0.4 }));
    press.position.set(0, 27.1, -(BOWL.B + 28.5));
    this.pressMat = press.material;
    this.scene.add(press);
    const pressFrame = new THREE.LineSegments(new THREE.EdgesGeometry(press.geometry), new THREE.LineBasicMaterial({ color: LIME }));
    pressFrame.position.copy(press.position);
    this.scene.add(pressFrame);
    this.anchors.contact = press.position.clone();
  }

  buildBall() {
    const tex = canvasTex(512, 256, (x, w, h) => {
      x.fillStyle = '#f7f7f7'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#111';
      for (let j = 0; j < 5; j++) for (let i = 0; i < 10; i++) {
        const cx = (i + (j % 2) * 0.5) * (w / 10), cy = (j + 0.5) * (h / 5);
        x.beginPath();
        for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU - Math.PI / 2; x.lineTo(cx + Math.cos(a) * 15, cy + Math.sin(a) * 15 * 1.6 * (1 - Math.abs(j - 2) * 0.15)); }
        x.fill();
      }
    });
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.45, 32, 16), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, emissive: '#ffffff', emissiveIntensity: 0.08 }));
    this.ball.position.set(0, 0.45, 0);
    this.scene.add(this.ball);
    this.ballShadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false }));
    this.ballShadow.rotation.x = -Math.PI / 2; this.ballShadow.position.y = 0.02;
    this.scene.add(this.ballShadow);
  }

  buildTrophy() {
    const gold = new THREE.MeshStandardMaterial({ color: '#f3c75a', metalness: 1, roughness: 0.22, emissive: '#5a3a00', emissiveIntensity: 0.4, envMap: this.envTex, envMapIntensity: 1.4 });
    const prof = [[0, 0], [0.62, 0], [0.62, 0.12], [0.45, 0.2], [0.42, 0.5], [0.18, 0.62], [0.12, 0.95], [0.16, 1.05], [0.5, 1.25], [0.62, 1.7], [0.6, 2.05], [0.55, 2.05], [0.5, 1.75], [0.0, 1.55]];
    const cup = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 48), gold);
    const t = new THREE.Group();
    t.add(cup);
    for (const s of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.045, 10, 24, Math.PI * 1.2), gold);
      h.position.set(0.66 * s, 1.55, 0); h.rotation.z = s > 0 ? -Math.PI * 0.6 : Math.PI * 1.6; t.add(h);
    }
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.05, 1, 6), new THREE.MeshStandardMaterial({ color: '#0b0f16', metalness: 0.6, roughness: 0.3 }));
    plinth.position.y = -0.5;
    t.add(plinth);
    const halo = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.5, 64), new THREE.MeshBasicMaterial({ color: '#f3c75a', toneMapped: false, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = -0.98;
    t.add(halo);
    t.position.set(0, -2.2, 0); // hidden under the centre spot until called
    t.scale.setScalar(1.2);
    this.trophy = t;
    this.scene.add(t);
    this.anchors.honours = new THREE.Vector3(0, 2.2, 0);
  }

  buildScreen() {
    const c = document.createElement('canvas');
    c.width = 1400; c.height = 600;
    this.screenCanvas = c;
    this.screenTex = new THREE.CanvasTexture(c);
    this.screenTex.colorSpace = THREE.SRGBColorSpace;
    const g = new THREE.Group();
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(28, 12), new THREE.MeshBasicMaterial({ map: this.screenTex, toneMapped: false }));
    const frame = new THREE.Mesh(new THREE.BoxGeometry(29.2, 13.2, 0.8), new THREE.MeshStandardMaterial({ color: '#0a0d12', metalness: 0.7, roughness: 0.4 }));
    frame.position.z = -0.45;
    g.add(frame, scr);
    for (const s of [-1, 1]) {
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 10), new THREE.MeshBasicMaterial({ color: '#222' }));
      cable.position.set(12 * s, 11, -0.4); g.add(cable);
    }
    g.position.set(-80, 34, 0);
    g.rotation.y = Math.PI / 2;
    g.rotation.x = 0;
    this.scene.add(g);
    // second screen at the far end
    const g2 = g.clone();
    g2.position.set(80, 34, 0); g2.rotation.y = -Math.PI / 2;
    this.scene.add(g2);
    this.anchors.skills = new THREE.Vector3(-80, 34, 0);
    this.drawScreen('board');
  }

  drawScreen(mode, data = {}) {
    const x = this.screenCanvas.getContext('2d'), w = 1400, h = 600;
    const bg = x.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0a1020'); bg.addColorStop(1, '#03050a');
    x.fillStyle = bg; x.fillRect(0, 0, w, h);
    // LED pixel grid
    x.fillStyle = 'rgba(255,255,255,0.025)';
    for (let i = 0; i < w; i += 6) x.fillRect(i, 0, 1, h);
    for (let j = 0; j < h; j += 6) x.fillRect(0, j, w, 1);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    if (mode === 'resume') {
      x.fillStyle = '#1e78c8'; x.fillRect(0, 0, w, 90);
      x.fillStyle = '#fff'; x.font = '800 52px Archivo, Arial, sans-serif';
      x.fillText('THE CONTRACT · RÉSUMÉ', w / 2, 47);
      x.textAlign = 'left';
      x.fillStyle = '#ffffff'; x.font = '900 96px Archivo, Arial, sans-serif'; x.fillText('SWAYAM PANCHAL', 70, 190);
      x.fillStyle = '#62c8ff'; x.font = '600 34px "JetBrains Mono", monospace'; x.fillText('AI & DATA SCIENCE · DJSCE · CGPA 9.70', 74, 262);
      const lines = ['Hackathon & ideathon winner', 'AI Data Analyst · InAmigos Foundation', 'Secretary · DJS NSDC × Infomatrix', 'Python · ML · DL · NLP · SQL · React'];
      x.font = '500 34px Inter, Arial, sans-serif';
      lines.forEach((l, i) => { x.fillStyle = '#d4ff3a'; x.fillRect(74, 324 + i * 58, 14, 14); x.fillStyle = '#dfe6ef'; x.fillText(l, 108, 332 + i * 58); });
      x.textAlign = 'center';
      x.fillStyle = '#d4ff3a'; x.fillRect(0, h - 16, w, 16);
    } else if (mode === 'goal') {
      x.fillStyle = '#d4ff3a';
      x.font = '900 320px Archivo, Arial, sans-serif';
      x.fillText('GOAL!', w / 2, h / 2 - 20);
      x.fillStyle = '#fff'; x.font = '600 48px "JetBrains Mono", monospace';
      x.fillText('SDP42 1 – 0 BUGS', w / 2, h - 70);
    } else {
      x.fillStyle = '#1e78c8'; x.fillRect(0, 0, w, 90);
      x.fillStyle = '#fff'; x.font = '800 52px Archivo, Arial, sans-serif';
      x.fillText(mode === 'skills' ? 'MATCH STATS · SWAYAM PANCHAL' : 'SDP42 FC · MATCHDAY', w / 2, 47);
      const stats = data.stats || [['9.70', 'CGPA'], ['5×', 'HACKATHONS'], ['11', 'STARTING XI'], ['53', 'REPOS']];
      stats.forEach(([v, l], i) => {
        const cx = (w / stats.length) * (i + 0.5);
        x.fillStyle = i % 2 ? '#ffffff' : '#d4ff3a';
        x.font = '900 170px Archivo, Arial, sans-serif';
        x.fillText(v, cx, 290);
        x.fillStyle = '#8a97ad'; x.font = '600 34px "JetBrains Mono", monospace';
        x.fillText(l, cx, 430);
      });
      x.fillStyle = '#d4ff3a'; x.fillRect(0, h - 16, w, 16);
    }
    this.screenTex.needsUpdate = true;
  }

  buildConfetti() {
    const n = this.mobile ? 700 : 1800;
    this.confN = n;
    this.confVel = new Float32Array(n * 3);
    const pos = new Float32Array(n * 3).fill(-999);
    const col = new Float32Array(n * 3);
    const pal = ['#7fd4ff', '#ffffff', '#d4ff3a', '#3a9dff', '#f3c75a'].map((h) => new THREE.Color(h));
    for (let i = 0; i < n; i++) { const c = pal[i % pal.length]; col.set([c.r * 2, c.g * 2, c.b * 2], i * 3); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.confetti = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.5, vertexColors: true, transparent: true, depthWrite: false, toneMapped: false }));
    this.confetti.frustumCulled = false;
    this.confLife = 0;
    this.scene.add(this.confetti);
  }

  buildFireworks() {
    const n = this.mobile ? 1200 : 2600;
    this.fwN = n;
    this.fwVel = new Float32Array(n * 3);
    this.fwNext = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3).fill(-9999), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('life', new THREE.BufferAttribute(new Float32Array(n), 1));
    this.fireworks = new THREE.Points(g, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec3 color; attribute float life; varying vec3 vC; varying float vL;
        void main(){ vC = color; vL = life; vec4 mv = modelViewMatrix*vec4(position,1.);
          gl_Position = projectionMatrix*mv; gl_PointSize = (1.2 + life*2.2) * 300. / -mv.z; }`,
      fragmentShader: `varying vec3 vC; varying float vL;
        void main(){ vec2 q = gl_PointCoord-.5; float d = dot(q,q); if (d > .25 || vL <= 0.) discard;
          gl_FragColor = vec4(vC * 3. * vL * (1. - d*3.), 1.); }`,
    }));
    this.fireworks.frustumCulled = false;
    this.scene.add(this.fireworks);
  }

  // Shells burst above the roof ring, one after another.
  launchFireworks(count = 10, palette = ['#7fd4ff', '#ffffff', '#d4ff3a', '#3a9dff', '#f3c75a']) {
    for (let k = 0; k < count; k++) {
      setTimeout(() => {
        const t = Math.random() * TAU;
        const [x, z] = se(t, ROOF_OPEN.A + 8, ROOF_OPEN.B + 8, ROOF_OPEN.n);
        const o = new THREE.Vector3(x * 0.8, 70 + Math.random() * 30, z * 0.8);
        const col = new THREE.Color(palette[k % palette.length]);
        const per = Math.floor(this.fwN / 12);
        const p = this.fireworks.geometry.attributes.position.array;
        const c = this.fireworks.geometry.attributes.color.array;
        const l = this.fireworks.geometry.attributes.life.array;
        const speed = 14 + Math.random() * 10;
        for (let i = 0; i < per; i++) {
          const j = this.fwNext; this.fwNext = (this.fwNext + 1) % this.fwN;
          const v = new THREE.Vector3().randomDirection().multiplyScalar(speed * (0.85 + Math.random() * 0.15));
          p.set([o.x, o.y, o.z], j * 3);
          this.fwVel.set([v.x, v.y, v.z], j * 3);
          c.set([col.r, col.g, col.b], j * 3);
          l[j] = 1 + Math.random() * 0.4;
        }
        this.onFirework?.();
      }, k * 260 + Math.random() * 180);
    }
  }

  burstConfetti(origin) {
    const p = this.confetti.geometry.attributes.position.array;
    for (let i = 0; i < this.confN; i++) {
      p.set([origin.x + (Math.random() - 0.5) * 4, origin.y + Math.random() * 2, origin.z + (Math.random() - 0.5) * 8], i * 3);
      const v = new THREE.Vector3().randomDirection();
      v.y = Math.abs(v.y) * 1.6 + 0.4;
      v.multiplyScalar(10 + Math.random() * 18);
      this.confVel.set([v.x - 6, v.y, v.z], i * 3);
    }
    this.confetti.geometry.attributes.position.needsUpdate = true;
    this.confLife = 6;
  }

  // ---------------------------------------------------------------- players
  addPlayers(squad) {
    this.match = new Match(this, squad);
    const numTex = (no, pos, gold) => canvasTex(256, 256, (x, w, h) => {
      x.clearRect(0, 0, w, h);
      x.fillStyle = 'rgba(5,8,13,0.85)'; x.beginPath(); x.arc(w / 2, h / 2, 118, 0, TAU); x.fill();
      x.lineWidth = 8; x.strokeStyle = gold ? '#f3c75a' : '#7fd4ff'; x.stroke();
      x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = '900 120px Archivo, Arial, sans-serif'; x.fillText(no, w / 2, h / 2 - 8);
      x.fillStyle = gold ? '#f3c75a' : '#7fd4ff'; x.font = '600 34px "JetBrains Mono", monospace'; x.fillText(gold ? 'C · ' + pos : pos, w / 2, h / 2 + 72);
    });
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    this.match.players.forEach((a, i) => {
      const p = a.data, gold = !!p.captain;
      const col = gold ? new THREE.Color('#f3c75a') : new THREE.Color('#7fd4ff');
      // markers live in a group that follows the player but does not rotate with them
      const g = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.62, 64), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.6, side: THREE.DoubleSide, toneMapped: false, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; g.add(ring);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: numTex(p.no, p.pos, gold), transparent: true, depthWrite: false }));
      sprite.scale.setScalar(gold ? 3 : 2.4); sprite.position.y = 4.6; sprite.renderOrder = 10;
      g.add(sprite);
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 8), hitMat);
      hit.position.y = 3; hit.userData.index = i; g.add(hit);
      this.scene.add(g);
      Object.assign(a, { marker: g, ring, sprite, hit });
    });
    this.players = this.match.players;
    this.hitTargets = this.players.map((p) => p.hit);
  }

  setActivePlayer(i) { this.activePlayer = i; this.match.setActive(i); }
  setHover(i) { this.hoverPlayer = i; this.match.hover = i >= 0 ? this.players[i] : null; }

  pickPlayer(nx, ny) {
    this.raycaster.setFromCamera({ x: nx, y: ny }, this.camera);
    const hit = this.raycaster.intersectObjects(this.hitTargets, false)[0];
    return hit ? hit.object.userData.index : -1;
  }

  // ---------------------------------------------------------------- post
  buildPost() {
    const r = this.renderer;
    // multisampled HDR target so edges stay anti-aliased through bloom/post
    const rt = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { type: THREE.HalfFloatType, samples: this.mobile ? 0 : 2 });
    this.composer = new EffectComposer(r, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.5, 0.42, 0.84);
    this.composer.addPass(this.bloom);
    this.fx = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uAmt: { value: 0 }, uVig: { value: 1 }, uFlash: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uAmt, uVig, uFlash; varying vec2 vUv;
        void main(){
          vec2 c = vUv - .5; float d = length(c);
          // chromatic split only while the camera is moving
          vec3 col;
          if (uAmt > .45) {
            vec2 dir = c * (uAmt - .45) * 0.014 * d;
            col = vec3(texture2D(tDiffuse, vUv + dir).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - dir).b);
          } else col = texture2D(tDiffuse, vUv).rgb;
          col *= 1. - smoothstep(.55, 1.1, d) * .55 * uVig;
          col += uFlash;
          gl_FragColor = vec4(col, 1.);
        }`,
    });
    this.composer.addPass(this.fx);
    this.composer.addPass(new OutputPass());
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    if (!w || !h) return; // hidden tab / collapsed pane
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.bloom.setSize(w / 2, h / 2); // quarter-resolution glow
    this.camera.aspect = w / h;
    // keep framing on portrait screens by widening the lens
    this.aspectFov = w / h < 1 ? 1 + (1 - w / h) * 0.55 : 1;
    this.camera.updateProjectionMatrix();
      }

  // ---------------------------------------------------------------- camera
  // Fly the camera along a swooping curve. Returns a promise.
  flyTo({ pos, target, fov = 42, duration, lift, orbit = 0, drift = 1, ease = 'power2.inOut' }) {
    const r = this.rig;
    const p0 = r.pos.clone(), t0 = r.target.clone(), f0 = r.fov;
    const p2 = new THREE.Vector3(...pos), t2 = new THREE.Vector3(...target);
    const dist = p0.distanceTo(p2);
    const dur = duration ?? THREE.MathUtils.clamp(1.7 + dist / 110, 1.9, 3.6);
    // control point: lift over the action; when crossing the shell go over the roof
    const inside = (v) => Math.abs(v.x) < 100 && Math.abs(v.z) < 85 && v.y < 52;
    const ctrl = p0.clone().lerp(p2, 0.5);
    const crossing = inside(p0) !== inside(p2);
    ctrl.y += lift ?? (crossing ? Math.max(70, dist * 0.35) : Math.min(28, dist * 0.22));
    if (crossing) ctrl.y = Math.max(ctrl.y, 95);
    if (!crossing && inside(p0)) ctrl.y = Math.min(ctrl.y, 44);
    r.orbit = 0;
    if (this.flight) this.flight.kill();
    const s = { t: 0 };
    // ease the yaw/pitch nudges back to zero
    r.yawTarget = 0; r.pitchTarget = 0;
    return new Promise((res) => {
      this.flight = gsap.to(s, {
        t: 1, duration: dur, ease,
        onUpdate: () => {
          const t = s.t, a = 1 - t;
          r.pos.set(
            a * a * p0.x + 2 * a * t * ctrl.x + t * t * p2.x,
            a * a * p0.y + 2 * a * t * ctrl.y + t * t * p2.y,
            a * a * p0.z + 2 * a * t * ctrl.z + t * t * p2.z
          );
          const tt = gsap.parseEase('power2.inOut')(t);
          r.target.lerpVectors(t0, t2, tt);
          r.fov = f0 + (fov - f0) * tt + Math.sin(t * Math.PI) * (crossing ? 9 : 4);
          r.drift = drift * t;
        },
        onComplete: () => { r.orbit = orbit; this.flight = null; res(); },
      });
    });
  }

  setShell(colA, colB = colA, chase = 0, power = 1) {
    gsap.to(this.shellColor.a, { r: new THREE.Color(colA).r, g: new THREE.Color(colA).g, b: new THREE.Color(colA).b, duration: 1.2 });
    gsap.to(this.shellColor.b, { r: new THREE.Color(colB).r, g: new THREE.Color(colB).g, b: new THREE.Color(colB).b, duration: 1.2 });
    gsap.to(this.shellMat.uniforms.uChase, { value: chase, duration: 1.2 });
    gsap.to(this.roofMat.uniforms.uChase, { value: chase, duration: 1.2 });
    gsap.to(this.shellMat.uniforms.uPower, { value: power, duration: 1.2 });
    gsap.to(this.roofMat.uniforms.uPower, { value: power, duration: 1.2 });
  }

  keyLevel() { return (this._key || 1.8) * (this.raining ? 0.55 : 1); }

  // Day ↔ night: sky, sun, fog, exposure, bloom, stars and every light crossfade.
  setDay(on, duration = 2.4) { this.setTime(on ? 'day' : 'night', duration); }

  // Day / golden hour / night: sky, sun, fog, exposure, bloom, stars and lights crossfade.
  setTime(mode, duration = 2.4) {
    const P = {
      day:   { day: 1,    dusk: 0, sun: '#fff1dc', key: 2.6, pos: this.sunDir.clone().multiplyScalar(150), fill: 0.9, hemi: 0.6, fog: '#bcd6ec', dens: 0.00055, exp: 0.82, bloom: 0, stars: 0 },
      dusk:  { day: 0.55, dusk: 1, sun: '#ffb27a', key: 2.1, pos: new THREE.Vector3(150, 26, 70), fill: 0.7, hemi: 0.5, fog: '#7a5a66', dens: 0.0008, exp: 0.95, bloom: 0.4, stars: 0.25 },
      night: { day: 0,    dusk: 0, sun: '#f3f6ff', key: 1.8, pos: new THREE.Vector3(30, 120, 40), fill: 1.1, hemi: 0.7, fog: '#05080d', dens: 0.0011, exp: 1.05, bloom: 0.5, stars: 0.85 },
    }[mode];
    this.timeMode = mode;
    this.isDay = mode !== 'night';
    this._key = P.key;
    const U = this.uniforms;
    gsap.to(U.uDay, { value: P.day, duration, ease: 'power2.inOut' });
    gsap.to(U.uDusk, { value: P.dusk, duration, ease: 'power2.inOut' });
    if (U.uLights.value > 0.5) gsap.to(this.sun, { intensity: P.key * (1 - U.uRain.value * 0.45), duration });
    const sc = new THREE.Color(P.sun);
    gsap.to(this.sun.color, { r: sc.r, g: sc.g, b: sc.b, duration });
    gsap.to(this.sun.position, { x: P.pos.x, y: P.pos.y, z: P.pos.z, duration });
    const sd = mode === 'dusk' ? P.pos.clone().normalize() : new THREE.Vector3(0.55, 0.62, 0.35).normalize();
    gsap.to(this.sunDir, { x: sd.x, y: sd.y, z: sd.z, duration });
    gsap.to(this.fill, { intensity: P.fill, duration });
    gsap.to(this.pitchLights, { intensity: P.hemi, duration });
    this._fog = new THREE.Color(P.fog); this._dens = P.dens;
    this.applyFog(duration);
    gsap.to(this.renderer, { toneMappingExposure: P.exp, duration });
    gsap.to(this.bloom, { strength: P.bloom, duration });
    gsap.to(this.stars.material, { opacity: P.stars * (1 - U.uRain.value), duration });
  }

  applyFog(duration) {
    const r = this.uniforms.uRain.value > 0.5 || this.raining;
    const c = (this._fog || new THREE.Color('#05080d')).clone().lerp(new THREE.Color(this.isDay ? '#9aa3ad' : '#0b0e14'), r ? 0.6 : 0);
    gsap.to(this.scene.fog.color, { r: c.r, g: c.g, b: c.b, duration });
    gsap.to(this.scene.fog, { density: (this._dens || 0.0011) * (r ? 2.4 : 1), duration });
  }

  // Rain: falling streaks around the camera, overcast sky, wet glossy pitch.
  setRain(on, duration = 2) {
    this.raining = on;
    this.rain.visible = true;
    gsap.to(this.uniforms.uRain, { value: on ? 1 : 0, duration, onComplete: () => { if (!on) this.rain.visible = false; } });
    gsap.to(this.stars.material, { opacity: on || this.isDay ? 0 : 0.85, duration });
    if (this.uniforms.uLights.value > 0.5) gsap.to(this.sun, { intensity: (this._key || 1.8) * (on ? 0.55 : 1), duration });
    this.applyFog(duration);
  }

  buildRain() {
    const N = this.mobile ? 1500 : 3500;
    const seed = new Float32Array(N * 2 * 3), end = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      const sx = Math.random(), sy = Math.random(), sz = Math.random();
      seed.set([sx, sy, sz, sx, sy, sz], i * 6);
      end.set([0, 1], i * 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3));
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 3));
    g.setAttribute('endp', new THREE.BufferAttribute(end, 1));
    this.rain = new THREE.LineSegments(g, new THREE.ShaderMaterial({
      uniforms: this.uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec3 seed; attribute float endp; uniform vec3 uCam; uniform float uTime, uRain, uDay, uLights; varying float vA;
        void main(){
          float B = 110.;
          vec3 p;
          p.xz = uCam.xz + mod(seed.xz * B - uCam.xz, B) - B * .5;
          float fall = 34. + seed.x * 10.;
          p.y = mod(seed.y * 120. - uTime * fall, 120.) + max(uCam.y - 70., 0.);
          vec3 vel = vec3(-3.5, -fall, 1.5) / fall;
          p += vel * endp * -1.1;
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_Position = projectionMatrix * mv;
          float dist = -mv.z;
          vA = uRain * (.35 + .35 * uLights * (1. - uDay)) * smoothstep(2., 8., dist) * (1. - smoothstep(60., 110., dist)) * (1. - endp * .7);
        }`,
      fragmentShader: `varying float vA; void main(){ gl_FragColor = vec4(vec3(.75, .82, .95) * vA, 1.); }`,
    }));
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    this.scene.add(this.rain);
  }

  // Floodlights warm up sector by sector, then the shell glows.
  lightsOn() {
    const tl = gsap.timeline();
    tl.to(this.uniforms.uLights, { value: 1, duration: 2.6, ease: 'steps(8)' }, 0)
      .to(this.sun, { intensity: this.keyLevel(), duration: 2.6, ease: 'steps(8)' }, 0)
      .to(this.fill, { intensity: 1.1, duration: 2.6, ease: 'steps(8)' }, 0)
      .to(this.pitchLights, { intensity: 0.7, duration: 2.6 }, 0)
      .to(this.pressMat, { emissiveIntensity: 1.6, duration: 1 }, 1.5)
      .to(this.shellMat.uniforms.uPower, { value: 1, duration: 1.4, ease: 'power2.out' }, 1.8)
      .to(this.roofMat.uniforms.uPower, { value: 1, duration: 1.4 }, 1.8)
      .to(this.uniforms.uWave, { value: 2, duration: 7, ease: 'none' }, 2.5);
    return tl;
  }

  // ---------------------------------------------------------------- ball
  // ball + match API (the Match owns the physics)
  passTo(i) { return this.match.passTo(i); }
  giveBall(i) { this.match.giveBall(this.players[i]); }
  resetBall(at = [0, 0]) { this.match.placeBall(at[0], at[1]); }

  // Striker shoots: top corner, net bulges, confetti, camera shake.
  async shoot() {
    const end = await this.match.shootGoal();
    this.celebrateGoal(end);
  }

  celebrateGoal(at) {
    this.netBulge = 1;
    this.netHit = at.clone();
    this.rig.shake = 1.2;
    this.burstConfetti(new THREE.Vector3(46, 2, 0));
    gsap.fromTo(this.fx.uniforms.uFlash, { value: 0.35 }, { value: 0, duration: 0.8 });
    gsap.to(this.uniforms.uHype, { value: 1, duration: 0.3 });
    gsap.to(this.uniforms.uHype, { value: 0, duration: 3, delay: 6 });
    gsap.fromTo(this.uniforms.uWave, { value: 0 }, { value: 3, duration: 6, ease: 'none' });
    this.drawScreen('goal');
  }

  startWave() {
    gsap.to(this.uniforms.uWave, { value: this.uniforms.uWave.value + 2, duration: 7, ease: 'none' });
    gsap.to(this.uniforms.uHype, { value: 0.5, duration: 0.5 });
    gsap.to(this.uniforms.uHype, { value: 0, duration: 2, delay: 6 });
  }

  // penalty shootout
  penaltySetup() { this.match.penaltySetup(); }
  penaltyEnd() { this.match.penaltyEnd(); }
  penaltyReset() { this.match.penaltyReset(); }
  async penaltyKick(aim) {
    const r = await this.match.penaltyKick(aim);
    if (r === 'goal') {
      this.netBulge = 0.8; this.netHit = aim.clone(); this.rig.shake = 0.6;
      gsap.to(this.uniforms.uHype, { value: 0.8, duration: 0.2 });
      gsap.to(this.uniforms.uHype, { value: 0, duration: 2, delay: 2.5 });
    }
    return r;
  }
  // mouse → point on the goal plane (x = 52.5)
  aimAt(nx, ny) {
    this.raycaster.setFromCamera({ x: nx, y: ny }, this.camera);
    const r = this.raycaster.ray;
    if (Math.abs(r.direction.x) < 1e-4) return null;
    const t = (52.5 - r.origin.x) / r.direction.x;
    if (t <= 0) return null;
    const p = r.origin.clone().addScaledVector(r.direction, t);
    p.y = THREE.MathUtils.clamp(p.y, 0.25, 3.2); p.z = THREE.MathUtils.clamp(p.z, -5.5, 5.5);
    return p;
  }

  // Captain moment: the floodlights dim and a single spotlight finds the player.
  spotlight(at) {
    const on = !!at;
    if (on) {
      const top = new THREE.Vector3(at[0] + 10, 48, at[1] - 6), foot = new THREE.Vector3(at[0], 0, at[1]);
      this.spotBeam.position.copy(top).lerp(foot, 0.5);
      this.spotBeam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(foot).normalize());
      this.spotBeam.scale.set(1, top.distanceTo(foot) / 48, 1);
      this.spotBeam.visible = true;
      this.pitchMat.uniforms.uSpot.value.x = at[0]; this.pitchMat.uniforms.uSpot.value.y = at[1];
    }
    const dim = on ? 0.6 : 1, d = on ? 0.6 : 0;
    gsap.to(this.pitchMat.uniforms.uSpot.value, { z: on ? 1 : 0, duration: 1.2, delay: d });
    gsap.to(this.spotBeam.material.uniforms.uA, { value: on ? 1 : 0, duration: 1, delay: d, onComplete: () => { if (!on) this.spotBeam.visible = false; } });
    gsap.to(this.sun, { intensity: this.uniforms.uLights.value ? this.keyLevel() * dim : 0, duration: 1.2, delay: d });
    gsap.to(this.fill, { intensity: this.uniforms.uLights.value ? 1.1 * dim : 0, duration: 1.2, delay: d });
    for (const m of [this.lightRing.material, this.glare.material]) gsap.to(m.uniforms.uDim, { value: on ? 0.35 : 1, duration: 1.2, delay: d });
    gsap.to(this.uniforms.uHype, { value: on ? 0.35 : 0, duration: 1 });
  }

  showTrophy(on) {
    gsap.to(this.trophy.position, { y: on ? 1.0 : -2.2, duration: on ? 1.6 : 0.8, ease: on ? 'back.out(1.6)' : 'power2.in' });
  }

  // ---------------------------------------------------------------- util
  project(v) {
    const p = v.clone().project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * window.innerWidth, y: (-p.y * 0.5 + 0.5) * window.innerHeight, behind: p.z > 1 };
  }

  setMouse(nx, ny) { this.mouse.set(nx, ny); }
  nudge(dx, dy) { this.rig.yawTarget = THREE.MathUtils.clamp(this.rig.yawTarget + dx, -1.2, 1.2); this.rig.pitchTarget = THREE.MathUtils.clamp(this.rig.pitchTarget + dy, -0.25, 0.3); }

  // ---------------------------------------------------------------- frame
  update() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt;
    const t = this.time;
    const U = this.uniforms;
    U.uTime.value = t;
    if (U.uWave.value > 1) U.uWave.value -= 0; // keeps phase continuity (fract in shader)

    // camera rig: base pose + orbit + drag + mouse parallax + breathing + shake
    const r = this.rig;
    if (r.orbit) {
      // orbit pos and target together round the stadium axis so framing holds
      const yAxis = new THREE.Vector3(0, 1, 0);
      r.pos.applyAxisAngle(yAxis, r.orbit * dt);
      r.target.applyAxisAngle(yAxis, r.orbit * dt);
    }
    r.yaw += (r.yawTarget - r.yaw) * Math.min(1, dt * 4);
    r.pitch += (r.pitchTarget - r.pitch) * Math.min(1, dt * 4);
    if (!this.dragging) { r.yawTarget *= 1 - dt * 0.35; r.pitchTarget *= 1 - dt * 0.35; }
    this.mouseEase.lerp(this.mouse, Math.min(1, dt * 3));

    const off = r.pos.clone().sub(r.target);
    off.applyAxisAngle(new THREE.Vector3(0, 1, 0), r.yaw - this.mouseEase.x * 0.06 * r.drift);
    const len = off.length();
    off.y += (r.pitch + this.mouseEase.y * 0.03 * r.drift) * len;
    const cam = this.camera;
    // critically-damped follow: the rendered camera glides after the rig
    const want = r.target.clone().add(off);
    want.x += Math.sin(t * 0.31) * 0.6 * r.drift;
    want.y += Math.sin(t * 0.47) * 0.35 * r.drift;
    const k = 1 - Math.exp(-dt * 4.5);
    if (!this.smoothPos) { this.smoothPos = want.clone(); this.smoothTarget = r.target.clone(); }
    this.smoothPos.lerp(want, k);
    this.smoothTarget.lerp(r.target, k);
    cam.position.copy(this.smoothPos);
    if (r.shake > 0) {
      r.shake = Math.max(0, r.shake - dt * 1.4);
      const k = r.shake * r.shake;
      cam.position.add(new THREE.Vector3((Math.random() - 0.5) * k, (Math.random() - 0.5) * k, (Math.random() - 0.5) * k));
    }
    cam.lookAt(this.smoothTarget);
    cam.fov = r.fov * this.aspectFov;
    cam.updateProjectionMatrix();
    U.uCam.value.copy(cam.position);

    // speed → chromatic / radial blur
    const v = cam.position.distanceTo(this.prevCam) / Math.max(dt, 1e-3);
    this.prevCam.copy(cam.position);
    this.speed += (Math.min(v / 90, 1.6) - this.speed) * Math.min(1, dt * 6);
    this.fx.uniforms.uAmt.value = this.speed + r.shake * 0.6;

    // shell colour
    for (const m of [this.shellMat, this.roofMat]) { m.uniforms.uA.value.copy(this.shellColor.a); m.uniforms.uB.value.copy(this.shellColor.b); }

    // LED boards scroll
    this.boardTexes.forEach((tx, i) => { tx.offset.x = (t * (0.04 + U.uHype.value * 0.25)) * (i % 2 ? -1 : 1); });

    // live match + markers following each player
    this.match.update(dt);
    this.players.forEach((p, i) => {
      p.marker.position.set(p.pos.x, 0, p.pos.z);
      const s = 1 + p.hover * 0.15 + Math.sin(t * 3 + i) * 0.04 * (1 + p.active);
      p.ring.scale.setScalar(s + p.active * 0.35);
      p.ring.material.opacity = 0.3 + p.active * 0.5 + p.hover * 0.3;
      p.sprite.material.opacity = (this.match.mode === 'penalty' ? 0 : 1) * (1 - p.active) * (0.6 + p.hover * 0.4);
      p.ring.visible = this.match.mode !== 'penalty';
    });

    // ball shadow + trail
    this.ballShadow.position.set(this.ball.position.x, 0.02, this.ball.position.z);
    this.ballShadow.material.opacity = 0.45 / (1 + this.ball.position.y * 0.3);

    // net bulge
    if (this.netBulge > 0.001) {
      this.netBulge *= 1 - dt * 2.2;
      const a = this.netLines.geometry.attributes.position.array;
      for (let i = 0; i < a.length; i += 3) {
        const bx = this.netBase[i], by = this.netBase[i + 1], bz = this.netBase[i + 2];
        if (bx < 50) continue;
        const d = Math.hypot(by - this.netHit.y, bz - this.netHit.z);
        a[i] = bx + Math.exp(-d * d * 0.5) * this.netBulge * 1.4 * Math.cos(t * 30) ** 2 * ((bx - 52.5) / 2.2);
      }
      this.netLines.geometry.attributes.position.needsUpdate = true;
    }

    // confetti physics
    if (this.confLife > 0) {
      this.confLife -= dt;
      const p = this.confetti.geometry.attributes.position.array, vv = this.confVel;
      for (let i = 0; i < p.length; i += 3) {
        vv[i + 1] -= 14 * dt; vv[i] *= 1 - dt * 0.6; vv[i + 2] *= 1 - dt * 0.6;
        if (vv[i + 1] < -4) vv[i + 1] = -4 + Math.sin(t * 5 + i) * 0.5;
        p[i] += vv[i] * dt; p[i + 1] = Math.max(0.05, p[i + 1] + vv[i + 1] * dt); p[i + 2] += vv[i + 2] * dt + Math.sin(t * 4 + i) * 0.02;
      }
      this.confetti.geometry.attributes.position.needsUpdate = true;
      this.confetti.material.opacity = Math.min(1, this.confLife);
    }

    // fireworks physics
    {
      const p = this.fireworks.geometry.attributes.position.array, l = this.fireworks.geometry.attributes.life.array, v = this.fwVel;
      let alive = false;
      for (let j = 0; j < this.fwN; j++) {
        if (l[j] <= 0) continue;
        alive = true;
        const i = j * 3;
        v[i] *= 1 - dt * 1.4; v[i + 1] = v[i + 1] * (1 - dt * 1.4) - 9 * dt; v[i + 2] *= 1 - dt * 1.4;
        p[i] += v[i] * dt; p[i + 1] += v[i + 1] * dt; p[i + 2] += v[i + 2] * dt;
        l[j] -= dt * 0.55;
      }
      if (alive || this.fwWasAlive) {
        this.fireworks.geometry.attributes.position.needsUpdate = true;
        this.fireworks.geometry.attributes.life.needsUpdate = true;
      }
      this.fwWasAlive = alive;
    }

    // mast beacons blink
    const blink = Math.sin(t * 3.2) > 0.6 ? 1 : 0.15;
    this.aviation?.forEach((b) => { b.material.color.setRGB(blink, 0.08 * blink, 0.08 * blink); });

    // flags flutter
    this.flags?.forEach((f, i) => { f.rotation.y = Math.sin(t * 3 + i) * 0.4; });

    // trophy spin
    this.trophy.rotation.y += dt * 0.5;

    this.bloom.enabled = !this.bloomOff && this.bloom.strength > 0.02;
    this.adaptQuality(dt);
    this.composer.render();
  }

  // Keep motion fluid: if frames run long, shed cost step by step.
  adaptQuality(dt) {
    const q = (this.quality ||= { n: 0, sum: 0, level: 3, wait: 2.5 });
    if (q.level === 0) return;
    if (q.wait > 0) { q.wait -= dt; return; }
    q.sum += dt; q.n++;
    if (q.n < 40) return;
    const avg = q.sum / q.n;
    q.n = 0; q.sum = 0;
    if (avg < 1 / 50) return;
    q.wait = 0.6;
    if (q.level === 3) {               // drop anti-aliasing and glow resolution first
      for (const t of [this.composer.renderTarget1, this.composer.renderTarget2]) { t.samples = 0; t.dispose(); }
    } else if (q.level === 2) {        // then render resolution
      this.renderer.setPixelRatio(Math.min(1, window.devicePixelRatio));
      this.resize();
    } else {                           // last resort: no glow, half the crowd
      this.bloomOff = true;
      this.crowd.count = Math.floor(this.crowd.count * 0.55);
    }
    q.level--;
  }
}
