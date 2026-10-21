/**
 * Fail if PNG looks like a tiled mosaic (identical quadrants) or wrong size.
 * Usage: node verify-png.cjs <file.png> [minW] [minH]
 */
const fs = require('fs');
const { PNG } = require('pngjs');

const file = process.argv[2];
const minW = Number(process.argv[3] || 1280);
const minH = Number(process.argv[4] || 720);
if (!file) {
  console.error('Usage: node verify-png.cjs <file.png>');
  process.exit(1);
}

const png = PNG.sync.read(fs.readFileSync(file));
const { width: w, height: h } = png;

function regionHash(ox, oy, rw, rh) {
  let s = 0;
  for (let y = oy; y < oy + rh; y += 4) {
    for (let x = ox; x < ox + rw; x += 4) {
      const i = (y * w + x) * 4;
      s = (s * 31 + png.data[i] + png.data[i + 1] * 7 + png.data[i + 2] * 13) >>> 0;
    }
  }
  return s;
}

const qw = Math.floor(w / 2);
const qh = Math.floor(h / 2);
const hashes = [
  regionHash(0, 0, qw, qh),
  regionHash(qw, 0, qw, qh),
  regionHash(0, qh, qw, qh),
  regionHash(qw, qh, qw, qh),
];
const unique = new Set(hashes).size;
const tiled = unique === 1;
const tooSmall = w < minW || h < minH;
const suspiciously4k = w >= 3000 && h >= 2000;

let status = 'OK';
if (tiled) status = 'TILED';
else if (tooSmall) status = 'TOO_SMALL';
else if (suspiciously4k) status = 'SUSPECT_4K';

console.log(
  `${require('path').basename(file)}: ${w}x${h} uniqueQuads=${unique} → ${status}`
);
process.exit(status === 'OK' || status === 'SUSPECT_4K' ? (tiled ? 1 : 0) : 1);
