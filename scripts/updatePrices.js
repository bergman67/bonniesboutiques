const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.product.updateMany({ data: { price: 8.00, isDraft: false } })
  .then(r => console.log('Updated', r.count, 'products to $8.00 and published'))
  .catch(console.error)
  .finally(() => p.$disconnect());
