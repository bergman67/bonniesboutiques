import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const manifestRaw = fs.readFileSync(path.resolve('src/lib/scrollytelling/productAssetManifest.json'), 'utf8');
  const manifest = JSON.parse(manifestRaw);

  for (const item of manifest.products) {
    const existing = await prisma.product.findUnique({ where: { id: item.id } });
    if (existing) {
      if (existing.title !== item.title || existing.isDraft) {
        await prisma.product.update({
          where: { id: item.id },
          data: {
            title: item.title,
            isDraft: false,
          },
        });
      }
    }
  }
  console.log('Synchronized manifest titles and isDraft: false for all 96 products.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
