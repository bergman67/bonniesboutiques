const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const titles = [
  "Midnight Black Paw Print Keychain",
  "Golden Orange Paw Print Keychain",
  "Friendly Green Turtle Keychain",
  "Buzzy Bumblebee Keychain",
  "Creepy Orange Spider Keychain",
  "Spooky White Ghost Keychain",
  "Pumpkin and Bat Halloween Keychain",
  "Pastel Dreams Beaded Loop",
  "Vintage Keys Charm Keychain",
  "Delicate Pink Flowers Charm",
  "Sweet Pink Heart Beaded Keychain",
  "Fluffy White Dog Portrait Keychain",
  "Pink Floral Garden Beaded Keychain",
  "Monochrome Black & White Beaded Charm",
  "Sunny Yellow Bead and Leaf Charm",
  "Purple Cowboy Boot Beaded Keychain",
  "Lucky Green Clover Charm",
  "Silver Petals Flower Charm",
  "Sweet Strawberry Donut Charm",
  "Colorful Rainbow Beaded Keychain",
  "Deep Sea Blue Octopus Keychain",
  "Playful Pink Octopus Keychain",
  "Tropical Green Seahorse Keychain",
  "Sunny Yellow Seahorse Keychain",
  "Shooting Pink Star Keychain",
  "Vibrant Rainbow Beaded Loop",
  "Rustic Brown Boot Beaded Keychain",
  "Ocean Waves Blue Beaded Charm",
  "Silver Hummingbird Charm",
  "Beautiful Blue Butterfly Keychain",
  "Fresh Orange Slice Keychain",
  "Pink Sea Shell & Pearl Keychain",
  "Spooky Black Cat Charm",
  "Woven Dreamcatcher Beaded Charm",
  "Protective Blue Hamsa Hand",
  "Playful Multi-color Beaded Charm",
  "Good Boy Brown Dog Beaded Keychain",
  "Fresh Daisy Flower Beaded Charm",
  "Happy Yellow Smiley Face Charm",
  "Oink Oink Pink Piggy Charm",
  "Elegant White Flower Beaded Charm",
  "Spring Pink Sakura Flower Charm",
  "Pretty Pink Beaded Loop",
  "Radiant Large Sunflower Keychain",
  "Giant White Daisy Keychain",
  "Sleek Black Cat Pen in Box",
  "Mystic Purple Crystal Charm",
  "Elegant Cat Pen in Box",
  "Purple Magic Beaded Ring",
  "Rainbow Beaded Pen Box Set",
  "Pink Beaded Tassel Charm",
  "Cozy Teddy Bear Red Pen",
  "Cozy Teddy Bear Purple Pen",
  "Cozy Teddy Bear Brown Pen",
  "Leaping Frog Green Pen",
  "Frankenstein's Monster Green Pen",
  "Creepy Zombie Green Pen",
  "Spooky Zombie Red Pen",
  "Silly One-Eyed Monster Red Pen",
  "Silly Multi-Eyed Monster Red Pen",
  "Brain-Eating Zombie Red Pen",
  "Golden Sunflower Charm",
  "Jack-o'-Lantern Pumpkin Red Pen",
  "Fuzzy Green Monster Pen",
  "Fuzzy Pink Monster Pen",
  "Glowing Pumpkin Red Pen",
  "Goofy Orange Monster Red Pen",
  "Fuzzy Green Monster Keychain",
  "Fuzzy Blue Monster Keychain",
  "Spooky Skeleton Red Pen",
  "Wrapped Up Mummy Red Pen",
  "Wrapped Up Mummy Black Pen",
  "Bone Chilling Skull Black Pen",
  "Floating Ghost Green Pen",
  "Bone Chilling Skull Purple Pen",
  "Frankenstein's Monster Black Pen",
  "Witch's Black Cat Pen",
  "Galactic Astronaut Red Pen",
  "UFO Spaceship Red Pen",
  "Mooing Cow Green Pen",
  "Hopping Bunny Pink Pen",
  "Crescent Moon Blue Pen",
  "Shooting Star Blue Pen",
  "Twinkling Star White Pen",
  "Shining Sun Orange Pen",
  "Soaring Bird Blue Pen",
  "Green & Yellow Beaded Charm",
  "Yellow & White Beaded Charm",
  "Majestic Framed Bird Art",
  "Elegant Green Tassel Charm",
  "Tropical Green Seahorse Charm"
];

async function main() {
  const prisma = new PrismaClient();
  const mapping = JSON.parse(fs.readFileSync('grid_mapping.json', 'utf8'));

  for (const item of mapping) {
    if (item.index < titles.length) {
      await prisma.product.update({
        where: { id: item.id },
        data: { title: titles[item.index] }
      });
      console.log(`Updated ${item.id} to "${titles[item.index]}"`);
    }
  }

  console.log("Database update complete!");
  await prisma.$disconnect();
}

main().catch(console.error);
