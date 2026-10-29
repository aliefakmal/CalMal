// 1080x1920 "share my day" image drawn on canvas. Text and shapes only, so the canvas never taints.
const W = 1080;
const H = 1920;
const FONT = "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif";

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function bar(ctx, { x, y, w, label, value, target, color }) {
  ctx.fillStyle = '#8e8e93';
  ctx.font = `600 34px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'right';
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText(`${Math.round(value)} / ${Math.round(target)} g`, x + w, y);
  roundRect(ctx, x, y + 22, w, 16, 8);
  ctx.fillStyle = '#2c2c2e';
  ctx.fill();
  const p = Math.max(0, Math.min(1, target ? value / target : 0));
  if (p > 0) {
    roundRect(ctx, x, y + 22, Math.max(16, w * p), 16, 8);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

export async function buildStoryCard(d) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  await document.fonts?.ready;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 760, 40, W / 2, 760, 760);
  glow.addColorStop(0, `${d.accent}55`);
  glow.addColorStop(1, '#00000000');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.font = `800 64px ${FONT}`;
  ctx.fillText('CalMal', 90, 170);
  ctx.fillStyle = '#8e8e93';
  ctx.font = `600 38px ${FONT}`;
  ctx.fillText(d.dateLabel, 90, 230);
  if (d.name) {
    ctx.textAlign = 'right';
    ctx.fillText(d.name, W - 90, 170);
  }

  // Calorie ring
  const cx = W / 2, cy = 720, r = 260;
  const budget = Math.max(1, d.target + d.kout);
  const p = d.kin / budget;
  ctx.lineCap = 'round';
  ctx.lineWidth = 34;
  ctx.strokeStyle = '#1c1c1e';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  if (p > 0) {
    ctx.strokeStyle = p > 1 ? '#ff453a' : d.accent;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, p));
    ctx.stroke();
  }

  const over = d.remaining < 0;
  ctx.textAlign = 'center';
  ctx.fillStyle = over ? '#ff453a' : '#fff';
  ctx.font = `800 150px ${FONT}`;
  ctx.fillText(String(Math.abs(d.remaining)), cx, cy + 40);
  ctx.fillStyle = '#8e8e93';
  ctx.font = `600 40px ${FONT}`;
  ctx.fillText(over ? d.labels.over : d.labels.remaining, cx, cy + 105);

  // Target / eaten / burned
  const cols = [
    [d.labels.target, d.target, '#fff'],
    [d.labels.eaten, d.kin, '#fff'],
    [d.labels.burned, `+${d.kout}`, '#3ddc97'],
  ];
  cols.forEach(([label, val, color], i) => {
    const x = 90 + i * 300 + 150;
    ctx.fillStyle = '#8e8e93';
    ctx.font = `600 32px ${FONT}`;
    ctx.fillText(label, x, 1110);
    ctx.fillStyle = color;
    ctx.font = `800 64px ${FONT}`;
    ctx.fillText(String(val), x, 1185);
  });

  const m = d.macros || {};
  bar(ctx, { x: 90, y: 1300, w: W - 180, label: d.labels.protein, value: d.protein, target: m.protein, color: d.accent });
  bar(ctx, { x: 90, y: 1400, w: W - 180, label: d.labels.carbs, value: d.carbs, target: m.carbs, color: '#ffd60a' });
  bar(ctx, { x: 90, y: 1500, w: W - 180, label: d.labels.fat, value: d.fat, target: m.fat, color: '#ff7a1a' });

  // Water + streak tiles
  [[d.labels.water, `${(d.water / 1000).toFixed(1)} / ${(d.waterTarget / 1000).toFixed(1)} L`], [d.labels.streak, `${d.streak} 🔥`]].forEach(([label, val], i) => {
    const x = 90 + i * 460;
    roundRect(ctx, x, 1600, 440, 170, 36);
    ctx.fillStyle = '#1c1c1e';
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8e8e93';
    ctx.font = `600 32px ${FONT}`;
    ctx.fillText(label, x + 40, 1665);
    ctx.fillStyle = '#fff';
    ctx.font = `800 56px ${FONT}`;
    ctx.fillText(val, x + 40, 1735);
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

export async function shareStoryCard(blob, filename) {
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'CalMal' });
      return 'shared';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled';
      // Some browsers expose canShare but reject at share time; fall through to download.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
