const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const sourceDir = 'C:\\Users\\eranb\\Downloads\\BonniesBoutiqe\\iCloud Photos';
const uploadDir = 'C:\\Users\\eranb\\Documents\\antigravity\\wonderful-hertz\\public\\uploads';

async function run() {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const files = fs.readdirSync(sourceDir);
  
  let count = 1;
  for (const file of files) {
    if (!file.toLowerCase().endsWith('.jpeg') && !file.toLowerCase().endsWith('.jpg')) continue;
    
    const sourcePath = path.join(sourceDir, file);
    const destFilename = `${Date.now()}-${count}-${file}`;
    const destPath = path.join(uploadDir, destFilename);
    
    fs.copyFileSync(sourcePath, destPath);
    
    await prisma.product.create({
      data: {
        title: `Trinket #${count}`,
        description: 'Handmade trinket from Bonnie\'s Boutique.',
        price: 0.00,
        imageUrl: `/uploads/${destFilename}`,
        isDraft: true
      }
    });
    
    console.log(`Imported ${file}`);
    count++;
  }
  
  console.log(`\nSuccessfully imported ${count - 1} photos into the database.`);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
