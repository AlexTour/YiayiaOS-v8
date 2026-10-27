import * as THREE from '../vendor/three/three.module.min.js';

const COUNT = 18000;
const SUB_EYES = 14;

function circleSprite() {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

function evilEyeTexture() {
  // The *other* eye — the envious one — drawn in red.
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const ring = (r, col) => { x.beginPath(); x.arc(32, 32, r, 0, Math.PI * 2); x.fillStyle = col; x.fill(); };
  ring(30, '#5a0008'); ring(24, '#ff2a2a'); ring(17, '#ffe9e9'); ring(11, '#b30000'); ring(5, '#000');
  x.globalCompositeOperation = 'destination-in';
  const g = x.createRadialGradient(32, 32, 26, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function createEye(container) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020213, 0.002);
  const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 2000);
  camera.position.z = 150;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.appendChild(renderer.domElement);
  const sprite = circleSprite();

  // --- sky ---
  const skyGeo = new THREE.BufferGeometry(); const sp = [];
  for (let i = 0; i < 2000; i++) sp.push((Math.random() - 0.5) * 1800, (Math.random() - 0.5) * 1200, (Math.random() - 0.5) * 1000 - 200);
  skyGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const sky = new THREE.Points(skyGeo, new THREE.PointsMaterial({ size: 4, map: sprite, transparent: true, opacity: 0.6, color: 0xaaccff, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(sky);

  // --- the mati ---
  const pos = new Float32Array(COUNT * 3), base = new Float32Array(COUNT * 3);
  const col = new Float32Array(COUNT * 3), baseCol = new Float32Array(COUNT * 3);
  const burst = new Float32Array(COUNT * 3), radius = new Float32Array(COUNT), sub = new Uint8Array(COUNT);
  const tmp = new THREE.Color();
  for (let i = 0; i < COUNT; i++) {
    const k = i * 3; sub[i] = i % SUB_EYES;
    const r = Math.sqrt(Math.random()) * 60, th = Math.random() * Math.PI * 2;
    radius[i] = r;
    base[k] = pos[k] = r * Math.cos(th);
    base[k + 1] = pos[k + 1] = r * Math.sin(th);
    base[k + 2] = pos[k + 2] = (Math.random() - 0.5) * Math.sqrt(3600 - r * r) * 0.4;
    const ph = Math.acos(2 * Math.random() - 1), et = Math.random() * Math.PI * 2;
    burst[k] = Math.sin(ph) * Math.cos(et); burst[k + 1] = Math.sin(ph) * Math.sin(et); burst[k + 2] = Math.cos(ph);
    tmp.set(r < 11 ? 0x000000 : r < 26 ? 0x00ccff : r < 40 ? 0xeeffff : 0x001188);
    col[k] = baseCol[k] = tmp.r; col[k + 1] = baseCol[k + 1] = tmp.g; col[k + 2] = baseCol[k + 2] = tmp.b;
  }
  const eyeGeo = new THREE.BufferGeometry();
  eyeGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  eyeGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const eye = new THREE.Points(eyeGeo, new THREE.PointsMaterial({ size: 1.0, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(eye);

  const subCenters = [];
  for (let i = 0; i < SUB_EYES; i++) {
    const a = (i / SUB_EYES) * Math.PI * 2;
    // a komboskini-like ring, slightly irregular
    subCenters.push(new THREE.Vector3(Math.cos(a) * 95 + (Math.random() - 0.5) * 12, Math.sin(a) * 62 + (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 30));
  }

  // --- mirror ---
  const shape = new THREE.Shape(); const w = 25, h = 40;
  shape.moveTo(-w, -h); shape.lineTo(w, -h); shape.lineTo(w, h / 2);
  shape.absarc(0, h / 2, w, 0, Math.PI, false); shape.lineTo(-w, -h);
  const mirror = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: true }),
    new THREE.MeshPhongMaterial({ color: 0x999999, emissive: 0x00ffff, transparent: true, opacity: 0, shininess: 120 }));
  mirror.rotation.x = Math.PI; scene.add(mirror);
  scene.add(new THREE.PointLight(0xffffff, 1, 500));
  scene.add(new THREE.AmbientLight(0x334466, 0.6));

  // --- incoming envious eyes ---
  const threatTex = evilEyeTexture();
  const threats = new Map();
  function spawnThreat(id, duration) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: threatTex, transparent: true, depthWrite: false, opacity: 0 }));
    const a = Math.random() * Math.PI * 2;
    const from = new THREE.Vector3(Math.cos(a) * 260, Math.sin(a) * 160, -120);
    m.position.copy(from); m.scale.setScalar(18);
    scene.add(m);
    threats.set(id, { m, from, t: 0, duration, outcome: null, ot: 0 });
  }
  function resolveThreat(id, outcome) { const th = threats.get(id); if (th) { th.outcome = outcome; th.ot = 0; } }

  let shockT = 10;
  function shock() { shockT = 0; }

  // --- state ---
  const f = { cast: 0, shield: 0, mirror: 0, moutza: 0 };
  let protectFlash = 0;
  function flash() { protectFlash = 1; }
  const rot = { x: 0, y: 0 };
  let time = 0;

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    // keep the whole eye in frame on portrait screens
    camera.position.z = Math.max(150, 82 / (Math.tan(THREE.MathUtils.degToRad(37.5)) * camera.aspect));
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  }
  addEventListener('resize', resize);
  resize();

  const approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

  function update(dt, s) {
    time += dt;
    const g = s.gesture;
    f.cast = approach(f.cast, g === 'cast' ? 1 : 0, 9, dt);
    f.moutza = approach(f.moutza, g === 'moutza' ? 1 : 0, 6, dt);
    f.mirror = approach(f.mirror, g === 'mirror' ? 1 : 0, 6, dt);
    f.shield = approach(f.shield, g === 'shield' ? 1 : 0, 3, dt);
    protectFlash = Math.max(0, protectFlash - dt * 0.8);
    shockT += dt;

    // rotation: follow the hand, otherwise drift
    const tx = s.present ? (s.pointer.x - 0.5) * 2.5 : Math.sin(time * 0.5) * 0.8;
    const ty = s.present ? (s.pointer.y - 0.5) * 1.5 : Math.cos(time * 0.3) * 0.3;
    if (!s.dead) {
      rot.x = approach(rot.x, tx, s.present ? 6 : 1.2, dt);
      rot.y = approach(rot.y, ty, s.present ? 6 : 1.2, dt);
    }
    eye.rotation.y = rot.x; eye.rotation.x = rot.y;
    sky.position.x = -rot.x * 50; sky.position.y = -rot.y * 50;
    sky.rotation.z += dt * 0.01;

    if (f.mirror > 0.01) {
      mirror.visible = true; mirror.material.opacity = f.mirror * 0.75;
      mirror.scale.setScalar(Math.max(f.mirror, 0.001));
      mirror.position.set((s.pointer.x - 0.5) * 120, -(s.pointer.y - 0.5) * 80, 40);
      mirror.rotation.y = Math.sin(time * 2) * 0.2;
    } else mirror.visible = false;

    const damage = 1 - s.meter / 100;
    const idle = g === 'none' && !s.dead;
    const pulse = idle ? 1 + Math.sin(time * 2.5) * 0.04 : 1;
    const shockAmt = shockT < 1.2 ? (1 - shockT / 1.2) : 0;
    // Pupil: slow, safe blink (< 3 Hz). Red when the eye is being cast.
    const pupilBlink = f.cast > 0.2 ? (0.5 + 0.5 * Math.sin(time * Math.PI * 2 * 1.5)) : (Math.sin(time * 5) > 0.92 ? 0.7 : 0);
    const k1 = 1 - Math.exp(-9 * dt);

    for (let i = 0; i < COUNT; i++) {
      const k = i * 3;
      let x = base[k] * pulse, y = base[k + 1] * pulse, z = base[k + 2];
      const r = radius[i];
      if (s.dead) { x += (Math.random() - 0.5) * 5; y += (Math.random() - 0.5) * 5; }
      else if (damage > 0.6) { const j = (damage - 0.6) * 4; x += (Math.random() - 0.5) * j; y += (Math.random() - 0.5) * j; }
      if (f.cast > 0.01 || shockAmt > 0) {
        const wave = Math.sin(r * 0.3 - time * 10) * 5 * f.cast + Math.sin(r * 0.25 - shockT * 18) * 14 * shockAmt;
        x += (base[k] / (r || 1)) * wave; y += (base[k + 1] / (r || 1)) * wave;
      }
      if (f.moutza > 0.01) {
        const b = f.moutza * 140;
        x += burst[k] * b; y += burst[k + 1] * b; z += burst[k + 2] * b;
      }
      if (f.shield > 0.01) {
        const c = subCenters[sub[i]];
        x = x * (1 - f.shield) + (c.x + x * 0.17) * f.shield;
        y = y * (1 - f.shield) + (c.y + y * 0.17) * f.shield;
        z = z * (1 - f.shield) + (c.z + z * 0.17) * f.shield;
      }
      pos[k] += (x - pos[k]) * k1; pos[k + 1] += (y - pos[k + 1]) * k1; pos[k + 2] += (z - pos[k + 2]) * k1;

      if (r < 11) { col[k] = pupilBlink; col[k + 1] = 0; col[k + 2] = 0; }
      else {
        // gold wash on full protection, grey when dead
        const gold = protectFlash * 0.8;
        const grey = s.dead ? 0.85 : 0;
        const br = baseCol[k], bg = baseCol[k + 1], bb = baseCol[k + 2];
        const l = (br + bg + bb) / 3 * 0.5;
        col[k] = (br * (1 - gold) + 1.0 * gold) * (1 - grey) + l * grey;
        col[k + 1] = (bg * (1 - gold) + 0.82 * gold) * (1 - grey) + l * grey;
        col[k + 2] = (bb * (1 - gold) + 0.1 * gold) * (1 - grey) + l * grey;
      }
    }
    eyeGeo.attributes.position.needsUpdate = true;
    eyeGeo.attributes.color.needsUpdate = true;

    // incoming eyes
    for (const [id, th] of threats) {
      const m = th.m;
      if (!th.outcome) {
        th.t += dt; const p = Math.min(th.t / th.duration, 1);
        const e = p * p;
        m.position.lerpVectors(th.from, new THREE.Vector3(0, 0, 30), e * 0.82);
        m.material.opacity = Math.min(1, p * 4);
        m.scale.setScalar(14 + e * 14 + Math.sin(time * 9) * 1.5);
        m.material.rotation = Math.sin(time * 4) * 0.3;
      } else {
        th.ot += dt;
        if (th.outcome === 'returned') {
          m.position.lerp(th.from.clone().multiplyScalar(2.2), 1 - Math.exp(-5 * dt));
          m.material.opacity = Math.max(0, 1 - th.ot);
        } else if (th.outcome === 'blocked') {
          m.scale.multiplyScalar(1 + dt * 4);
          m.material.opacity = Math.max(0, 1 - th.ot * 2.5);
        } else {
          m.position.lerp(new THREE.Vector3(0, 0, 60), 1 - Math.exp(-12 * dt));
          m.scale.multiplyScalar(1 + dt * 2);
          m.material.opacity = Math.max(0, 1 - th.ot * 3);
        }
        if (th.ot > 1.1) { scene.remove(m); m.material.dispose(); threats.delete(id); }
      }
    }

    renderer.render(scene, camera);
  }

  function clearThreats() { for (const [id, th] of threats) { scene.remove(th.m); th.m.material.dispose(); } threats.clear(); }

  return { update, spawnThreat, resolveThreat, shock, flash, clearThreats, factors: f, canvas: renderer.domElement };
}
