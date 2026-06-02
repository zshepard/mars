// scripts/generate-icons.js
// Run: node scripts/generate-icons.js
// Generates all required PWA icons into public/icons/
// Requires: npm install canvas --save-dev

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUT_DIR = path.join(__dirname, '../public/icons');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function drawMarsIcon(canvas) {
  const ctx = canvas.getContext('2d');
  const s = canvas.width;
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.16;   // inner circle radius
  const d = s * 0.38;   // diamond half-size

  // Background
  ctx.fillStyle = '#080808';
  const radius = s * 0.22;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(s - radius, 0);
  ctx.quadraticCurveTo(s, 0, s, radius);
  ctx.lineTo(s, s - radius);
  ctx.quadraticCurveTo(s, s, s - radius, s);
  ctx.lineTo(radius, s);
  ctx.quadraticCurveTo(0, s, 0, s - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  // Diamond outline
  ctx.strokeStyle = '#1D9E75';
  ctx.lineWidth = s * 0.03;
  ctx.beginPath();
  ctx.moveTo(cx, cy - d);
  ctx.lineTo(cx + d, cy);
  ctx.lineTo(cx, cy + d);
  ctx.lineTo(cx - d, cy);
  ctx.closePath();
  ctx.stroke();

  // Center circle fill
  ctx.fillStyle = '#1D9E75';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // MARS text
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${s * 0.12}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('MARS', cx, s * 0.88);
}

SIZES.forEach((size) => {
  const canvas = createCanvas(size, size);
  drawMarsIcon(canvas);
  const buf = canvas.toBuffer('image/png');
  const filePath = path.join(OUT_DIR, `icon-${size}.png`);
  fs.writeFileSync(filePath, buf);
  console.log(`✓ Generated icon-${size}.png`);
});

console.log('\nAll icons generated in public/icons/');
console.log('If canvas is not installed: npm install canvas --save-dev');
