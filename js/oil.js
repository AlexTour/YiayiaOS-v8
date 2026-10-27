// The diagnosis: three drops of oil in a plate of water.
// If the oil spreads and vanishes, the eye is upon you. (It always does.)

export function runOilTest(canvas, { onDrop = () => {}, onPhase = () => {}, speed = 1 } = {}) {
  const S = 160; // low-res, upscaled with pixelated rendering
  canvas.width = S; canvas.height = S;
  const x = canvas.getContext('2d');
  const cx = S / 2, cy = S / 2, plateR = 72, waterR = 56;
  const drops = [];
  const ripples = [];
  let t = 0, last = performance.now(), raf = 0;
  const schedule = [1.2, 2.4, 3.6].map(v => v / speed);
  const spreadAt = 4.8 / speed, end = 7.6 / speed;
  let dropped = 0, phase = 'pray';

  const offsets = [[-14, -8], [12, -4], [0, 13]];

  return new Promise((resolve) => {
    function frame(n) {
      const dt = Math.min(0.05, (n - last) / 1000); last = n; t += dt;
      while (dropped < 3 && t >= schedule[dropped]) {
        const [ox, oy] = offsets[dropped];
        drops.push({ x: cx + ox, y: cy + oy, r: 4.5, fall: 1, born: t, frags: Array.from({ length: 7 }, () => ({ a: Math.random() * Math.PI * 2, d: 0, s: 0.6 + Math.random() })) });
        dropped++; onDrop(dropped);
      }
      if (phase === 'pray' && t >= spreadAt) { phase = 'spread'; onPhase('spread'); }

      // plate
      x.clearRect(0, 0, S, S);
      x.fillStyle = '#e9e1cf'; circle(cx, cy, plateR);
      x.fillStyle = '#c9bfa8'; circle(cx, cy, plateR - 4);
      x.fillStyle = '#efe8d8'; circle(cx, cy, plateR - 7);
      // blue folk rim pattern
      x.fillStyle = '#1d3f9a';
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; x.fillRect(Math.round(cx + Math.cos(a) * (plateR - 2.5)) - 1, Math.round(cy + Math.sin(a) * (plateR - 2.5)) - 1, 2, 2); }
      // water
      const w = x.createRadialGradient(cx - 10, cy - 12, 4, cx, cy, waterR);
      w.addColorStop(0, '#9fc6d6'); w.addColorStop(1, '#5d8ea3');
      x.fillStyle = w; circle(cx, cy, waterR);
      // light shimmer
      x.fillStyle = 'rgba(255,255,255,0.25)';
      for (let i = 0; i < 5; i++) { const yy = cy - 30 + i * 13 + Math.sin(t * 1.3 + i) * 2; x.fillRect(cx - 20 + Math.sin(t + i * 2) * 6, yy, 10 + i * 2, 1); }

      // ripples
      for (const rp of ripples) {
        const age = t - rp.t; if (age > 1.2) continue;
        x.strokeStyle = `rgba(255,255,255,${0.5 * (1 - age / 1.2)})`; x.lineWidth = 1;
        x.beginPath(); x.arc(rp.x, rp.y, 3 + age * 18, 0, Math.PI * 2); x.stroke();
      }

      // drops
      const sp = phase === 'spread' ? Math.min(1, (t - spreadAt) / (end - spreadAt - 0.6)) : 0;
      for (const d of drops) {
        const age = t - d.born;
        if (d.fall > 0) {
          d.fall = Math.max(0, 1 - age / 0.35);
          // falling drop seen from above: shadow + shrinking highlight
          x.fillStyle = 'rgba(0,0,0,0.2)'; circle(d.x + d.fall * 6, d.y + d.fall * 6, 3);
          x.fillStyle = '#e8c547'; circle(d.x, d.y - d.fall * 20, 2.5 + d.fall * 2);
          if (d.fall === 0) ripples.push({ x: d.x, y: d.y, t });
          continue;
        }
        if (sp <= 0) {
          oilBlob(d.x, d.y, d.r + Math.sin(t * 2 + d.born) * 0.3, 1);
        } else {
          for (const fr of d.frags) {
            fr.d = sp * 30 * fr.s;
            const fx = d.x + Math.cos(fr.a) * fr.d, fy = d.y + Math.sin(fr.a) * fr.d;
            // an oily film spreading out, then the droplets thinning to nothing
            x.globalAlpha = 0.18 * (1 - sp); x.fillStyle = '#f7e08a'; circle(fx, fy, 3 + sp * 7); x.globalAlpha = 1;
            oilBlob(fx, fy, Math.max(1.1, d.r * (1 - sp) * 0.75), Math.pow(1 - sp, 0.6));
          }
        }
      }
      if (t < end) raf = requestAnimationFrame(frame);
      else resolve();
    }
    function circle(px, py, r) { x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill(); }
    function oilBlob(px, py, r, a) {
      x.globalAlpha = a;
      x.fillStyle = '#c99a1e'; circle(px, py, r + 0.8);
      x.fillStyle = '#f1cf5a'; circle(px, py, r);
      x.fillStyle = '#fff6c8'; circle(px - r * 0.35, py - r * 0.35, Math.max(0.6, r * 0.3));
      x.globalAlpha = 1;
    }
    raf = requestAnimationFrame((n) => { last = n; frame(n); });
  });
}
