/**
 * Decode a CDP Page.captureScreenshot JSON dump to a PNG file.
 * Usage: node save-cdp-png.cjs <cdp-json-path> <dest-png>
 */
const fs = require('fs');
const path = require('path');

const src = process.argv[2];
const dest = process.argv[3];
if (!src || !dest) {
  console.error('Usage: node save-cdp-png.cjs <cdp-json> <dest.png>');
  process.exit(1);
}

const j = JSON.parse(fs.readFileSync(src, 'utf8'));
const b64 = j.data ?? j.result?.data;
if (!b64) {
  console.error('No data in', src, 'keys:', Object.keys(j));
  if (j.result) console.error('result keys:', Object.keys(j.result));
  process.exit(1);
}

const buf = Buffer.from(b64, 'base64');
fs.writeFileSync(dest, buf);
const w = buf.readUInt32BE(16);
const h = buf.readUInt32BE(20);
console.log(path.basename(dest) + ': ' + w + 'x' + h + ' (' + Math.round(buf.length / 1024) + 'KB)');
