const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.product.findMany({ select: { id: true, title: true, imageUrl: true } });
  console.log(JSON.stringify(p.slice(0, 5), null, 2));
  // Let's also check total count
  console.log("Total: ", p.length);
  await prisma.$disconnect();
}
main();
