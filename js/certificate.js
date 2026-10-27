import { UI } from './content.js';

const GR_MONTHS = ['Ιανουαρίου', 'Φεβρουαρίου', 'Μαρτίου', 'Απριλίου', 'Μαΐου', 'Ιουνίου', 'Ιουλίου', 'Αυγούστου', 'Σεπτεμβρίου', 'Οκτωβρίου', 'Νοεμβρίου', 'Δεκεμβρίου'];

function loadImg(src) { return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; }); }

export async function renderCertificate(stats, eyeCanvas) {
  await document.fonts.ready;
  const W = 1080, H = 1350;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;

  // paper
  x.fillStyle = '#f4ecd8'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(120,90,40,${Math.random() * 0.05})`; x.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
  // doily border
  x.strokeStyle = '#1d3f9a'; x.lineWidth = 6; x.strokeRect(40, 40, W - 80, H - 80);
  x.setLineDash([4, 10]); x.lineWidth = 4; x.strokeRect(62, 62, W - 124, H - 124); x.setLineDash([]);
  x.fillStyle = '#1d3f9a';
  for (let i = 0; i < 40; i++) {
    const t = i / 40;
    [[80 + t * (W - 160), 52], [80 + t * (W - 160), H - 52]].forEach(([px, py]) => { x.beginPath(); x.arc(px, py, 4, 0, Math.PI * 2); x.fill(); });
  }
  // corner crosses
  x.font = '48px Serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  [[62, 62], [W - 62, 62], [62, H - 62], [W - 62, H - 62]].forEach(([px, py]) => x.fillText('✚', px, py));

  // header
  x.fillStyle = '#1b1407';
  x.font = '26px Px'; x.fillText('ΓΙΑΓΙΑ OS v8.0', W / 2, 140);
  x.font = '44px Px'; x.fillStyle = '#8a1010';
  wrapCenter(x, UI.certTitle[0], W / 2, 220, 900, 58);
  x.font = 'italic 30px Serif'; x.fillStyle = '#6b5c3e'; x.fillText(UI.certTitle[1], W / 2, 330);

  // the eye, as it was at the end
  const mati = await loadImg('assets/mati.svg');
  const cy = 500;
  if (eyeCanvas) {
    x.save(); x.beginPath(); x.arc(W / 2, cy, 130, 0, Math.PI * 2); x.clip();
    x.fillStyle = '#020213'; x.fillRect(W / 2 - 130, cy - 130, 260, 260);
    const s = Math.min(eyeCanvas.width, eyeCanvas.height) * 0.62;
    x.drawImage(eyeCanvas, (eyeCanvas.width - s) / 2, (eyeCanvas.height - s) / 2, s, s, W / 2 - 130, cy - 130, 260, 260);
    x.restore();
    x.strokeStyle = '#c9a227'; x.lineWidth = 8; x.beginPath(); x.arc(W / 2, cy, 134, 0, Math.PI * 2); x.stroke();
  } else if (mati) x.drawImage(mati, W / 2 - 130, cy - 130, 260, 260);
  if (mati) { x.drawImage(mati, W / 2 + 90, cy + 70, 70, 70); }

  // body
  x.fillStyle = '#1b1407'; x.font = '34px Serif';
  wrapCenter(x, UI.certBody[0], W / 2, 700, 860, 46);
  x.font = 'italic 24px Serif'; x.fillStyle = '#6b5c3e';
  wrapCenter(x, UI.certBody[1], W / 2, 790, 860, 34);

  // stats
  const rows = ['blocked', 'returned', 'hits', 'yawns', 'moutzes', 'crashes'];
  let y = 850;
  x.textBaseline = 'alphabetic';
  rows.forEach((k, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const px = col === 0 ? 150 : W / 2 + 40, py = y + row * 68;
    x.textAlign = 'left'; x.fillStyle = '#1b1407'; x.font = '24px Serif';
    x.fillText(UI.certStats[k][0], px, py);
    x.font = 'italic 17px Serif'; x.fillStyle = '#6b5c3e'; x.fillText(UI.certStats[k][1], px, py + 24);
    x.textAlign = 'right'; x.font = '30px Px'; x.fillStyle = '#1d3f9a';
    x.fillText(String(stats[k] ?? 0), px + 380, py + 6);
  });

  // footer: date, validity, signature
  const d = new Date();
  x.textAlign = 'left'; x.fillStyle = '#1b1407'; x.font = '24px Serif';
  x.fillText(`Αθήνα, ${d.getDate()} ${GR_MONTHS[d.getMonth()]} ${d.getFullYear()}`, 150, 1150);
  x.font = 'italic 20px Serif'; x.fillStyle = '#6b5c3e';
  x.fillText('Ισχύει για 40 ημέρες · Valid for 40 days', 150, 1186);
  x.textAlign = 'center'; x.fillStyle = '#1b1407';
  x.font = 'italic 44px Serif'; x.fillText(UI.certSign[0], W - 260, 1160);
  x.strokeStyle = '#1b1407'; x.lineWidth = 2; x.beginPath(); x.moveTo(W - 380, 1176); x.lineTo(W - 140, 1176); x.stroke();
  // seal
  x.save(); x.translate(W - 205, 1105); x.rotate(-0.18);
  x.strokeStyle = 'rgba(160,20,20,.75)'; x.lineWidth = 5; x.beginPath(); x.arc(0, 0, 54, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.arc(0, 0, 43, 0, Math.PI * 2); x.stroke();
  x.fillStyle = 'rgba(160,20,20,.8)'; x.font = '14px Px'; x.textBaseline = 'middle';
  x.font = '12px Px'; x.fillText('ΦΤΟΥ', 0, -14); x.fillText('ΦΤΟΥ', 0, 2); x.fillText('ΦΤΟΥ', 0, 18);
  x.restore();

  return c.toDataURL('image/png');
}

function wrapCenter(x, text, cx, y, maxW, lh) {
  const words = text.split(' '); let line = '', ly = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (x.measureText(test).width > maxW && line) { x.fillText(line, cx, ly); line = w; ly += lh; }
    else line = test;
  }
  x.fillText(line, cx, ly);
}
