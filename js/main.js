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
  decay: 1.2, heal: 16, cast: 24, shieldHeal: 4, mirrorHeal: 1,
  graceDrain: 11, graceRecharge: 9,
  threatGap: 5.5, warn: 3.4,
  session: KIOSK ? 100 : 110,
  rebootHold: 1.8,
  calm: params.has('calm') || matchMedia('(prefers-reduced-motion: reduce)').matches,
  lostWarn: 10, lostEnd: 30,
};
const ORDER = ['shield', 'mirror', 'moutza', 'cast'];
const KEYS = { '1': 'shield', '2': 'mirror', '3': 'moutza', '4': 'cast' };

// ---------- static text ----------
const GREEK_ONLY = new Set(['title', 'meterLo', 'meterHi']);
document.querySelectorAll('[data-t]').forEach((el) => {
  const pair = UI[el.dataset.t]; if (!pair) return;
  if (el.classList.contains('gr') || GREEK_ONLY.has(el.dataset.t)) el.textContent = pair[0];
  else if (el.classList.contains('en')) el.textContent = pair[1];
  else el.innerHTML = `${pair[0]}<span class="en">${pair[1]}</span>`;
});
const setBi = (el, pair) => { el.querySelector('.gr').textContent = pair[0]; el.querySelector('.en').textContent = pair[1]; };
setBi($('#begin'), KIOSK ? UI.beginKiosk : UI.begin);
setBi($('#cert-download'), UI.download);
setBi($('#again'), UI.again);
setBi($('.tired'), UI.tired);
if (KIOSK) document.body.classList.add('kiosk');

// grace (charm power) bar under the meter
const graceBar = document.createElement('div');
graceBar.id = 'grace';
graceBar.innerHTML = '<div id="grace-fill"></div><span>ΧΑΡΗ · grace</span>';
$('#meter').appendChild(graceBar);
const style = document.createElement('style');
style.textContent = `#grace{position:relative;height:6px;margin-top:22px;background:rgba(255,215,0,.12);border:1px solid rgba(255,215,0,.4)}
#grace-fill{height:100%;width:100%;background:var(--gold);box-shadow:0 0 8px var(--gold)}
#grace span{position:absolute;right:0;top:9px;font-size:7px;color:var(--gold);letter-spacing:1px;font-family:var(--px)}
#grace.empty{border-color:var(--alert)} #grace.empty span{color:var(--alert)}`;
document.head.appendChild(style);

// gesture list
$('#gesture-list').innerHTML = ORDER.map((k, i) => `
  <div class="g-row" data-g="${k}">${icon(k)}<div><span class="gr">${GESTURES[k].gr}</span><span class="en">${GESTURES[k].hint[1]}</span></div><kbd>${i + 1}</kbd></div>`).join('');

// ---------- scene + state ----------
const eye = createEye($('#stage'));
const S = {
  meter: 50, grace: 100, gesture: 'none', prevGesture: 'none', present: false, pointer: { x: 0.5, y: 0.5 },
  dead: false, playing: false, sessionT: 0, curseLoad: 0, moutzaT: 0, rebootT: 0, lastFull: -99,
  noHandT: 0, lostSaid: false, nextThreat: 3, threats: [], threatId: 0, recent: [],
  stats: {}, said: {}, bubbleUntil: 0, idleSayAt: 0, hitFlash: 0, fullFlash: 0, crackResidual: 0,
  yawning: 0, scene: 'title', sessions: 0, time: 0, palmOnTitle: 0,
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
  const [gr, en] = pick(YIAYIA[key]);
  const b = $('#bubble'), g = b.querySelector('.b-gr'), e = b.querySelector('.b-en');
  const spoke = audio.voice(key);
  clearInterval(typeTimer);
  g.textContent = ''; e.textContent = en;
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
  d.innerHTML = `&gt; ${pair[0]}<span class="en">${pair[1]}</span>`;
  c.prepend(d);
  while (c.children.length > 6) c.removeChild(c.lastChild);
}

// ---------- tracking ----------
track.setPreview($('#cam-preview'));
track.onUpdate((ev) => { S.present = ev.present; S.gesture = ev.gesture; S.pointer = ev.pointer; });

function enterManual(reason) {
  track.enableManual();
  document.body.classList.add('manual');
  $('#manual-note').innerHTML = `${UI.nocam[0]}<br><i>${UI.nocam[1]}</i>`;
  console.info('[yiayia] manual mode:', reason);
}

// hold-to-gesture buttons and keys (always on — useful for demos and recording too)
document.querySelectorAll('.g-row').forEach((row) => {
  const g = row.dataset.g;
  const on = (e) => { e.preventDefault(); track.setManualGesture(g); };
  const off = () => track.setManualGesture(null);
  row.addEventListener('pointerdown', on);
  row.addEventListener('pointerup', off); row.addEventListener('pointercancel', off); row.addEventListener('pointerleave', off);
});
let heldKey = null;
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (KEYS[e.key] && !e.ctrlKey && !e.metaKey) { heldKey = e.key; track.setManualGesture(KEYS[e.key]); }
  const dbgCombo = KIOSK ? (e.key.toLowerCase() === 'h' && e.ctrlKey && e.shiftKey) : (e.key.toLowerCase() === 'h' && !e.ctrlKey);
  if (dbgCombo) $('#debug').hidden = !$('#debug').hidden;
  if ((e.key === ' ' || e.key === 'Enter') && S.scene === 'title-screen') begin();
});
addEventListener('keyup', (e) => { if (e.key === heldKey) { heldKey = null; track.setManualGesture(null); } });

// ---------- threats ----------
function spawnThreat() {
  let i; do { i = Math.floor(Math.random() * THREATS.length); } while (S.recent.includes(i));
  S.recent.push(i); if (S.recent.length > 8) S.recent.shift();
  const [gr, en] = THREATS[i];
  const sender = pick(SENDERS);
  const id = ++S.threatId;
  const el = document.createElement('div');
  el.className = 'notif';
  el.innerHTML = `<div class="ev"></div><div class="from"><span>${UI.incoming[0]} · ${sender}</span></div>
    <div class="txt">${gr}</div><div class="txt-en">${en}</div><div class="timer"></div><div class="stamp"></div>`;
  $('#notifications').appendChild(el);
  eye.spawnThreat(id, CFG.warn);
  audio.notify();
  S.threats.push({ id, el, t: 0, done: false, sender });
}

function resolveThreat(th, outcome) {
  th.done = true;
  eye.resolveThreat(th.id, outcome);
  th.el.classList.add(outcome);
  const stamp = th.el.querySelector('.stamp');
  if (outcome === 'blocked') {
    S.stats.blocked++; audio.blocked(); S.meter += 3; stamp.textContent = UI.blocked[0];
    log(UI.blocked, 'sys'); say('blocked', { cd: 10 });
  } else if (outcome === 'returned') {
    S.stats.returned++; audio.reflect(); S.meter += 8; stamp.textContent = UI.returned[0];
    log([`${UI.returned[0]}: ${th.sender}`, UI.returned[1]], 'good'); say('mirror', { cd: 6 });
  } else {
    const dmg = 12 + S.meter * 0.1;
    S.meter -= dmg; S.curseLoad += dmg; S.stats.hits++;
    eye.shock(); audio.hit(); S.hitFlash = 0.55; react('react-hit', 500);
    stamp.textContent = UI.landed[0];
    log([th.el.querySelector('.txt').textContent, th.el.querySelector('.txt-en').textContent], 'curse');
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

  // kiosk: an open palm on the title screen starts a session
  if (KIOSK && S.scene === 'title-screen') {
    S.palmOnTitle = S.gesture === 'moutza' ? S.palmOnTitle + dt : 0;
    if (S.palmOnTitle > 0.6) begin();
  }

  // HUD
  $('#meter-fill').style.width = S.meter + '%';
  $('#meter-num').textContent = Math.round(S.meter);
  $('#grace-fill').style.width = S.grace + '%';
  graceBar.classList.toggle('empty', S.grace <= 0);
  $('#session-fill').style.width = Math.min(100, S.sessionT / CFG.session * 100) + '%';
  const stKey = S.dead ? null : (track.mode === 'camera' && !S.present) ? 'nohand' : (S.gesture === 'none' ? 'idle' : S.gesture);
  if (stKey) { $('#status-gr').textContent = UI.status[stKey][0]; $('#status-en').textContent = UI.status[stKey][1]; }
  $('#hand-hint').classList.toggle('show', S.playing && !S.dead && track.mode === 'camera' && S.noHandT > 1.5);
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

// ---------- flow ----------
let camPromise = null;
function ensureCamera() {
  if (!camPromise) camPromise = track.startCamera().then((r) => { if (!r.ok) enterManual(r.reason); return r; });
  return camPromise;
}

async function begin() {
  if (S.scene !== 'title-screen') return;
  const token = ++run;
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
  for (const [gr] of BOOT_LINES) {
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
    <div class="gr">${GESTURES[k].gr}</div><div class="en">${GESTURES[k].en}</div>
    <div class="hint">${GESTURES[k].hint[0]} · <i>${GESTURES[k].hint[1]}</i></div></div>`).join('');
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
  const url = await renderCertificate(S.stats, eye.canvas);
  if (token !== run) return;
  $('#cert-img').src = url;
  $('#cert-download').href = url;
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
  Object.assign(S, { playing: false, dead: false, meter: 50, grace: 100, sessionT: 0, palmOnTitle: 0 });
  document.body.classList.remove('dead');
  clearThreats();
  $('#hud').hidden = true;
  show('title-screen');
}

$('#begin').addEventListener('click', begin);
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
show('title-screen');
if (KIOSK) {
  // Kiosk: camera and sound start immediately (launch Chrome with the flags in kiosk/).
  audio.init(); ensureCamera();
  try { navigator.wakeLock && navigator.wakeLock.request('screen').catch(() => {}); } catch (_) {}
  addEventListener('error', () => setTimeout(() => location.reload(), 5000));
  addEventListener('pointerdown', () => audio.init(), { once: true });
}

// test hook
window.__yiayia = { S, CFG, track, begin, endSession };
