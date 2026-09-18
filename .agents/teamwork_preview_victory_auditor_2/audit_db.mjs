import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function checkDb() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'asc' },
      take: 5,
    });
    console.log(`Retrieved ${products.length} products:`);
    for (const p of products) {
      console.log(`ID: ${p.id} | Title: "${p.title}" | ImageUrl: ${p.imageUrl}`);
    }

    const total = await prisma.product.count();
    const transparentCount = await prisma.product.count({
      where: {
        imageUrl: {
          contains: 'transparent',
        },
      },
    });
    console.log(`\nTotal products in DB: ${total}`);
    console.log(`Products with transparent imageUrl: ${transparentCount}`);
  } catch (err) {
    console.error('Database query error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkDb();
