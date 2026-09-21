const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const sharp = require('sharp');

async function main() {
  const sourceDir = 'C:\\Users\\eranb\\Downloads\\tbtphotos1\\iCloud Photos';
  const targetDir = path.join(__dirname, '..', 'public', 'uploads');
  
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 1. Copy JPEGs
  if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory not found: ${sourceDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(sourceDir);
  const jpegs = files.filter(f => f.toLowerCase().endsWith('.jpeg') || f.toLowerCase().endsWith('.jpg'));
  console.log(`Found ${jpegs.length} JPEGs in ${sourceDir}.`);
  
  const copiedFiles = [];
  for (const file of jpegs) {
    const src = path.join(sourceDir, file);
    const dest = path.join(targetDir, file);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
    }
    copiedFiles.push(file);
  }
  console.log(`Copied ${copiedFiles.length} files to public/uploads.`);
  
  // 2. Insert into Prisma
  const prisma = new PrismaClient();
  const createdProducts = [];
  console.log("Inserting new records into database...");
  for (const file of copiedFiles) {
    const imgUrl = `/uploads/${file}`;
    const stem = file.replace(/\.[^.]+$/, '');
    const existing = await prisma.product.findFirst({
      where: {
        OR: [
          { imageUrl: imgUrl },
          { imageUrl: { contains: stem } }
        ]
      }
    });
    if (!existing) {
      const p = await prisma.product.create({
        data: {
          title: `Draft Product - ${file}`,
          price: 8.0,
          imageUrl: imgUrl,
          isDraft: true
        }
      });
      createdProducts.push({ product: p, file });
    } else {
      console.log(`Product for ${file} already exists.`);
    }
  }
  console.log(`Ensured ${createdProducts.length} new product records in DB.`);
  
  // 3. Run background removal script
  console.log("Running removeBackgrounds.mjs...");
  try {
    execSync('node scripts/removeBackgrounds.mjs', { stdio: 'inherit' });
  } catch(e) {
    console.error("Error running removeBackgrounds:", e);
  }
  
  // 4. Stitched grid & visual analysis
  if (createdProducts.length === 0) {
    console.log("No new products to analyze.");
    await prisma.$disconnect();
    return;
  }

  console.log("Creating stitched grid for visual analysis...");
  const COLS = Math.min(10, createdProducts.length);
  const ROWS = Math.ceil(createdProducts.length / COLS);
  const TILE_SIZE = 200;
  
  const compositeArray = [];
  const manifestPath = path.join(__dirname, '..', 'src', 'lib', 'scrollytelling', 'productAssetManifest.json');
  let manifest = { products: [] };
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch(e) {}
  }
  
  const itemsToAnalyze = [];
  
  for (let i = 0; i < createdProducts.length; i++) {
    const { product: p, file: filename } = createdProducts[i];
    const m = manifest.products.find(x => x.id === p.id);
    let imgPath = path.join(targetDir, filename); // Use original if transparent not available
    
    if (m && m.localPath && fs.existsSync(m.localPath)) {
      imgPath = m.localPath;
    }
    
    itemsToAnalyze.push({ index: i, id: p.id, oldTitle: p.title });
    
    const buffer = await sharp(imgPath).resize(TILE_SIZE, TILE_SIZE, { fit: 'contain', background: {r:255,g:255,b:255,alpha:1} }).png().toBuffer();
    const x = (i % COLS) * TILE_SIZE;
    const y = Math.floor(i / COLS) * TILE_SIZE;
    
    const svgText = `
    <svg width="${TILE_SIZE}" height="${TILE_SIZE}">
      <text x="10" y="25" font-size="24" fill="red">${i}</text>
    </svg>`;
    const textBuffer = Buffer.from(svgText);
    const combinedBuffer = await sharp(buffer)
      .composite([{ input: textBuffer, top: 0, left: 0 }])
      .png()
      .toBuffer();
      
    compositeArray.push({ input: combinedBuffer, top: y, left: x });
  }
  
  const gridBuffer = await sharp({
    create: {
      width: COLS * TILE_SIZE,
      height: ROWS * TILE_SIZE,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite(compositeArray)
  .png()
  .toBuffer();
  
  const gridPath = path.join(__dirname, '..', 'new_products_grid.png');
  fs.writeFileSync(gridPath, gridBuffer);
  console.log(`Grid created at ${gridPath}.`);
  
  // Now analyze with Gemini
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("GEMINI_API_KEY environment variable not set. Using mocked fallback for dynamic naming.");
    const adjectives = ["Spooky", "Neon", "Vintage", "Sparkling", "Rustic", "Elegant", "Chunky", "Dainty", "Whimsical", "Retro"];
    const nouns = ["Charm", "Keychain", "Pendant", "Bracelet", "Necklace", "Earrings", "Ring", "Brooch", "Pin", "Locket"];
    
    for (const { product: p } of createdProducts) {
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      const mockTitle = `${adj} ${noun} ${p.id.slice(-4)}`;
      
      await prisma.product.update({
        where: { id: p.id },
        data: { title: mockTitle }
      });
      console.log(`[Mocked] Renamed product ${p.id} to "${mockTitle}"`);
    }
    console.log("Done mock renaming database records!");
    await prisma.$disconnect();
    return;
  }
  
  console.log("Analyzing with Gemini to generate quip names...");
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    
    const prompt = `Here is a stitched grid of products. Each product has a red number in the top left corner.
For each product, provide a creative, descriptive "quip" name based on its visual design (e.g. "Spooky Ghost Pen", "Neon Pink Heart Charm").
Return a JSON array of objects with "index" (the red number) and "title" (the quip name).
ONLY return valid JSON without markdown wrapping.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: gridBuffer.toString("base64"),
          mimeType: "image/png"
        }
      }
    ]);
    
    let text = result.response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(text);
    
    for (const item of parsed) {
      const productData = itemsToAnalyze.find(x => x.index === item.index);
      if (productData) {
        await prisma.product.update({
          where: { id: productData.id },
          data: { title: item.title }
        });
        console.log(`Renamed product ${productData.id} to "${item.title}"`);
      }
    }
    console.log("Done renaming database records!");
  } catch(e) {
    console.error("Error during visual analysis API call:", e);
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
