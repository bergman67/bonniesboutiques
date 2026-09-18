import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const transparentDir = path.resolve('public', 'uploads', 'transparent');
const files = fs.readdirSync(transparentDir).filter(f => f.endsWith('.png'));

console.log(`Auditing transparent images in: ${transparentDir}`);
console.log(`Total PNG files found: ${files.length}`);

// PNG signature: 89 50 4E 47 0D 0A 1A 0A
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function analyzePng(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 33) return { valid: false, error: 'File too small' };
  if (!buf.subarray(0, 8).equals(PNG_SIG)) return { valid: false, error: 'Invalid PNG signature' };

  let offset = 8;
  let ihdr = null;
  let hasTrns = false;
  let idatChunks = [];

  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buf.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === 'IHDR') {
      const width = data.readUInt32BE(0);
      const height = data.readUInt32BE(4);
      const bitDepth = data[8];
      const colorType = data[9];
      const compression = data[10];
      const filter = data[11];
      const interlace = data[12];
      ihdr = { width, height, bitDepth, colorType, compression, filter, interlace };
    } else if (type === 'tRNS') {
      hasTrns = true;
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  // Decompress IDAT if RGBA (colorType 6) or Palette with tRNS (colorType 3)
  let alphaStats = { minAlpha: 255, maxAlpha: 0, zeroAlphaPixels: 0, nonZeroAlphaPixels: 0, totalPixels: 0 };
  if (ihdr) {
    const totalPixels = ihdr.width * ihdr.height;
    alphaStats.totalPixels = totalPixels;

    if (ihdr.colorType === 6 && ihdr.bitDepth === 8) {
      try {
        const compressed = Buffer.concat(idatChunks);
        const decompressed = zlib.inflateSync(compressed);
        const bpp = 4;
        const stride = 1 + ihdr.width * bpp;
        for (let y = 0; y < ihdr.height; y++) {
          const rowStart = y * stride + 1; // skip filter byte
          for (let x = 0; x < ihdr.width; x++) {
            const a = decompressed[rowStart + x * bpp + 3];
            if (a < alphaStats.minAlpha) alphaStats.minAlpha = a;
            if (a > alphaStats.maxAlpha) alphaStats.maxAlpha = a;
            if (a === 0) alphaStats.zeroAlphaPixels++;
            else alphaStats.nonZeroAlphaPixels++;
          }
        }
      } catch (err) {
        alphaStats.decodeError = err.message;
      }
    } else if (ihdr.colorType === 3 && hasTrns) {
      alphaStats.paletteWithTrns = true;
    }
  }

  return {
    valid: true,
    ihdr,
    hasTrns,
    alphaStats,
    fileSize: buf.length
  };
}

// Sample 5 random and first 5 files
const samples = [...files.slice(0, 5), ...files.slice(95, 100)];
for (const file of samples) {
  const res = analyzePng(path.join(transparentDir, file));
  console.log(`\nFile: ${file} (${(res.fileSize / 1024).toFixed(1)} KB)`);
  console.log(`  Dimensions: ${res.ihdr?.width}x${res.ihdr?.height}, ColorType: ${res.ihdr?.colorType} (6=RGBA), BitDepth: ${res.ihdr?.bitDepth}`);
  if (res.alphaStats.totalPixels > 0 && !res.alphaStats.decodeError) {
    const transparentRatio = ((res.alphaStats.zeroAlphaPixels / res.alphaStats.totalPixels) * 100).toFixed(2);
    console.log(`  Alpha: min=${res.alphaStats.minAlpha}, max=${res.alphaStats.maxAlpha}`);
    console.log(`  Transparent background pixels (alpha=0): ${res.alphaStats.zeroAlphaPixels} (${transparentRatio}%)`);
    console.log(`  Opaque foreground pixels (alpha>0): ${res.alphaStats.nonZeroAlphaPixels}`);
  } else if (res.alphaStats.decodeError) {
    console.log(`  Decompress error: ${res.alphaStats.decodeError}`);
  }
}
