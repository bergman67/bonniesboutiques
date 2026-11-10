#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedGeminiKey() {
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    console.error('❌ No GEMINI_API_KEY found in environment.');
    process.exit(1);
  }

  console.log('Seeding geminiApiKey into StoreSettings ("default")...');

  const existing = await prisma.storeSettings.findUnique({
    where: { id: 'default' },
  });

  let updated;
  if (!existing) {
    updated = await prisma.storeSettings.create({
      data: {
        id: 'default',
        geminiApiKey: geminiKey,
      },
    });
    console.log('✔ Created new StoreSettings record with geminiApiKey.');
  } else {
    updated = await prisma.storeSettings.update({
      where: { id: 'default' },
      data: {
        geminiApiKey: geminiKey,
      },
    });
    console.log('✔ Updated existing StoreSettings ("default") with geminiApiKey.');
  }

  const masked = updated.geminiApiKey
    ? `${updated.geminiApiKey.slice(0, 7)}••••••••${updated.geminiApiKey.slice(-4)}`
    : 'none';
  console.log(`✔ Effective geminiKeyMasked: ${masked}`);

  await prisma.$disconnect();
}

seedGeminiKey().catch(async (err) => {
  console.error('❌ Failed to seed geminiApiKey:', err);
  await prisma.$disconnect();
  process.exit(1);
});
