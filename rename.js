const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const titles = [
  'Orange Letter E Charm', 'Sunset Beaded E Charm', 'Butterfly Topped Pen', 'Pink Beaded Bow Pen',
  'Green Floral Pen', 'Yellow Butterfly Pen', 'Golden Wing Pen', 'Peach Sparkle Pen',
  'Yellow Sparkle Pen', 'Purple Star Pen', 'Pastel Bead Star Charm', 'Gold Heart A Charm',
  'Silver Heart Star Charm', 'Silver Love Charm', 'Gold Heart B Charm', 'Gold Heart C Charm',
  'Gold Heart D Charm', 'Blue Snowflake Pen', 'Turquoise Daisy Pen', 'Pink Crystal Wand Pen',
  'Pink Flower Wand Pen', 'Purple Magic Wand Pen', 'Strawberry Girl Charm', 'Polar Bear Winter Charm',
  'Yellow Butterfly Charm', 'Blue Bird Beaded Charm', 'Orange Fish Charm', 'Scarecrow Charm',
  'Snowman Winter Charm'
];

async function main() {
  const drafts = await prisma.product.findMany({ where: { isDraft: true }, orderBy: { createdAt: 'asc' } });
  
  // Group by title string
  const groups = {};
  for (const d of drafts) {
    if (!groups[d.title]) groups[d.title] = [];
    groups[d.title].push(d);
  }
  
  let i = 0;
  for (const key of Object.keys(groups)) {
    const list = groups[key];
    const toKeep = list[0];
    
    // Update the one to keep
    const newTitle = titles[i] || ('Unique Charm ' + i);
    await prisma.product.update({
      where: { id: toKeep.id },
      data: { title: newTitle, isDraft: false }
    });
    console.log(`Renamed to ${newTitle}`);
    
    // Delete the rest
    for (let j = 1; j < list.length; j++) {
      await prisma.product.delete({ where: { id: list[j].id } });
      console.log(`Deleted duplicate ${list[j].id}`);
    }
    i++;
  }
}
main().then(() => prisma.$disconnect());
