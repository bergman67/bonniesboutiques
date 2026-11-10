/**
 * src/lib/studio/rpgAppraisal.ts
 * 96 Product Cutouts Loader & Procedural RPG Item Appraisal Engine
 * Loads all 96 products from productAssetManifest.json and generates
 * deterministic RPG stats, rarity tiers, lore, and Grandma Bonnie blessings.
 */

import manifest from '@/lib/scrollytelling/productAssetManifest.json';

export type ProductRarity =
  | 'Common'
  | 'Rare'
  | 'Epic'
  | 'Legendary'
  | "Grandma's Secret Stash";

export type StatType = 'cozy' | 'focus' | 'protection' | 'wholesome' | 'charm' | 'speed';

export interface RPGStat {
  name: string;
  value: number;
  statType: StatType;
  formatted: string;
}

export interface CatalogProduct {
  id: string;
  title: string;
  price: number;
  category: 'Beaded Pens' | 'Keychains' | 'Charms & Bookmarks';
  transparentLocalUrl: string;
  filename: string;
}

export interface RPGProductAppraisal {
  productId: string;
  title: string;
  price: number;
  category: string;
  imageUrl: string;
  rarity: ProductRarity;
  rarityColor: string;
  lore: string;
  stats: [RPGStat, RPGStat, RPGStat];
  blessing: string;
}

export const RARITY_COLORS: Record<ProductRarity, string> = {
  Common: '#94a3b8',
  Rare: '#38bdf8',
  Epic: '#c084fc',
  Legendary: '#f59e0b',
  "Grandma's Secret Stash": '#f43f5e',
};

/**
 * Deterministic string hash helper
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Categorize product by title
 */
export function categorizeProduct(title: string): 'Beaded Pens' | 'Keychains' | 'Charms & Bookmarks' {
  const lower = title.toLowerCase();
  if (lower.includes('pen')) return 'Beaded Pens';
  if (lower.includes('keychain')) return 'Keychains';
  return 'Charms & Bookmarks';
}

/**
 * Load all 96 verified products from the catalog manifest
 */
export function getAllCatalogProducts(): CatalogProduct[] {
  return manifest.products.map((p) => ({
    id: p.id,
    title: p.title,
    price: p.price,
    category: categorizeProduct(p.title),
    transparentLocalUrl: p.transparentLocalUrl,
    filename: p.filename,
  }));
}

export function getProductById(productId: string): CatalogProduct | undefined {
  const all = getAllCatalogProducts();
  return all.find((p) => p.id === productId);
}

/**
 * Procedural RPG Stat & Lore Generator
 */
export function generateRPGAppraisal(input: string | CatalogProduct): RPGProductAppraisal {
  const product: CatalogProduct =
    typeof input === 'string'
      ? getProductById(input) || {
          id: input,
          title: 'Handcrafted Trinket Relic',
          price: 8,
          category: 'Charms & Bookmarks',
          transparentLocalUrl: '/uploads/transparent/placeholder.png',
          filename: 'placeholder.png',
        }
      : input;

  const hash = hashString(product.id + product.title);

  // 1. Rarity Tier determination
  let rarity: ProductRarity = 'Common';
  const rarityMod = hash % 100;
  if (rarityMod >= 95) {
    rarity = "Grandma's Secret Stash";
  } else if (rarityMod >= 80) {
    rarity = 'Legendary';
  } else if (rarityMod >= 55) {
    rarity = 'Epic';
  } else if (rarityMod >= 25) {
    rarity = 'Rare';
  } else {
    rarity = 'Common';
  }

  const multiplier =
    rarity === "Grandma's Secret Stash"
      ? 2.5
      : rarity === 'Legendary'
      ? 2.0
      : rarity === 'Epic'
      ? 1.5
      : rarity === 'Rare'
      ? 1.2
      : 1.0;

  // 2. Procedural Stats based on Category
  const isPen = product.category === 'Beaded Pens';
  const isKeychain = product.category === 'Keychains';

  const statPools: Record<string, { name: string; type: StatType; base: number }[]> = {
    pens: [
      { name: 'Handwriting Speed', type: 'speed', base: 15 },
      { name: 'Essay Inspiration', type: 'focus', base: 20 },
      { name: 'Ink Flow Smoothness', type: 'charm', base: 12 },
      { name: 'Writers Block Shield', type: 'protection', base: 18 },
      { name: 'Signature Flamboyance', type: 'wholesome', base: 25 },
      { name: 'Exam Confidence', type: 'focus', base: 14 },
    ],
    keychains: [
      { name: 'Key-Finding Intuition', type: 'focus', base: 25 },
      { name: 'Pocket Charisma', type: 'charm', base: 18 },
      { name: 'Lost Item Ward', type: 'protection', base: 30 },
      { name: 'Bag Clinking Harmony', type: 'cozy', base: 15 },
      { name: 'Doorway Fortune', type: 'wholesome', base: 20 },
      { name: 'Fidget Relaxation', type: 'cozy', base: 22 },
    ],
    charms: [
      { name: 'Cozy Vibes', type: 'cozy', base: 25 },
      { name: 'Generational Warmth', type: 'wholesome', base: 35 },
      { name: 'Crafting Serendipity', type: 'charm', base: 18 },
      { name: 'Curse Protection', type: 'protection', base: 28 },
      { name: 'Smile Induction Aura', type: 'wholesome', base: 22 },
      { name: 'Reading Focus', type: 'focus', base: 16 },
    ],
  };

  const pool = isPen ? statPools.pens : isKeychain ? statPools.keychains : statPools.charms;
  const picked1 = pool[hash % pool.length];
  const picked2 = pool[(hash + 2) % pool.length];
  const picked3 = pool[(hash + 4) % pool.length];

  const val1 = Math.round((picked1.base + (hash % 10)) * multiplier);
  const val2 = Math.round((picked2.base + ((hash >> 2) % 10)) * multiplier);
  const val3 = Math.round((picked3.base + ((hash >> 4) % 10)) * multiplier);

  const stats: [RPGStat, RPGStat, RPGStat] = [
    { name: picked1.name, value: val1, statType: picked1.type, formatted: `+${val1} ${picked1.name}` },
    { name: picked2.name, value: val2, statType: picked2.type, formatted: `+${val2} ${picked2.name}` },
    { name: picked3.name, value: val3, statType: picked3.type, formatted: `+${val3} ${picked3.name}` },
  ];

  // 3. Lore Quotes
  const loreSnippets = [
    `Crafted during a stormy autumn twilight while sipping peppermint tea. The beads are said to hum softly when good news is approaching.`,
    `Hand-threaded with triple-twist elastic and blessed with Bonnie's legendary crafting patience. Infused with pure sunshine.`,
    `A signature boutique piece combining intricate focal charms and glass crackle beads. Whispers tell of lost keys instantly reappearing.`,
    `Beaded one careful loop at a time. The local legend says anyone writing with this pen receives an unexpected burst of creative inspiration.`,
    `Discovered nestled in Bonnie's velvet showcase drawer. It radiates an unmistakable aura of generational warmth.`,
    `Forged from high-luster polymer and glass crystals. Guaranteed to add +100% wholesome whimsy to any desk or tote bag.`,
  ];
  const lore = loreSnippets[hash % loreSnippets.length];

  // 4. Grandma Bonnie Blessings
  const blessings = [
    `"Take good care of this treasure, honey. It was made with love and double-knotted knots!" — Bonnie`,
    `"Every bead has a purpose, just like every person who walks through our shop door." — Bonnie`,
    `"If you ever lose your keys with this on them, you just whistle twice and check your other pocket." — Bonnie`,
    `"I put extra love into this one while Tammy was testing out the new tea blends." — Bonnie`,
    `"A good pen doesn't just write words—it writes memories, sweetheart." — Bonnie`,
  ];
  const blessing = blessings[(hash >> 3) % blessings.length];

  return {
    productId: product.id,
    title: product.title,
    price: product.price,
    category: product.category,
    imageUrl: product.transparentLocalUrl,
    rarity,
    rarityColor: RARITY_COLORS[rarity],
    lore,
    stats,
    blessing,
  };
}

/**
 * Get a random product appraisal
 */
export function getRandomAppraisal(): RPGProductAppraisal {
  const all = getAllCatalogProducts();
  const randomIndex = Math.floor(Math.random() * all.length);
  return generateRPGAppraisal(all[randomIndex]);
}

/**
 * Render 16-bit RPG Item Appraisal Parchment Card on Canvas
 */
export function renderAppraisalCard(
  ctx: CanvasRenderingContext2D,
  appraisal: RPGProductAppraisal,
  x: number,
  y: number,
  w: number,
  h: number,
  _frameCount: number = 0,
  propImg?: HTMLImageElement
): void {
  ctx.save();

  // 1. Parchment Card Background
  ctx.fillStyle = 'rgba(253, 251, 248, 0.96)';
  ctx.fillRect(x, y, w, h);

  // 2. Retro Double Border (Mahogany & Rose Gold)
  ctx.strokeStyle = '#4c0519';
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);

  ctx.strokeStyle = '#e8748a';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);

  // 3. Header Ribbon (Rarity Colored)
  ctx.fillStyle = appraisal.rarityColor;
  ctx.fillRect(x + 8, y + 8, w - 16, 20);

  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText(`✦ ${appraisal.rarity.toUpperCase()} RELIC ✦`, x + 14, y + 21);

  ctx.textAlign = 'right';
  ctx.fillText(`LVL 99`, x + w - 14, y + 21);

  // 4. Product Image Showcase Box
  const imgBoxW = 48;
  const imgBoxH = 48;
  const imgBoxX = x + 12;
  const imgBoxY = y + 34;

  ctx.fillStyle = 'rgba(232, 116, 138, 0.12)';
  ctx.fillRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH);
  ctx.strokeStyle = '#e8748a';
  ctx.lineWidth = 1;
  ctx.strokeRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH);

  if (propImg && propImg.complete && propImg.naturalWidth > 0) {
    ctx.drawImage(propImg, imgBoxX + 4, imgBoxY + 4, imgBoxW - 8, imgBoxH - 8);
  } else {
    // Procedural gem fallback
    ctx.fillStyle = appraisal.rarityColor;
    ctx.fillRect(imgBoxX + 16, imgBoxY + 16, 16, 16);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(imgBoxX + 20, imgBoxY + 20, 8, 8);
  }

  // 5. Title & Category
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1e1b4b';
  ctx.font = 'bold 10px monospace';

  // Truncate title if too long
  let displayTitle = appraisal.title;
  if (ctx.measureText(displayTitle).width > w - imgBoxW - 35) {
    while (displayTitle.length > 0 && ctx.measureText(displayTitle + '…').width > w - imgBoxW - 35) {
      displayTitle = displayTitle.slice(0, -1);
    }
    displayTitle += '…';
  }
  ctx.fillText(displayTitle, x + imgBoxW + 20, y + 46);

  ctx.font = '8px monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`Type: ${appraisal.category}`, x + imgBoxW + 20, y + 58);

  // 6. RPG Stat Bars (3 Stats)
  const statsStartY = y + 90;
  appraisal.stats.forEach((stat, idx) => {
    const sy = statsStartY + idx * 16;

    // Stat Label
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(stat.formatted, x + 14, sy + 8);

    // Stat Mini Bar
    const barX = x + w - 70;
    const barW = 56;
    const barH = 6;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(barX, sy + 2, barW, barH);

    ctx.fillStyle =
      stat.statType === 'cozy'
        ? '#f43f5e'
        : stat.statType === 'speed'
        ? '#0284c7'
        : stat.statType === 'protection'
        ? '#16a34a'
        : stat.statType === 'focus'
        ? '#7c3aed'
        : '#d97706';

    const fillRatio = Math.min(1.0, stat.value / 60);
    ctx.fillRect(barX, sy + 2, Math.floor(barW * fillRatio), barH);
  });

  // 7. Lore Divider
  const divY = y + 144;
  ctx.strokeStyle = 'rgba(76, 5, 25, 0.2)';
  ctx.beginPath();
  ctx.moveTo(x + 12, divY);
  ctx.lineTo(x + w - 12, divY);
  ctx.stroke();

  // 8. Lore Quote (Wrapped)
  ctx.font = 'italic 7px monospace';
  ctx.fillStyle = '#475569';
  const loreLines = wrapCanvasText(ctx, `“${appraisal.lore}”`, w - 24);
  loreLines.slice(0, 2).forEach((line, li) => {
    ctx.fillText(line, x + 12, divY + 11 + li * 9);
  });

  // 9. Grandma's Blessing Footer
  ctx.font = 'bold 7px monospace';
  ctx.fillStyle = '#e11d48';
  ctx.fillText(`♥ Grandma's Certified Handcrafted`, x + 12, y + h - 9);

  ctx.restore();
}

/**
 * Helper to wrap text for canvas drawing
 */
function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}
