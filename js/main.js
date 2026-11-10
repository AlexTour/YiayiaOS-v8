import * as audio from './audio.js';
import * as track from './tracking.js';
import { createEye } from './eye.js';
import { runOilTest } from './oil.js';
import { icon } from './icons.js';
import { renderCertificate } from './certificate.js';
import { GESTURES, THREATS, SENDERS, YIAYIA, BOOT_LINES, UI, pick } from './content.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const KIOSK = params.has('kiosk');
const SPEED = Math.max(1, parseFloat(params.get('speed')) || 1); // test/demo only
const SKIP = params.has('skip'); // jump straight into the ritual (for recording)

// All rates are per second, so the piece behaves the same at 30, 60 or 120 Hz.
const CFG = {
  decay: 1.2, heal: 16, cast: 9, shieldHeal: 4, mirrorHeal: 1,
  graceDrain: 11, graceRecharge: 9,
  threatGap: 5.5, warn: 3.4,
  session: KIOSK ? 100 : 110,
  rebootHold: 1.8,
  calm: params.has('calm') || matchMedia('(prefers-reduced-motion: reduce)').matches,
  lostWarn: 10, lostEnd: 30,
};
const ORDER = ['shield', 'mirror', 'moutza', 'cast'];
const KEYS = { '1': 'shield', '2': 'mirror', '3': 'moutza', '4': 'cast' };

// ---------- language: one at a time, Greek or English ----------
const pickLang = () => {
  const q = params.get('lang');
  if (q === 'en' || q === 'el') return q === 'en' ? 1 : 0;
  try { const v = localStorage.getItem('yiayia-lang'); if (v === '0' || v === '1') return +v; } catch (_) {}
  return /^el\b/i.test(navigator.language || '') ? 0 : 1;
};
let L = pickLang();
const tr = (pair) => (pair ? pair[L] : '');
const setBi = (el, pair) => { el.querySelector('.gr').textContent = tr(pair); const e = el.querySelector('.en'); if (e) e.textContent = ''; };

if (KIOSK) document.body.classList.add('kiosk');

// grace (charm power) bar under the meter
const graceBar = document.createElement('div');
graceBar.id = 'grace';
graceBar.innerHTML = '<div id="grace-fill"></div><span></span>';
$('#meter').appendChild(graceBar);
const style = document.createElement('style');
style.textContent = `#grace{position:relative;height:6px;margin-top:22px;background:rgba(255,215,0,.12);border:1px solid rgba(255,215,0,.4)}
#grace-fill{height:100%;width:100%;background:var(--gold);box-shadow:0 0 8px var(--gold)}
#grace span{position:absolute;right:0;top:9px;font-size:7px;color:var(--gold);letter-spacing:1px;font-family:var(--px)}
#grace.empty{border-color:var(--alert)} #grace.empty span{color:var(--alert)}
.g-row .sub{display:block;font-family:var(--serif);font-style:italic;font-size:11px;margin-top:3px;color:inherit;opacity:.8}`;
document.head.appendChild(style);

let manualReason = null;
function applyLang() {
  document.documentElement.lang = L ? 'en' : 'el';
  document.querySelectorAll('[data-t]').forEach((el) => { const pair = UI[el.dataset.t]; if (pair) el.textContent = tr(pair); });
  setBi($('#begin'), UI.gateNoCam);
  setBi($('#replay'), UI.replay);
  setBi($('#sound-chip'), UI.soundChip);
  setBi($('#cert-download'), UI.download);
  setBi($('#again'), UI.again);
  setBi($('.tired'), UI.tired);
  setBi($('#gate-tip'), UI.handTip);
  $('#cert-download').setAttribute('download', tr(UI.fileName));
  $('.cam-note .best').textContent = KIOSK ? '' : tr(UI.bestOn);
  graceBar.querySelector('span').textContent = tr(UI.grace);
  $('#gesture-list').innerHTML = ORDER.map((k, i) => `
    <div class="g-row" data-g="${k}">${icon(k)}<div><span class="gr">${L ? GESTURES[k].en : GESTURES[k].gr}</span><span class="sub">${tr(GESTURES[k].hint)}</span></div><kbd>${i + 1}</kbd></div>`).join('');
  bindRows();
  if (manualReason) { $('#manual-note').textContent = tr(UI.nocam); setBi($('#gate-msg'), UI.noCamWhy[manualReason] || UI.noCamWhy['no-camera']); }
  $('#lang').textContent = L ? 'ΕΛ' : 'EN';
  document.querySelectorAll('#lang-title [data-l]').forEach((sp) => sp.classList.toggle('on', +sp.dataset.l === L));
  lastGateState = '';
}
function toggleLang() {
  L = 1 - L;
  try { localStorage.setItem('yiayia-lang', String(L)); } catch (_) {}
  applyLang();
}

// ---------- scene + state ----------
const eye = createEye($('#stage'));
const S = {
  meter: 50, grace: 100, gesture: 'none', prevGesture: 'none', present: false, pointer: { x: 0.5, y: 0.5 },
  dead: false, playing: false, sessionT: 0, curseLoad: 0, moutzaT: 0, rebootT: 0, lastFull: -99,
  noHandT: 0, lostSaid: false, nextThreat: 3, threats: [], threatId: 0, recent: [],
  stats: {}, said: {}, bubbleUntil: 0, idleSayAt: 0, hitFlash: 0, fullFlash: 0, crackResidual: 0,
  yawning: 0, scene: 'title', sessions: 0, time: 0, palmOnTitle: 0,
  gateArmed: false, gateIdleT: 0, endT: 0, replayT: 0,
};
let run = 0; // increments to cancel any running async flow

function resetStats() { S.stats = { blocked: 0, returned: 0, hits: 0, yawns: 0, moutzes: 0, crashes: 0 }; }
resetStats();

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function wait(ms, token) { await sleep(ms / SPEED); return token === run; }

function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
  document.body.classList.toggle('screen-on', !!id);
  S.scene = id || 'play';
}

// ---------- Yiayia speaks ----------
let typeTimer = 0;
function say(key, { force = false, cd = 5 } = {}) {
  const t = S.time;
  if (!force && (S.said[key] ?? -99) + cd > t) return;
  if (!force && t < S.bubbleUntil - 1.2) return;
  S.said[key] = t;
  const gr = tr(pick(YIAYIA[key]));
  const b = $('#bubble'), g = b.querySelector('.b-gr');
  const spoke = L === 0 && audio.voice(key); // recorded voice is Greek
  clearInterval(typeTimer);
  g.textContent = '';
  let i = 0;
  typeTimer = setInterval(() => {
    i += 1; g.textContent = gr.slice(0, i);
    if (!spoke && i % 4 === 0) audio.click();
    if (i >= gr.length) clearInterval(typeTimer);
  }, 32);
  b.classList.add('show');
  S.bubbleUntil = t + Math.max(3, gr.length * 0.07) + 1.2;
  S.idleSayAt = t + 16 + Math.random() * 8;
}

function react(cls, ms = 900) {
  const y = $('#yiayia');
  y.classList.remove('react-hit', 'react-cast', 'react-yawn', 'react-happy', 'react-sleep');
  void y.offsetWidth; y.classList.add(cls);
  clearTimeout(react.t); react.t = setTimeout(() => y.classList.remove(cls), ms);
}

function log(pair, type = '') {
  const c = $('#log'); const d = document.createElement('div');
  d.className = 'log-entry' + (type ? ' log-' + type : '');
  d.textContent = `> ${tr(pair)}`;
  c.prepend(d);
  while (c.children.length > 6) c.removeChild(c.lastChild);
}

// ---------- tracking ----------
track.addPreview($('#cam-preview'));
track.addPreview($('#title-preview'));
track.onUpdate((ev) => { S.present = ev.present; S.gesture = ev.gesture; S.pointer = ev.pointer; });

function enterManual(reason) {
  track.enableManual();
  document.body.classList.add('manual');
  manualReason = reason;
  $('#manual-note').textContent = tr(UI.nocam);
  // Without a camera the piece can't be played by hand, so (only then) offer buttons.
  $('#gate').dataset.state = 'manual';
  setBi($('#gate-msg'), UI.noCamWhy[reason] || UI.noCamWhy['no-camera']);
  $('#gate-tip').classList.remove('show');
  $('#begin').hidden = false;
  $('#again').hidden = false;
  console.info('[yiayia] manual mode:', reason);
}

// hold-to-gesture buttons and keys (always on — useful for demos and recording too)
function bindRows() {
  document.querySelectorAll('.g-row').forEach((row) => {
    const g = row.dataset.g;
    const on = (e) => { if (track.mode !== 'manual') return; e.preventDefault(); track.setManualGesture(g); };
    const off = () => track.setManualGesture(null);
    row.addEventListener('pointerdown', on);
    row.addEventListener('pointerup', off); row.addEventListener('pointercancel', off); row.addEventListener('pointerleave', off);
  });
}
let heldKey = null;
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (KEYS[e.key] && !e.ctrlKey && !e.metaKey) { heldKey = e.key; track.setManualGesture(KEYS[e.key]); }
  const dbgCombo = KIOSK ? (e.key.toLowerCase() === 'h' && e.ctrlKey && e.shiftKey) : (e.key.toLowerCase() === 'h' && !e.ctrlKey);
  if (dbgCombo) $('#debug').hidden = !$('#debug').hidden;
  if (e.key.toLowerCase() === 'l' && !e.ctrlKey && !e.metaKey) toggleLang();
  // hidden backup for the artist: Enter or Space always starts (not shown on screen)
  if ((e.key === ' ' || e.key === 'Enter') && S.scene === 'title-screen') begin();
});
addEventListener('keyup', (e) => { if (e.key === heldKey) { heldKey = null; track.setManualGesture(null); } });

// ---------- threats ----------
function spawnThreat() {
  let i; do { i = Math.floor(Math.random() * THREATS.length); } while (S.recent.includes(i));
  S.recent.push(i); if (S.recent.length > 8) S.recent.shift();
  const textPair = THREATS[i];
  const senderPair = pick(SENDERS);
  const id = ++S.threatId;
  const el = document.createElement('div');
  el.className = 'notif';
  el.innerHTML = `<div class="ev"></div><div class="from"><span>${tr(UI.incoming)} · ${tr(senderPair)}</span></div>
    <div class="txt">${tr(textPair)}</div><div class="timer"></div><div class="stamp"></div>`;
  $('#notifications').appendChild(el);
  eye.spawnThreat(id, CFG.warn);
  audio.notify();
  S.threats.push({ id, el, t: 0, done: false, senderPair, textPair });
}

function resolveThreat(th, outcome) {
  th.done = true;
  eye.resolveThreat(th.id, outcome);
  th.el.classList.add(outcome);
  const stamp = th.el.querySelector('.stamp');
  if (outcome === 'blocked') {
    S.stats.blocked++; audio.blocked(); S.meter += 3; stamp.textContent = tr(UI.blocked);
    log(UI.blocked, 'sys'); say('blocked', { cd: 10 });
  } else if (outcome === 'returned') {
    S.stats.returned++; audio.reflect(); S.meter += 8; stamp.textContent = tr(UI.returned);
    log([`${UI.returned[0]}: ${th.senderPair[0]}`, `${UI.returned[1]}: ${th.senderPair[1]}`], 'good'); say('mirror', { cd: 6 });
  } else {
    const dmg = 12 + S.meter * 0.1;
    S.meter -= dmg; S.curseLoad += dmg; S.stats.hits++;
    eye.shock(); audio.hit(); S.hitFlash = 0.55; react('react-hit', 500);
    stamp.textContent = tr(UI.landed);
    log(th.textPair, 'curse');
    say('hit', { cd: 4 });
  }
  setTimeout(() => th.el.classList.add('leaving'), 1300);
  setTimeout(() => th.el.remove(), 1850);
}

function clearThreats() { S.threats.forEach(t => t.el.remove()); S.threats = []; eye.clearThreats(); }

// ---------- the ritual ----------
function onGestureEnter(g) {
  document.body.classList.remove('st-cast', 'st-shield', 'st-moutza', 'st-mirror');
  if (g !== 'none') document.body.classList.add('st-' + g);
  document.querySelectorAll('.g-row').forEach(r => r.classList.toggle('active', r.dataset.g === g));
  if (!S.playing || S.dead) return;
  if (g === 'moutza') { audio.ftou(); S.stats.moutzes++; say('moutza', { cd: 5 }); log(['ΦΤΟΥ ΦΤΟΥ ΦΤΟΥ!', 'Ftou ftou ftou!'], 'sys'); }
  if (g === 'shield') { say('shield', { cd: 9 }); log(['ΦΥΛΑΧΤΟ ΕΝΕΡΓΟ', 'Charm raised'], 'sys'); }
  if (g === 'mirror') { log(['ΚΑΘΡΕΦΤΗΣ ΣΤΗΚΩΘΗΚΕ', 'Mirror raised'], 'good'); }
  if (g === 'cast') { say('cast', { cd: 7 }); react('react-cast', 1200); log(['ΚΑΚΟ ΜΑΤΙ!', 'Evil eye!'], 'curse'); }
}

function crash() {
  S.dead = true; S.rebootT = 0; S.stats.crashes++;
  document.body.classList.add('dead');
  clearThreats(); audio.crash(); react('react-hit', 600);
  show('crash-screen');
  say('crash', { force: true });
  log(['ΚΡΙΣΙΜΟ ΣΦΑΛΜΑ: ΥΠΕΡΦΟΡΤΩΣΗ ΜΑΤΙΟΥ', 'Critical error: eye overload'], 'curse');
}

function reboot() {
  S.dead = false; S.meter = 35; S.curseLoad = 0; S.crackResidual = 1; S.nextThreat = 4;
  document.body.classList.remove('dead');
  show(null);
  audio.reboot(); eye.flash();
  say('reboot', { force: true });
  log(['ΕΠΑΝΕΚΚΙΝΗΣΗ ΕΠΙΤΥΧΗΣ', 'Reboot successful'], 'sys');
}

function fullProtection() {
  S.lastFull = S.sessionT; S.fullFlash = 1;
  audio.fullProtection(); eye.flash(); react('react-happy', 2500);
  document.body.classList.add('st-full'); setTimeout(() => document.body.classList.remove('st-full'), 1500);
  say('full', { force: true });
  log([UI.full[0] + '!', UI.full[1] + '!'], 'sys');
}

function yawn() {
  S.stats.yawns++; S.curseLoad = 0; S.yawning = 2;
  audio.yawn(); react('react-yawn', 2000);
  say('yawn', { force: true });
  log(['ΧΑΣΜΟΥΡΗΤΟ — ΗΤΑΝ ΜΑΤΙ', 'Yawn — it WAS the eye'], 'sys');
}

function updateRitual(dt) {
  const g = S.gesture;
  const graceUse = (g === 'shield' || g === 'mirror') && S.grace > 0;
  S.grace = Math.max(0, Math.min(100, S.grace + (graceUse ? -CFG.graceDrain : CFG.graceRecharge) * dt));
  const charmOk = S.grace > 0;

  if (S.dead) {
    S.rebootT = g === 'moutza' ? S.rebootT + dt : Math.max(0, S.rebootT - dt * 1.5);
    $('#reboot-progress').style.strokeDashoffset = 339.3 * (1 - Math.min(1, S.rebootT / CFG.rebootHold));
    if (S.rebootT >= CFG.rebootHold) reboot();
    return;
  }

  const engaged = S.present || track.mode === 'manual';
  if (g === 'moutza') S.meter += CFG.heal * dt;
  else if (g === 'shield' && charmOk) S.meter += CFG.shieldHeal * dt;
  else if (g === 'mirror' && charmOk) S.meter += CFG.mirrorHeal * dt;
  else if (g === 'cast') { S.meter -= CFG.cast * dt; S.curseLoad += CFG.cast * dt; }
  else if (engaged) S.meter -= CFG.decay * dt;

  // yawning: a long moutza after a heavy curse makes Yiayia yawn
  if (g === 'moutza') { S.moutzaT += dt; if (S.moutzaT > 0.9 && S.curseLoad >= 20 && S.yawning <= 0) yawn(); }
  else S.moutzaT = 0;
  S.yawning -= dt;

  // threats: only when someone is actually there
  if (engaged) {
    S.nextThreat -= dt;
    if (S.nextThreat <= 0 && S.threats.filter(t => !t.done).length < 2) {
      spawnThreat();
      S.nextThreat = CFG.threatGap * (0.75 + Math.random() * 0.6) * (S.sessionT < 30 ? 1.25 : 1);
    }
  }
  for (const th of S.threats) {
    if (th.done) continue;
    th.t += dt;
    th.el.querySelector('.timer').style.transform = `scaleX(${Math.max(0, 1 - th.t / CFG.warn)})`;
    if (g === 'shield' && charmOk) resolveThreat(th, 'blocked');
    else if (g === 'mirror' && charmOk) resolveThreat(th, 'returned');
    else if (th.t >= CFG.warn) resolveThreat(th, 'landed');
  }
  S.threats = S.threats.filter(t => t.el.isConnected);

  S.meter = Math.max(0, Math.min(100, S.meter));
  if (S.meter <= 0) { crash(); return; }
  if (S.meter >= 100 && S.sessionT - S.lastFull > 15) fullProtection();

  // session clock
  if (engaged) {
    S.sessionT += dt;
    if (S.sessionT >= CFG.session) { endSession(); return; }
  }

  // nobody there?
  if (track.mode === 'camera' && !S.present) {
    S.noHandT += dt;
    if (S.noHandT > CFG.lostWarn && !S.lostSaid) { S.lostSaid = true; say('lost', { force: true }); }
    if (KIOSK && S.noHandT > CFG.lostEnd) { sleepAndReset(); return; }
  } else { S.noHandT = 0; S.lostSaid = false; }

  if (S.time > S.idleSayAt && g === 'none' && S.threats.length === 0) say('idle', { cd: 0 });
}

// ---------- render loop ----------
function overlay(sel, o) {
  const el = $(sel);
  el.style.opacity = o;
  el.style.visibility = o > 0.004 ? 'visible' : 'hidden';
}
let last = performance.now();
let dbgT = 0;
function frame(n) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (n - last) / 1000); last = n;
  if (document.hidden) return;
  S.time += dt;

  if (S.gesture !== S.prevGesture) { S.prevGesture = S.gesture; onGestureEnter(S.gesture); }

  if (S.playing) updateRitual(dt);

  // hands-only: an open palm, held, starts a session (and replays from the certificate)
  if (S.gesture !== 'moutza') S.gateArmed = true; // the palm must be lowered once between sessions
  if (S.scene === 'title-screen') updateGate(dt);
  if (S.scene === 'end-screen') updateReplay(dt);
  $('#sound-chip').hidden = !(audio.wantsGesture() && !audio.isMuted() && !KIOSK);

  // HUD
  $('#meter-fill').style.width = S.meter + '%';
  $('#meter-num').textContent = Math.round(S.meter);
  $('#grace-fill').style.width = S.grace + '%';
  graceBar.classList.toggle('empty', S.grace <= 0);
  $('#session-fill').style.width = Math.min(100, S.sessionT / CFG.session * 100) + '%';
  const stKey = S.dead ? null : (track.mode === 'camera' && !S.present) ? 'nohand' : (S.gesture === 'none' ? 'idle' : S.gesture);
  if (stKey) $('#status-gr').textContent = tr(UI.status[stKey]);
  $('#hand-hint').classList.toggle('show', S.playing && !S.dead && track.mode === 'camera' && S.noHandT > 1.5);
  const tip = $('#hand-hint .tip'), wantTip = S.noHandT > 8;
  if (wantTip !== !!tip.textContent) tip.textContent = wantTip ? tr(UI.handTip) : '';
  if (S.time > S.bubbleUntil) $('#bubble').classList.remove('show');

  // light
  const f = eye.factors;
  S.hitFlash = Math.max(0, S.hitFlash - dt * 1.4);
  S.fullFlash = Math.max(0, S.fullFlash - dt * 0.7);
  S.crackResidual = Math.max(0, S.crackResidual - dt * 0.12);
  const breathe = CFG.calm ? 0.6 : 0.6 + 0.4 * Math.sin(S.time * Math.PI * 2 * 0.8); // 0.8 Hz — photosensitivity-safe
  const crack = S.dead ? 0.95 : Math.max(S.meter < 30 ? (30 - S.meter) / 30 * 0.55 : 0, S.crackResidual * 0.6);
  overlay('#pulse-red', Math.max(S.dead ? 0.25 : 0, f.cast * 0.38 * breathe, S.hitFlash));
  overlay('#pulse-gold', Math.max(f.shield * 0.32 * breathe, S.fullFlash * 0.5));
  overlay('#cracks', S.playing || S.dead ? crack : 0);

  eye.update(dt, { gesture: S.dead ? (S.gesture === 'moutza' ? 'moutza' : 'none') : S.gesture, present: S.present, pointer: S.pointer, dead: S.dead, meter: S.meter });
  audio.setMood({ cast: f.cast, shield: f.shield, moutza: f.moutza, mirror: f.mirror, dead: S.dead, active: S.playing });

  dbgT += dt;
  if (!$('#debug').hidden && dbgT > 0.25) {
    dbgT = 0;
    $('#dbg-read').textContent = `mode ${track.mode}  tracker fps ${track.debug.fps}\nraw ${track.debug.raw}  stable ${S.gesture}\nmeter ${S.meter.toFixed(1)}  grace ${S.grace.toFixed(0)}  curseLoad ${S.curseLoad.toFixed(0)}\nsession ${S.sessionT.toFixed(0)}/${CFG.session}s  scene ${S.scene}`;
  }
}
requestAnimationFrame(frame);

// ---------- hands-only gate ----------
const HOLD_TO_BEGIN = 0.8;
var lastGateState = '';
function updateGate(dt) {
  const gate = $('#gate');
  if (track.mode === 'manual') return; // enterManual() set it up
  const st = track.status;
  let state, msg;
  if (st === 'idle' || st === 'asking') { state = 'asking'; msg = UI.gateAsking; }
  else if (st === 'loading') { state = 'loading'; msg = UI.gateLoading; }
  else if (st === 'ready') {
    const palm = S.present && S.gesture === 'moutza' && S.gateArmed;
    S.palmOnTitle = palm ? S.palmOnTitle + dt : Math.max(0, S.palmOnTitle - dt * 2);
    state = S.present ? 'hand' : 'ready';
    msg = S.palmOnTitle > 0.05 ? UI.gateHold : UI.gateReady;
    S.gateIdleT = S.present && S.gesture === 'moutza' ? 0 : S.gateIdleT + dt;
    $('#gate-tip').classList.toggle('show', S.gateIdleT > 8);
    if (S.palmOnTitle >= HOLD_TO_BEGIN) { S.palmOnTitle = 0; begin(); }
  } else return;
  $('#gate-fill').style.width = Math.min(1, S.palmOnTitle / HOLD_TO_BEGIN) * 100 + '%';
  const key = state + msg[0];
  if (key !== lastGateState) { lastGateState = key; gate.dataset.state = state; setBi($('#gate-msg'), msg); }
}

function updateReplay(dt) {
  S.endT += dt;
  if (track.mode !== 'camera') return;
  const palm = S.endT > 4 && S.present && S.gesture === 'moutza' && S.gateArmed;
  S.replayT = palm ? S.replayT + dt : Math.max(0, S.replayT - dt * 2);
  $('#replay-fill').style.width = Math.min(1, S.replayT / HOLD_TO_BEGIN) * 100 + '%';
  if (S.replayT >= HOLD_TO_BEGIN) { S.replayT = 0; ++run; S.gateArmed = false; startPlay(); }
}

// ---------- flow ----------
let camPromise = null;
function ensureCamera() {
  if (!camPromise) camPromise = track.startCamera().then((r) => { if (!r.ok) enterManual(r.reason); return r; });
  return camPromise;
}

async function begin() {
  if (S.scene !== 'title-screen') return;
  const token = ++run;
  S.gateArmed = false;
  S.sessions++;
  audio.init();
  ensureCamera();
  if (!SKIP) { await boot(token); if (token !== run) return; }
  await ensureCamera(); if (token !== run) return;
  $('#hud').hidden = false;
  if (!SKIP) {
    await diagnosis(token); if (token !== run) return;
    await tutorial(token); if (token !== run) return;
  }
  startPlay();
}

async function boot(token) {
  show('boot-screen');
  const pre = $('#boot-text'); pre.innerHTML = '';
  const fast = KIOSK ? 0.55 : 1;
  for (const pair of BOOT_LINES) {
    const gr = tr(pair);
    const line = document.createElement('div'); pre.appendChild(line);
    const okAt = gr.lastIndexOf(' OK');
    for (let i = 1; i <= gr.length; i += 2) {
      const txt = gr.slice(0, i);
      line.innerHTML = okAt > 0 && i > okAt ? `${gr.slice(0, okAt)} <span class="ok">${gr.slice(okAt + 1, i)}</span>` : txt;
      if (i % 6 === 1) audio.click();
      if (!(await wait(14 * fast, token))) return;
    }
    line.innerHTML = okAt > 0 ? `${gr.slice(0, okAt)} <span class="ok">OK</span>` : gr;
    if (!(await wait(170 * fast, token))) return;
  }
  pre.insertAdjacentHTML('beforeend', '<span class="cur">█</span>');
  await wait(500 * fast, token);
}

async function diagnosis(token) {
  show('oil-screen');
  $('#oil-verdict').classList.remove('show');
  say('greet', { force: true });
  if (!(await wait(2600, token))) return;
  if (track.mode === 'camera' && !S.present) {
    say('hand', { force: true });
    const t0 = performance.now();
    while (!S.present && performance.now() - t0 < 7000 / SPEED) { if (!(await wait(100, token))) return; }
  }
  say('oil', { force: true });
  await runOilTest($('#oil-canvas'), {
    onDrop: () => audio.drop(),
    speed: (KIOSK ? 1.15 : 1) * SPEED,
  });
  if (token !== run) return;
  setBi($('#oil-verdict'), UI.cursed);
  $('#oil-verdict').classList.add('show');
  audio.hit(); eye.shock();
  say('verdict', { force: true });
  await wait(2800, token);
}

async function tutorial(token) {
  show('tutorial-screen');
  const wrap = $('#tut-cards');
  wrap.innerHTML = ORDER.map(k => `<div class="tut-card" data-g="${k}">${icon(k)}
    <div class="gr">${L ? GESTURES[k].en : GESTURES[k].gr}</div>
    <div class="hint">${tr(GESTURES[k].hint)}</div></div>`).join('');
  say('teach', { force: true });
  if (!(await wait(1500, token))) return;
  for (const k of ORDER) {
    const card = wrap.querySelector(`[data-g="${k}"]`);
    card.classList.add('current');
    const t0 = performance.now(); let held = 0;
    while (performance.now() - t0 < 7000 / SPEED) {
      held = S.gesture === k ? held + 0.1 : 0;
      if (held >= 0.4) break;
      if (!(await wait(100, token))) return;
    }
    card.classList.remove('current'); card.classList.add('done');
    if (held >= 0.4) {
      if (k === 'shield') audio.blocked();
      if (k === 'mirror') audio.reflect();
      if (k === 'moutza') audio.ftou();
      if (k === 'cast') { say('cast', { force: true }); react('react-cast', 1200); }
    } else audio.click();
    if (!(await wait(450, token))) return;
  }
  await wait(900, token);
}

function startPlay() {
  show(null);
  Object.assign(S, { playing: true, dead: false, meter: 50, grace: 100, sessionT: 0, curseLoad: 0, nextThreat: 3, lastFull: -99, noHandT: 0, lostSaid: false, idleSayAt: S.time + 18 });
  resetStats();
  $('#log').innerHTML = '';
  log(['ΓΙΑΓΙΑ_OS v8.0 ΣΕ ΛΕΙΤΟΥΡΓΙΑ', 'YiayiaOS v8.0 online'], 'sys');
}

async function endSession() {
  const token = ++run;
  S.playing = false; S.dead = false; clearThreats();
  document.body.classList.remove('dead'); show(null);
  audio.bell(2, 196, 1.4, 0.22);
  say('goodbye', { force: true });
  if (!(await wait(2600, token))) return;
  const url = await renderCertificate(S.stats, eye.canvas, L);
  if (token !== run) return;
  $('#cert-img').src = url;
  $('#cert-download').href = url;
  S.endT = 0; S.replayT = 0; $('#replay-fill').style.width = '0%';
  show('end-screen');
  if (KIOSK) { if (await wait(15000, token)) goTitle(); }
}

async function sleepAndReset() {
  const token = ++run;
  S.playing = false; clearThreats();
  say('sleep', { force: true }); react('react-sleep', 3000);
  if (await wait(3000, token)) goTitle();
}

function goTitle() {
  ++run;
  if (KIOSK && S.sessions >= 15) { location.reload(); return; } // fresh memory every so often during a long festival day
  Object.assign(S, { playing: false, dead: false, meter: 50, grace: 100, sessionT: 0, palmOnTitle: 0, gateIdleT: 0, gateArmed: false });
  document.body.classList.remove('dead');
  clearThreats();
  $('#hud').hidden = true;
  show('title-screen');
}

$('#begin').addEventListener('click', begin);
$('#lang').addEventListener('click', toggleLang);
$('#lang-title').addEventListener('click', toggleLang);
applyLang();
$('#again').addEventListener('click', () => { ++run; startPlay(); });
$('#mute').addEventListener('click', () => {
  audio.setMuted(!audio.isMuted());
  $('#mute').classList.toggle('off', audio.isMuted());
  try { localStorage.setItem('yiayia-muted', audio.isMuted() ? '1' : '0'); } catch (_) {}
});
try { if (localStorage.getItem('yiayia-muted') === '1') { audio.setMuted(true); $('#mute').classList.add('off'); } } catch (_) {}

// debug panel
[['decay', 'cfg-decay'], ['heal', 'cfg-heal'], ['cast', 'cfg-cast'], ['threatGap', 'cfg-gap']].forEach(([k, id]) => {
  const el = document.getElementById(id), o = el.nextElementSibling;
  el.value = CFG[k]; o.textContent = CFG[k];
  el.addEventListener('input', () => { CFG[k] = parseFloat(el.value); o.textContent = el.value; });
});
$('#cfg-calm').checked = CFG.calm;
$('#cfg-calm').addEventListener('change', (e) => { CFG.calm = e.target.checked; });
$('#dbg-end').addEventListener('click', () => { if (S.playing) endSession(); });
$('#dbg-crash').addEventListener('click', () => { if (S.playing && !S.dead) { S.meter = 0; } });

// ---------- start ----------
// Hands-only: the camera starts as soon as the page opens; nothing needs a click.
show('title-screen');
audio.init();
ensureCamera();
// Browsers keep sound off until the first touch or key press (the kiosk launcher lifts this).
['pointerdown', 'keydown', 'touchstart'].forEach((ev) => addEventListener(ev, () => audio.init(), { passive: true }));
if (KIOSK) {
  try { navigator.wakeLock && navigator.wakeLock.request('screen').catch(() => {}); } catch (_) {}
  addEventListener('error', () => setTimeout(() => location.reload(), 5000));
}

// test hook
window.__yiayia = { S, CFG, track, begin, endSession };
