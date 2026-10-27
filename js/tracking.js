// Hand tracking — MediaPipe Hands served locally from vendor/ (works offline).
// Gestures are measured relative to palm size, so distance to camera doesn't matter.

const HANDS_PATH = 'vendor/mediapipe/hands/';
const CONNECTIONS = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];

const listeners = new Set();
let hands = null, video = null, stream = null, running = false, busy = false;
let lastSeen = 0, lastLandmarks = null;
let candidate = 'none', candidateSince = 0, stable = 'none';
let manual = null; // gesture forced by buttons/keys (fallback mode)
let pointer = { x: 0.5, y: 0.5 };
let previewCanvas = null, previewCtx = null;
export let mode = 'none'; // 'camera' | 'manual' | 'none'
export const debug = { raw: 'none', fps: 0 };

const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function classify(lm) {
  const palm = d(lm[0], lm[9]) || 1e-3;
  const ext = (tip, pip) => d(lm[tip], lm[0]) > d(lm[pip], lm[0]) * 1.12;
  const curled = (tip, pip) => d(lm[tip], lm[0]) < d(lm[pip], lm[0]) * 1.08;
  const idx = ext(8, 6), mid = ext(12, 10), rng = ext(16, 14), pnk = ext(20, 18);
  const thumbOut = d(lm[4], lm[5]) / palm > 0.55;
  const pinch = d(lm[4], lm[8]) / palm;

  // Charm: thumb up, the rest folded into a fist.
  const fist = curled(8, 6) && curled(12, 10) && curled(16, 14) && curled(20, 18);
  const thumbUp = lm[4].y < lm[3].y && lm[3].y < lm[2].y && lm[4].y < lm[6].y;
  if (fist && thumbOut && thumbUp) return 'shield';

  // Evil eye: thumb and index tips touching.
  if (pinch < 0.28) return 'cast';

  // Mirror: index and middle up and pressed together, ring and pinky down.
  if (idx && mid && !rng && !pnk && d(lm[8], lm[12]) / palm < 0.4) return 'mirror';

  // Moutza: all five spread wide.
  if (idx && mid && rng && pnk && thumbOut && d(lm[8], lm[20]) / palm > 0.75) return 'moutza';

  return 'none';
}

function emit(present) {
  const gesture = manual || (present ? stable : 'none');
  const ev = { present: present || !!manual, gesture, pointer: { ...pointer }, landmarks: lastLandmarks, mode };
  listeners.forEach(fn => fn(ev));
}

function onResults(res) {
  const t = performance.now();
  const lm = res.multiHandLandmarks && res.multiHandLandmarks[0];
  if (lm) {
    lastSeen = t; lastLandmarks = lm;
    pointer.x += ((1 - lm[9].x) - pointer.x) * 0.5; // mirrored so it feels like a mirror
    pointer.y += (lm[9].y - pointer.y) * 0.5;
    const g = classify(lm);
    debug.raw = g;
    if (g !== candidate) { candidate = g; candidateSince = t; }
    const hold = candidate === 'none' ? 220 : 130;
    if (t - candidateSince > hold) stable = candidate;
  } else {
    lastLandmarks = null;
    if (t - lastSeen > 220) { stable = 'none'; candidate = 'none'; }
  }
  drawPreview(res.image, lm);
  emit(t - lastSeen < 450);
}

function drawPreview(image, lm) {
  if (!previewCtx) return;
  const c = previewCanvas, x = previewCtx;
  x.save();
  x.clearRect(0, 0, c.width, c.height);
  x.translate(c.width, 0); x.scale(-1, 1);
  x.globalAlpha = 0.55; x.filter = 'grayscale(1) contrast(1.2) sepia(0.6)';
  if (image) x.drawImage(image, 0, 0, c.width, c.height);
  x.filter = 'none'; x.globalAlpha = 1;
  if (lm) {
    x.strokeStyle = '#ffd700'; x.lineWidth = 2;
    x.beginPath();
    CONNECTIONS.forEach(([a, b]) => { x.moveTo(lm[a].x * c.width, lm[a].y * c.height); x.lineTo(lm[b].x * c.width, lm[b].y * c.height); });
    x.stroke();
    x.fillStyle = '#00f2ff';
    lm.forEach(p => x.fillRect(p.x * c.width - 2, p.y * c.height - 2, 4, 4));
  }
  x.restore();
}

export function onUpdate(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function setPreview(canvas) { previewCanvas = canvas; previewCtx = canvas ? canvas.getContext('2d') : null; }

export async function startCamera() {
  if (running) return { ok: true };
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return { ok: false, reason: 'unsupported' };
  if (typeof window.Hands !== 'function') return { ok: false, reason: 'tracker-missing' };
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
  } catch (e) {
    return { ok: false, reason: e && e.name === 'NotAllowedError' ? 'denied' : 'no-camera' };
  }
  video = document.createElement('video');
  video.playsInline = true; video.muted = true; video.srcObject = stream;
  await video.play().catch(() => {});

  hands = new window.Hands({ locateFile: (f) => HANDS_PATH + f });
  hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.5 });
  hands.onResults(onResults);
  try { await hands.initialize(); } catch (e) { return { ok: false, reason: 'tracker-failed' }; }

  running = true; mode = 'camera';
  let frames = 0, fpsT = performance.now();
  const loop = async () => {
    if (!running) return;
    if (!busy && video.readyState >= 2) {
      busy = true;
      try { await hands.send({ image: video }); } catch (_) {}
      busy = false;
      frames++;
      const t = performance.now();
      if (t - fpsT > 1000) { debug.fps = frames; frames = 0; fpsT = t; }
    }
    requestAnimationFrame(loop);
  };
  loop();
  return { ok: true };
}

// ---- fallback: buttons, keys, mouse ----
export function enableManual() {
  if (mode === 'none') mode = 'manual';
  const send = () => emit(false);
  window.addEventListener('pointermove', (e) => {
    if (mode !== 'manual') return;
    pointer.x = e.clientX / window.innerWidth; pointer.y = e.clientY / window.innerHeight; send();
  });
  setInterval(() => { if (mode === 'manual') send(); }, 100);
}
export function setManualGesture(g) { manual = g; emit(performance.now() - lastSeen < 450); }
export const isCameraRunning = () => running;
