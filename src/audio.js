// Stadium sound, synthesised with Web Audio: no audio files to load.
// Off until the visitor turns it on (browsers block autoplay anyway).
export class StadiumAudio {
  constructor() {
    this.on = false;
    this.ctx = null;
  }

  init() {
    if (this.ctx) return;
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    // 4 s of brown-ish noise, reused for crowd, whoosh and roar
    const len = ctx.sampleRate * 4;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04; d[i] = last * 3.2; }

    // crowd bed: two band-passed noise layers, slowly swelling
    this.crowd = ctx.createGain();
    this.crowd.gain.value = 0.32;
    this.crowd.connect(this.master);
    for (const [f, q, g] of [[420, 0.7, 0.9], [1300, 1.2, 0.35]]) {
      const src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      const gn = ctx.createGain(); gn.gain.value = g;
      src.connect(bp).connect(gn).connect(this.crowd);
      src.start(0, Math.random() * 3);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07 + Math.random() * 0.05;
      const lg = ctx.createGain(); lg.gain.value = g * 0.35;
      lfo.connect(lg).connect(gn.gain); lfo.start();
    }
  }

  toggle() {
    this.init();
    this.on = !this.on;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(this.on ? 0.9 : 0, this.ctx.currentTime + 0.6);
    return this.on;
  }

  _noise(dur, { type = 'bandpass', from = 300, to = 2400, q = 1.4, gain = 0.5, attack = 0.1 } = {}) {
    if (!this.on) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 2); src.stop(t + dur + 0.05);
  }

  whoosh(dur = 1.6) { this._noise(dur, { from: 200, to: 2600, q: 2.2, gain: 0.35, attack: dur * 0.55 }); }

  whistle(blasts = [0.18, 0.18, 0.7]) {
    if (!this.on) return;
    const ctx = this.ctx;
    let t = ctx.currentTime + 0.05;
    for (const len of blasts) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 2900;
      const vib = ctx.createOscillator(); vib.frequency.value = 38;
      const vg = ctx.createGain(); vg.gain.value = 140;
      vib.connect(vg).connect(o.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
      g.gain.setValueAtTime(0.16, t + len - 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(g).connect(this.master);
      o.start(t); vib.start(t); o.stop(t + len + 0.02); vib.stop(t + len + 0.02);
      t += len + 0.12;
    }
  }

  roar() {
    if (!this.on) return;
    const t = this.ctx.currentTime;
    this.crowd.gain.cancelScheduledValues(t);
    this.crowd.gain.setValueAtTime(this.crowd.gain.value, t);
    this.crowd.gain.linearRampToValueAtTime(1.6, t + 0.25);
    this.crowd.gain.linearRampToValueAtTime(0.32, t + 7);
    this._noise(4.5, { type: 'lowpass', from: 900, to: 3800, q: 0.4, gain: 0.9, attack: 0.15 });
  }

  boom() { this._noise(1.4, { type: 'lowpass', from: 500, to: 60, q: 0.8, gain: 0.7, attack: 0.01 }); }
}
