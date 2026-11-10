import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

async function analyzeCatalog() {
  const transparentDir = path.join(process.cwd(), 'public', 'uploads', 'transparent');
  const files = fs.readdirSync(transparentDir).filter(f => f.startsWith('transparent-17894137') || f.startsWith('transparent-17891478') || f.startsWith('transparent-811'));

  console.log(`Analyzing ${files.length} catalog transparent files...`);

  const results = [];
  const borderAlphaViolations = [];
  let sampleCount = 0;

  for (const file of files.slice(0, 30)) { // sample 30 files across catalog
    sampleCount++;
    const filePath = path.join(transparentDir, file);
    const buf = fs.readFileSync(filePath);
    const meta = await sharp(buf).metadata();

    const { data: rawRgba, info } = await sharp(buf)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const w = info.width;
    const h = info.height;

    // Check corners
    const topLeftAlpha = rawRgba[3];
    const topRightAlpha = rawRgba[(w - 1) * 4 + 3];
    const bottomLeftAlpha = rawRgba[((h - 1) * w) * 4 + 3];
    const bottomRightAlpha = rawRgba[((h - 1) * w + (w - 1)) * 4 + 3];

    // Check center
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);
    const centerAlpha = rawRgba[(cy * w + cx) * 4 + 3];

    // Calculate transparency percentage
    let transparentPixels = 0;
    for (let i = 3; i < rawRgba.length; i += 4) {
      if (rawRgba[i] < 10) transparentPixels++;
    }
    const transparentRatio = transparentPixels / (w * h);

    results.push({
      file,
      format: meta.format,
      channels: meta.channels,
      hasAlpha: meta.hasAlpha,
      width: w,
      height: h,
      topLeftAlpha,
      topRightAlpha,
      bottomLeftAlpha,
      bottomRightAlpha,
      centerAlpha,
      transparentRatio: (transparentRatio * 100).toFixed(1) + '%',
    });

    if (topLeftAlpha > 0 || topRightAlpha > 0 || bottomLeftAlpha > 0 || bottomRightAlpha > 0) {
      borderAlphaViolations.push({ file, topLeftAlpha, topRightAlpha, bottomLeftAlpha, bottomRightAlpha });
    }
  }

  console.log('Sample Catalog Specs (first 5):');
  console.log(JSON.stringify(results.slice(0, 5), null, 2));
  console.log(`Border alpha violations in 30 catalog samples: ${borderAlphaViolations.length}`);

  // Summary statistics
  const formats = new Set(results.map(r => r.format));
  const channels = new Set(results.map(r => r.channels));
  const hasAlphas = new Set(results.map(r => r.hasAlpha));
  console.log(`Formats: ${[...formats].join(', ')}`);
  console.log(`Channels: ${[...channels].join(', ')}`);
  console.log(`HasAlpha: ${[...hasAlphas].join(', ')}`);
}

analyzeCatalog().catch(console.error);
