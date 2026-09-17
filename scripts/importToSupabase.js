const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const prisma = new PrismaClient();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const sourceDir = 'C:\\Users\\eranb\\Downloads\\BonniesBoutiqe\\iCloud Photos';

async function run() {
  const files = fs.readdirSync(sourceDir);
  
  let count = 1;
  for (const file of files) {
    if (!file.toLowerCase().endsWith('.jpeg') && !file.toLowerCase().endsWith('.jpg')) continue;
    
    const sourcePath = path.join(sourceDir, file);
    const destFilename = `${Date.now()}-${count}-${file.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    // Read file
    const buffer = fs.readFileSync(sourcePath);
    
    console.log(`Uploading ${file} to Supabase...`);
    const { error } = await supabase.storage.from('products').upload(destFilename, buffer, {
      contentType: 'image/jpeg',
      upsert: false
    });

    if (error) {
      console.error(`Failed to upload ${file}:`, error);
      continue;
    }

    const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(destFilename);
    
    await prisma.product.create({
      data: {
        title: `Trinket #${count}`,
        description: 'Handmade trinket from Bonnie\'s Boutique.',
        price: 8.00,
        imageUrl: publicUrl,
        isDraft: false
      }
    });
    
    console.log(`Added to database: ${file}`);
    count++;
  }
  
  console.log(`\nSuccessfully imported ${count - 1} photos into Supabase and Database!`);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
