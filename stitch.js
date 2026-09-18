const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const products = await prisma.product.findMany({ orderBy: { id: 'asc' } });
  
  const COLS = 10;
  const ROWS = Math.ceil(products.length / COLS);
  const TILE_SIZE = 200;
  
  const compositeArray = [];
  
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    // Find local image using the ID or whatever.
    // Wait, the products have transparentUrl. Let's just use the productAssetManifest.
    const manifest = require('./src/lib/scrollytelling/productAssetManifest.json');
    const m = manifest.products.find(x => x.id === p.id);
    let imgPath;
    if (m && m.localPath && fs.existsSync(m.localPath)) {
        imgPath = m.localPath;
    } else {
        continue;
    }
    
    // Read and resize
    const buffer = await sharp(imgPath).resize(TILE_SIZE, TILE_SIZE, { fit: 'contain', background: {r:255,g:255,b:255,alpha:1} }).png().toBuffer();
    
    const x = (i % COLS) * TILE_SIZE;
    const y = Math.floor(i / COLS) * TILE_SIZE;
    
    // Add text label
    const svgText = `
    <svg width="${TILE_SIZE}" height="${TILE_SIZE}">
      <text x="10" y="25" font-size="24" fill="red">${i}</text>
    </svg>`;
    const textBuffer = Buffer.from(svgText);
    
    const combinedBuffer = await sharp(buffer)
      .composite([{ input: textBuffer, top: 0, left: 0 }])
      .png()
      .toBuffer();
    
    compositeArray.push({
      input: combinedBuffer,
      top: y,
      left: x
    });
  }
  
  await sharp({
    create: {
      width: COLS * TILE_SIZE,
      height: ROWS * TILE_SIZE,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite(compositeArray)
  .png()
  .toFile('grid.png');
  
  console.log("Grid created successfully!");
  
  // Also save the mapping to know which index is which product ID
  const mapping = products.map((p, i) => ({ index: i, id: p.id, oldName: p.title }));
  fs.writeFileSync('grid_mapping.json', JSON.stringify(mapping, null, 2));
  
  await prisma.$disconnect();
}

main().catch(console.error);
