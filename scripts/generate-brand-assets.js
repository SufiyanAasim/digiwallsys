const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { Resvg } = require('@resvg/resvg-js');

const ROOT = path.resolve(__dirname, '..');
const AURORA_MINT = [0x31, 0xd1, 0xa7];
const AURORA_CYAN = [0x2c, 0xa7, 0xd3];
const DEEP_TEAL = [0x00, 0x1a, 0x15];
const INK = [0xe8, 0xf8, 0xf4];

const lerp = (from, to, amount) => from.map((value, index) =>
  Math.round(value + (to[index] - value) * amount));

function setPixel(png, x, y, color, alpha = 255) {
  const offset = (y * png.width + x) * 4;
  png.data[offset] = color[0];
  png.data[offset + 1] = color[1];
  png.data[offset + 2] = color[2];
  png.data[offset + 3] = alpha;
}

function roundedRect(x, y, left, top, right, bottom, radius) {
  const clampedX = Math.max(left + radius, Math.min(x, right - radius));
  const clampedY = Math.max(top + radius, Math.min(y, bottom - radius));
  return (x - clampedX) ** 2 + (y - clampedY) ** 2 <= radius ** 2;
}

function monogramCoverage(x, y, size) {
  const px = x / size * 256;
  const py = y / size * 256;
  const bowlDistance = Math.hypot(px - 95, py - 171);
  const bowl = bowlDistance <= 56 && bowlDistance >= 29;
  const dStem = roundedRect(px, py, 139, 29, 161, 227, 11);
  const iStem = roundedRect(px, py, 195, 107, 217, 227, 11);
  const iDot = Math.hypot(px - 206, py - 77) <= 13;
  return bowl || dStem || iStem || iDot;
}

function coverageAt(x, y, size, predicate) {
  const offsets = [0.2, 0.8];
  let covered = 0;
  for (const ox of offsets) {
    for (const oy of offsets) {
      if (predicate(x + ox, y + oy, size)) covered += 1;
    }
  }
  return covered / 4;
}

function makeBadgeIcon(size, { foregroundOnly = false } = {}) {
  const png = new PNG({ width: size, height: size });
  const inset = size * 0.025;
  const radius = size * 0.265;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (foregroundOnly) {
        const alpha = coverageAt(x, y, size, monogramCoverage);
        setPixel(png, x, y, INK, Math.round(alpha * 255));
        continue;
      }

      const inside = roundedRect(x + 0.5, y + 0.5, inset, inset, size - inset, size - inset, radius);
      if (!inside) {
        setPixel(png, x, y, DEEP_TEAL);
        continue;
      }

      const t = Math.max(0, Math.min(1, (x + y) / (2 * size)));
      let color = lerp(AURORA_MINT, AURORA_CYAN, t);
      if (y < size * 0.42) {
        const shine = (1 - y / (size * 0.42)) * 0.18;
        color = lerp(color, INK, shine);
      }
      setPixel(png, x, y, color);

      const glyphAlpha = coverageAt(x, y, size, monogramCoverage);
      if (glyphAlpha > 0) setPixel(png, x, y, INK, Math.round(230 + glyphAlpha * 25));
    }
  }
  return png;
}

function makeFavicon(size) {
  const png = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const alpha = coverageAt(x, y, size, monogramCoverage);
      const color = lerp(AURORA_MINT, AURORA_CYAN, (x + y) / (2 * size));
      setPixel(png, x, y, color, Math.round(alpha * 255));
    }
  }
  return png;
}

function renderAuroraWordmark() {
  const sourcePath = path.join(ROOT, 'assets', 'wordmark-aurora-glass.svg');
  const outputPath = path.join(ROOT, 'assets', 'wordmark-glass-alt.png');
  const renderer = new Resvg(fs.readFileSync(sourcePath, 'utf8'), {
    fitTo: { mode: 'width', value: 2048 },
    background: 'rgba(0,0,0,0)',
  });
  const rendered = PNG.sync.read(renderer.render().asPng());
  let minX = rendered.width;
  let minY = rendered.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < rendered.height; y += 1) {
    for (let x = 0; x < rendered.width; x += 1) {
      if (rendered.data[(y * rendered.width + x) * 4 + 3] > 4) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  const padding = 28;
  const width = maxX - minX + 1 + padding * 2;
  const height = maxY - minY + 1 + padding * 2;
  const trimmed = new PNG({ width, height });
  PNG.bitblt(rendered, trimmed, minX, minY, width - padding * 2, height - padding * 2, padding, padding);
  fs.writeFileSync(outputPath, PNG.sync.write(trimmed));
  return outputPath;
}

function writePng(relativePath, png) {
  const outputPath = path.join(ROOT, relativePath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, PNG.sync.write(png));
  return outputPath;
}

const outputs = [
  writePng(path.join('assets', 'logo-glass.png'), makeBadgeIcon(1024)),
  writePng(path.join('src', 'mobile', 'assets', 'icon-app.png'), makeBadgeIcon(1024)),
  writePng(path.join('src', 'mobile', 'assets', 'icon-adaptive-foreground.png'), makeBadgeIcon(1024, { foregroundOnly: true })),
  writePng(path.join('src', 'mobile', 'assets', 'favicon.png'), makeFavicon(256)),
  renderAuroraWordmark(),
];

for (const output of outputs) {
  console.log(`${path.relative(ROOT, output)} (${fs.statSync(output).size} bytes)`);
}
