// Draws the digiwallsys "di" monogram as a standalone mark on a transparent
// background, for use as the web favicon. The full app icon keeps its gradient
// badge, but at 16px a filled square reads as a coloured blob -- only the
// glyphs survive that size, so the badge is dropped here.
//
// The letterforms are geometry, not text: a bowl + stem for "d", a stem + dot
// for "i". That keeps the output identical on every machine (no font
// dependency) and gives crisper edges at favicon sizes than a rasterised glyph.
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SIZE = 256;
const SS = 4;                    // supersample factor, downsampled for anti-aliasing
const W = SIZE * SS;

// Ember Glass gradient, diagonal top-left -> bottom-right.
const FROM = [0xFF, 0x54, 0x70];
const TO = [0xFF, 0xA4, 0x5B];

const s = (n) => n * SS;

// Geometry in 256-space (see comments above for how these were centred).
const D_BOWL = { cx: 95, cy: 171, outer: 56, inner: 26 };
const D_STEM = { x0: 139, x1: 161, y0: 29, y1: 227 };
const I_STEM = { x0: 195, x1: 217, y0: 107, y1: 227 };
const I_DOT = { cx: 206, cy: 77, r: 13 };

function inRoundedRect(x, y, r) {
  const rad = s((r.x1 - r.x0) / 2);
  const x0 = s(r.x0), x1 = s(r.x1), y0 = s(r.y0), y1 = s(r.y1);
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  // round the caps
  const cyTop = y0 + rad, cyBot = y1 - rad, cx = (x0 + x1) / 2;
  if (y < cyTop) return (x - cx) ** 2 + (y - cyTop) ** 2 <= rad ** 2;
  if (y > cyBot) return (x - cx) ** 2 + (y - cyBot) ** 2 <= rad ** 2;
  return true;
}

function inRing(x, y, c) {
  const d2 = (x - s(c.cx)) ** 2 + (y - s(c.cy)) ** 2;
  return d2 <= s(c.outer) ** 2 && d2 >= s(c.inner) ** 2;
}

function inDisc(x, y, c) {
  return (x - s(c.cx)) ** 2 + (y - s(c.cy)) ** 2 <= s(c.r) ** 2;
}

function covered(x, y) {
  return (
    inRing(x, y, D_BOWL) ||
    inRoundedRect(x, y, D_STEM) ||
    inRoundedRect(x, y, I_STEM) ||
    inDisc(x, y, I_DOT)
  );
}

// Accumulate coverage at supersampled resolution, then average down.
const cov = new Float32Array(SIZE * SIZE);
for (let y = 0; y < W; y++) {
  for (let x = 0; x < W; x++) {
    if (covered(x + 0.5, y + 0.5)) {
      cov[Math.floor(y / SS) * SIZE + Math.floor(x / SS)] += 1;
    }
  }
}

const png = new PNG({ width: SIZE, height: SIZE });
const per = SS * SS;
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x);
    const a = cov[i] / per;
    const t = (x + y) / (2 * (SIZE - 1));       // diagonal gradient position
    const o = i * 4;
    png.data[o] = Math.round(FROM[0] + (TO[0] - FROM[0]) * t);
    png.data[o + 1] = Math.round(FROM[1] + (TO[1] - FROM[1]) * t);
    png.data[o + 2] = Math.round(FROM[2] + (TO[2] - FROM[2]) * t);
    png.data[o + 3] = Math.round(a * 255);
  }
}

const out = path.resolve(process.argv[2] || 'src/mobile/assets/favicon.png');
png.pack().pipe(fs.createWriteStream(out)).on('finish', () => {
  console.log('wrote', out, fs.statSync(out).size, 'bytes');
});
