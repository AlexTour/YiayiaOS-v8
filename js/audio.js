// YiayiaOS sound — fully procedural WebAudio, no files needed.
// Optional real voice recordings: assets/voice/manifest.json (see README there).

let ctx = null, master, comp, reverbIn, dryBus, lowpass;
let noiseBuf = null;
let drone = null, glitch = null, shimmer = null, wind = null;
let muted = false;
let voiceManifest = {};
let voicePlaying = null;
let lastGlitchStep = 0;

const now = () => ctx.currentTime;

function makeNoise() {
  const len = ctx.sampleRate * 2;
  const b = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function makeImpulse(seconds = 3.2, decay = 2.6) {
  // A stone-church tail.
  const len = Math.floor(ctx.sampleRate * seconds);
  const b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return b;
}

function noiseSrc() {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf; s.loop = true;
  s.loopStart = Math.random(); // decorrelate
  return s;
}

function env(gainNode, t, a, peak, hold, rel) {
  const g = gainNode.gain;
  g.cancelScheduledValues(t);
  g.setValueAtTime(0.0001, t);
  g.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
  g.setValueAtTime(Math.max(peak, 0.0002), t + a + hold);
  g.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
}

function out(node, wet = 0.25) {
  node.connect(dryBus);
  if (wet > 0) {
    const w = ctx.createGain(); w.gain.value = wet;
    node.connect(w); w.connect(reverbIn);
  }
}

export async function init() {
  if (ctx) { if (ctx.state !== 'running') await ctx.resume().catch(() => {}); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  noiseBuf = makeNoise();

  master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9;
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 4;
  lowpass = ctx.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = 18000;
  dryBus = ctx.createGain();
  const rev = ctx.createConvolver(); rev.buffer = makeImpulse();
  reverbIn = ctx.createGain(); reverbIn.gain.value = 0.9;
  reverbIn.connect(rev); rev.connect(lowpass);
  dryBus.connect(lowpass); lowpass.connect(master); master.connect(comp); comp.connect(ctx.destination);

  buildDrone(); buildGlitch(); buildShimmer(); buildWind();
  loadVoices();
  if (ctx.state !== 'running') await ctx.resume().catch(() => {});
}

// ---------- continuous layers ----------
function buildDrone() {
  // Ison: a held low D, voiced through vowel formants like a chanter humming "o".
  const g = ctx.createGain(); g.gain.value = 0;
  const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 480; f1.Q.value = 5;
  const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 860; f2.Q.value = 7;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
  const oscs = [73.42, 73.42 * 1.004, 110.0, 146.83].map((f, i) => {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const og = ctx.createGain(); og.gain.value = [0.5, 0.4, 0.18, 0.08][i];
    o.connect(og); og.connect(f1); og.connect(f2); og.connect(lp); o.start(); return o;
  });
  const sum = ctx.createGain(); sum.gain.value = 0.6;
  f1.connect(sum); f2.connect(sum); lp.connect(sum);
  // breathing
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
  const lfoG = ctx.createGain(); lfoG.gain.value = 0.25; lfo.connect(lfoG); lfoG.connect(sum.gain); lfo.start();
  // vibrato that grows with the curse
  const vib = ctx.createOscillator(); vib.frequency.value = 5.5;
  const vibG = ctx.createGain(); vibG.gain.value = 0;
  vib.connect(vibG); oscs.forEach(o => vibG.connect(o.detune)); vib.start();
  // distortion path for curse
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 6); }
  shaper.curve = curve;
  const distG = ctx.createGain(); distG.gain.value = 0;
  sum.connect(g); sum.connect(shaper); shaper.connect(distG); distG.connect(g);
  out(g, 0.5);
  drone = { g, oscs, vibG, distG };
}

function buildGlitch() {
  const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 220;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 260;
  const g = ctx.createGain(); g.gain.value = 0;
  o.connect(hp); hp.connect(g); out(g, 0.1); o.start();
  glitch = { o, g };
}

function buildShimmer() {
  const g = ctx.createGain(); g.gain.value = 0;
  const trem = ctx.createOscillator(); trem.frequency.value = 6;
  const tremG = ctx.createGain(); tremG.gain.value = 0.4; trem.connect(tremG); trem.start();
  [1318.5, 1975.5, 2637].forEach((f) => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const og = ctx.createGain(); og.gain.value = 0.3; tremG.connect(og.gain);
    o.connect(og); og.connect(g); o.start();
  });
  out(g, 0.8);
  shimmer = { g };
}

function buildWind() {
  const n = noiseSrc();
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 1.2;
  const g = ctx.createGain(); g.gain.value = 0;
  n.connect(bp); bp.connect(g); out(g, 0.6); n.start();
  wind = { g, bp };
}

// Called every frame with smoothed 0..1 values.
export function setMood({ cast = 0, shield = 0, moutza = 0, mirror = 0, dead = false, active = true, droneLevel = 1 }) {
  if (!ctx) return;
  const t = now();
  const duck = voicePlaying ? 0.35 : 1;
  const base = active ? 0.11 : 0.05;
  drone.g.gain.setTargetAtTime((dead ? 0.03 : base * droneLevel) * duck * (1 + shield * 0.6), t, 0.3);
  drone.distG.gain.setTargetAtTime(cast * 0.22, t, 0.1);
  drone.vibG.gain.setTargetAtTime(cast * 40, t, 0.1);
  drone.oscs.forEach(o => o.detune.setTargetAtTime(-cast * 120 + shield * 0, t, 0.2));
  glitch.g.gain.setTargetAtTime(cast * 0.045, t, 0.05);
  if (cast > 0.05 && t - lastGlitchStep > 0.07) {
    lastGlitchStep = t;
    glitch.o.frequency.setValueAtTime(110 * Math.pow(2, Math.floor(Math.random() * 24) / 12), t);
  }
  shimmer.g.gain.setTargetAtTime(shield * 0.02 * duck, t, 0.2);
  wind.g.gain.setTargetAtTime((moutza * 0.12 + mirror * 0.05) * duck, t, 0.1);
  wind.bp.frequency.setTargetAtTime(700 + moutza * 2400 + mirror * 1200, t, 0.2);
  lowpass.frequency.setTargetAtTime(dead ? 500 : 18000, t, 0.3);
}

// ---------- one-shots ----------
export function ftou(times = 3) {
  if (!ctx) return;
  const t0 = now() + 0.02;
  for (let i = 0; i < times; i++) {
    const t = t0 + i * 0.3;
    // "f" — air through teeth
    const n1 = noiseSrc(); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 4200; bp.Q.value = 0.9;
    const g1 = ctx.createGain(); n1.connect(bp); bp.connect(g1); out(g1, 0.2);
    env(g1, t, 0.025, 0.32, 0.06, 0.05); n1.start(t); n1.stop(t + 0.2);
    // "t" — the tongue click
    const n2 = noiseSrc(); const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
    const g2 = ctx.createGain(); n2.connect(hp); hp.connect(g2); out(g2, 0.2);
    env(g2, t + 0.12, 0.003, 0.4, 0.005, 0.03); n2.start(t + 0.12); n2.stop(t + 0.2);
    // "ou" — a tiny voiced vowel
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(210, t + 0.14); o.frequency.exponentialRampToValueAtTime(160, t + 0.3);
    const v1 = ctx.createBiquadFilter(); v1.type = 'bandpass'; v1.frequency.value = 330; v1.Q.value = 4;
    const v2 = ctx.createBiquadFilter(); v2.type = 'bandpass'; v2.frequency.value = 780; v2.Q.value = 6;
    const g3 = ctx.createGain(); o.connect(v1); o.connect(v2); v1.connect(g3); v2.connect(g3); out(g3, 0.25);
    env(g3, t + 0.14, 0.02, 0.3, 0.04, 0.1); o.start(t + 0.14); o.stop(t + 0.36);
  }
}

export function bell(strikes = 1, base = 196, gap = 1.5, level = 0.25) {
  if (!ctx) return;
  const ratios = [0.5, 1, 1.183, 1.506, 2, 2.514, 2.662, 3.011, 4.166];
  const amps =   [0.5, 1, 0.55, 0.35, 0.6, 0.25, 0.2, 0.15, 0.1];
  const decs =   [7, 5, 3.5, 2.8, 2.2, 1.6, 1.4, 1.1, 0.8];
  for (let s = 0; s < strikes; s++) {
    const t = now() + 0.02 + s * gap;
    ratios.forEach((r, i) => {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.value = base * r * (1 + (Math.random() - 0.5) * 0.002);
      const g = ctx.createGain(); o.connect(g); out(g, 0.9);
      env(g, t, 0.004, amps[i] * level, 0, decs[i]);
      o.start(t); o.stop(t + decs[i] + 0.1);
    });
    // clapper thunk
    const n = noiseSrc(); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    const g = ctx.createGain(); n.connect(lp); lp.connect(g); out(g, 0.5);
    env(g, t, 0.002, level * 0.6, 0, 0.06); n.start(t); n.stop(t + 0.1);
  }
}

export function notify() {
  if (!ctx) return;
  const t = now() + 0.01;
  [[988, 0], [740, 0.09], [698, 0.18]].forEach(([f, d]) => {
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000;
    const g = ctx.createGain(); o.connect(lp); lp.connect(g); out(g, 0.15);
    env(g, t + d, 0.005, 0.07, 0.05, 0.04); o.start(t + d); o.stop(t + d + 0.12);
  });
  const s = ctx.createOscillator(); s.type = 'sine'; s.frequency.value = 55;
  const sg = ctx.createGain(); s.connect(sg); out(sg, 0.3);
  env(sg, t, 0.3, 0.25, 0.2, 0.6); s.start(t); s.stop(t + 1.2);
}

export function hit() {
  if (!ctx) return;
  const t = now() + 0.01;
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(35, t + 0.4);
  const g = ctx.createGain(); o.connect(g); out(g, 0.2);
  env(g, t, 0.005, 0.7, 0.05, 0.35); o.start(t); o.stop(t + 0.5);
  const n = noiseSrc(); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
  const ng = ctx.createGain(); n.connect(lp); lp.connect(ng); out(ng, 0.3);
  env(ng, t, 0.003, 0.4, 0.02, 0.25); n.start(t); n.stop(t + 0.35);
  // glass crack
  for (let i = 0; i < 5; i++) {
    const c = ctx.createOscillator(); c.type = 'triangle'; c.frequency.value = 2500 + Math.random() * 3500;
    const cg = ctx.createGain(); c.connect(cg); out(cg, 0.3);
    const tt = t + 0.02 + Math.random() * 0.12;
    env(cg, tt, 0.001, 0.08, 0, 0.05); c.start(tt); c.stop(tt + 0.08);
  }
}

export function blocked() {
  if (!ctx) return;
  const t = now() + 0.01;
  [2093, 3136, 4186].forEach((f, i) => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const g = ctx.createGain(); o.connect(g); out(g, 0.7);
    env(g, t, 0.002, [0.36, 0.2, 0.12][i], 0, 0.6); o.start(t); o.stop(t + 0.7);
  });
}

export function reflect() {
  if (!ctx) return;
  const t = now() + 0.01;
  const n = noiseSrc(); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3;
  bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(6000, t + 0.4);
  const g = ctx.createGain(); n.connect(bp); bp.connect(g); out(g, 0.4);
  env(g, t, 0.05, 0.35, 0.15, 0.2); n.start(t); n.stop(t + 0.5);
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(600, t); o.frequency.exponentialRampToValueAtTime(2400, t + 0.35);
  const og = ctx.createGain(); o.connect(og); out(og, 0.7);
  env(og, t + 0.05, 0.02, 0.12, 0.15, 0.4); o.start(t); o.stop(t + 0.8);
}

export function yawn() {
  if (!ctx) return 1.9;
  const t = now() + 0.02;
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(230, t);
  o.frequency.linearRampToValueAtTime(300, t + 0.35);
  o.frequency.exponentialRampToValueAtTime(120, t + 1.8);
  const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 6;
  const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = 8;
  f1.frequency.setValueAtTime(650, t); f1.frequency.linearRampToValueAtTime(800, t + 0.5); f1.frequency.linearRampToValueAtTime(430, t + 1.8);
  f2.frequency.setValueAtTime(1100, t); f2.frequency.linearRampToValueAtTime(1250, t + 0.5); f2.frequency.linearRampToValueAtTime(800, t + 1.8);
  const g = ctx.createGain(); o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); out(g, 0.35);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.4);
  g.gain.setValueAtTime(0.5, t + 1.1);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.95);
  o.start(t); o.stop(t + 2);
  // breath
  const n = noiseSrc(); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.8;
  const ng = ctx.createGain(); n.connect(bp); bp.connect(ng); out(ng, 0.3);
  env(ng, t, 0.3, 0.06, 0.9, 0.6); n.start(t); n.stop(t + 2);
  return 1.95;
}

export function crash() {
  if (!ctx) return;
  const t = now() + 0.01;
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(28, t + 1.4);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(4000, t); lp.frequency.exponentialRampToValueAtTime(200, t + 1.4);
  const g = ctx.createGain(); o.connect(lp); lp.connect(g); out(g, 0.3);
  env(g, t, 0.01, 0.35, 0.8, 0.6); o.start(t); o.stop(t + 1.6);
  hit();
}

export function click() {
  // komboloi bead clack
  if (!ctx) return;
  const t = now() + 0.005;
  const n = noiseSrc(); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600 + Math.random() * 800; bp.Q.value = 6;
  const g = ctx.createGain(); n.connect(bp); bp.connect(g); out(g, 0.1);
  env(g, t, 0.001, 0.5, 0, 0.03); n.start(t); n.stop(t + 0.06);
}

export function drop() {
  if (!ctx) return;
  const t = now() + 0.01;
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(1100, t); o.frequency.exponentialRampToValueAtTime(260, t + 0.08);
  const g = ctx.createGain(); o.connect(g); out(g, 0.6);
  env(g, t, 0.003, 0.45, 0.01, 0.12); o.start(t); o.stop(t + 0.2);
}

export function fullProtection() {
  if (!ctx) return;
  bell(1, 392, 0, 0.22);
  // thymiato (censer) chain
  const t0 = now() + 0.05;
  for (let i = 0; i < 16; i++) {
    const t = t0 + Math.random() * 1.4;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 3200 + Math.random() * 3800;
    const g = ctx.createGain(); o.connect(g); out(g, 0.6);
    env(g, t, 0.001, 0.05, 0, 0.12); o.start(t); o.stop(t + 0.2);
  }
}

export function reboot() { bell(3, 196, 1.3, 0.28); }

// ---------- optional recorded voice ----------
async function loadVoices() {
  try {
    const r = await fetch('assets/voice/manifest.json', { cache: 'no-store' });
    if (r.ok) voiceManifest = await r.json();
  } catch (_) { voiceManifest = {}; }
}

export function hasVoice(key) { return Array.isArray(voiceManifest[key]) && voiceManifest[key].length > 0; }

export function voice(key) {
  if (muted || !hasVoice(key)) return false;
  if (voicePlaying) { voicePlaying.pause(); voicePlaying = null; }
  const files = voiceManifest[key];
  const a = new Audio('assets/voice/' + files[Math.floor(Math.random() * files.length)]);
  a.volume = 1;
  voicePlaying = a;
  a.onended = a.onerror = () => { if (voicePlaying === a) voicePlaying = null; };
  a.play().catch(() => { voicePlaying = null; });
  return true;
}

export function setMuted(m) {
  muted = m;
  if (ctx) master.gain.setTargetAtTime(m ? 0 : 0.9, now(), 0.05);
  if (m && voicePlaying) { voicePlaying.pause(); voicePlaying = null; }
}
export const isMuted = () => muted;
export const isRunning = () => !!ctx && ctx.state === 'running';
export const context = () => ctx;
