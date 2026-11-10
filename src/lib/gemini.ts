import prisma from '@/lib/prisma';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export type ProductCategory =
  | 'Beaded Pens'
  | 'Keychains'
  | 'Charms & Bookmarks'
  | 'Diamond Art'
  | 'Accessories';

export interface ProductAnalysisResult {
  title: string;
  description: string;
  category: ProductCategory;
  price: number;
}

export interface AnalyzePhotoOptions {
  imageBuffer: Buffer;
  mimeType?: string;
  excludeTitles?: string[];
  apiKeyOverride?: string;
}

/**
 * Resolves the effective Gemini API key:
 * 1. apiKeyOverride if passed and valid
 * 2. StoreSettings table in database (allows dynamic rotation in admin)
 * 3. process.env.GEMINI_API_KEY environment variable (Netlify / local fallback)
 */
export async function getEffectiveGeminiApiKey(apiKeyOverride?: string): Promise<string | null> {
  if (apiKeyOverride && apiKeyOverride.trim() && !apiKeyOverride.includes('••••')) {
    return apiKeyOverride.trim();
  }

  try {
    const settings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
    if (settings?.geminiApiKey && settings.geminiApiKey.trim()) {
      return settings.geminiApiKey.trim();
    }
  } catch (err) {
    console.warn('Could not read geminiApiKey from StoreSettings:', err);
  }

  return process.env.GEMINI_API_KEY || null;
}

/**
 * Normalizes model category output to match Bonnie's Boutique catalog categories exactly.
 */
function normalizeCategory(rawCategory: string | undefined): ProductCategory {
  if (!rawCategory) return 'Keychains';
  const lower = rawCategory.toLowerCase();
  if (lower.includes('diamond') || lower.includes('framed') || lower.includes('art')) {
    return 'Diamond Art';
  }
  if (
    lower.includes('accessor') ||
    lower.includes('bracelet') ||
    lower.includes('wristlet') ||
    lower.includes('set')
  ) {
    return 'Accessories';
  }
  if (lower.includes('pen')) {
    return 'Beaded Pens';
  }
  if (lower.includes('charm') || lower.includes('bookmark') || lower.includes('tassel')) {
    return 'Charms & Bookmarks';
  }
  return 'Keychains';
}

/**
 * Builds the system prompt tailored to Bonnie's Boutique handcrafted trinkets.
 */
function buildSystemPrompt(excludeTitles: string[] = []): string {
  const cleanExclusions = excludeTitles.filter(t => typeof t === 'string' && t.trim().length > 0);
  const exclusionsText = cleanExclusions.length > 0
    ? `\n\nCRITICAL TITLE EXCLUSIONS (The user clicked "Suggest Another Name"):
You MUST NOT return any of these previously generated titles:
${JSON.stringify(cleanExclusions)}
You MUST generate a FRESH, DISTINCT, and CREATIVE alternative title highlighting different aspects, colors, or vibes.`
    : '';

  return `You are the master artisan and catalog curator for Bonnie's Boutique (B&T Trinkets) at btboutiqe.com, a family-run boutique known for handmade beaded pens, keychains, and charms & bookmarks crafted by Bonnie and her daughter Tammy.
Your task is to visually inspect an uploaded product photo and produce accurate, delightful product catalog metadata matching Bonnie's Boutique signature warm style.

Rules:
1. CATEGORY: Exactly one of:
   - "Beaded Pens" (if the item is a ballpoint pen with decorative beads threaded on the shaft)
   - "Keychains" (if the item features a split ring, lobster clasp, or beaded keychain lanyard)
   - "Charms & Bookmarks" (if the item is a metal bookmark hook, purse charm, zipper pull, planner charm, or hanging tassel)
   - "Diamond Art" (if the item is a framed diamond painting, rhinestone canvas portrait, or gem art piece)
   - "Accessories" (if the item is a beaded bracelet, stretch wristlet, matching pen & keychain gift set, or wearable accessory)

2. TITLE: A creative, catchy product title (3 to 6 words) matching Bonnie's Boutique style:
   - Accurately identify and describe the focal charm / topper (e.g. Butterfly, Sea Turtle, Highland Cow, Daisy, Sunflower, Teddy Bear, Pumpkin, Ghost, Heart, Cross, Angel, Puppy Paw).
   - Mention prominent bead colors, textures, or themes (e.g. Sparkling Rose, Ocean Wave Blue, Mint Green, Lavender, Golden Orange, Black & Gold, Pastel, Caramel, Iridescent).
   - Must end with the item type matching the category:
     * For Beaded Pens: end with "Pen" or "Beaded Pen"
     * For Keychains: end with "Keychain", "Beaded Keychain", "Wristlet", or "Beaded Loop"
     * For Charms & Bookmarks: end with "Charm", "Bookmark Charm", or "Bookmark"${exclusionsText}

3. DESCRIPTION: Exactly 1 to 2 warm, charming sentences describing the visual details: the charm topper, bead textures (silicone focal beads, crystal faceted spacers, rhinestone rondelles, patterned acrylic beads), color harmony, and handmade craft charm.

4. PRICE: Always return default price 8.00.

Output MUST be valid JSON adhering strictly to:
{
  "title": string,
  "description": string,
  "category": "Beaded Pens" | "Keychains" | "Charms & Bookmarks",
  "price": 8.00
}`;
}

/**
 * Strips potential markdown code blocks (```json ... ```) from Gemini response.
 */
function extractJsonText(rawText: string): string {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

/**
 * Analyzes a product image using Gemini Vision with dual-model fallback:
 * Primary: gemini-flash-latest
 * Secondary fallback: gemini-3.8-flash (note: gemini-2.5-flash is 404 deprecated)
 */
export async function analyzeProductPhoto(
  options: AnalyzePhotoOptions
): Promise<{ result: ProductAnalysisResult; modelUsed: string }> {
  const { imageBuffer, mimeType = 'image/png', excludeTitles = [], apiKeyOverride } = options;

  const apiKey = await getEffectiveGeminiApiKey(apiKeyOverride);
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in StoreSettings or environment variables.');
  }

  // Dual-model fallback hierarchy (gemini-flash-latest primary, gemini-3.8-flash fallback)
  const models = ['gemini-flash-latest', 'gemini-3.8-flash'];
  const base64Image = imageBuffer.toString('base64');
  const systemInstruction = buildSystemPrompt(excludeTitles);

  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            parts: [
              { text: systemInstruction },
              {
                inlineData: {
                  mimeType,
                  data: base64Image,
                },
              },
              {
                text: 'Inspect this handcrafted boutique product photo and return the structured catalog JSON.',
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000), // 15s timeout
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`Gemini model ${model} failed (${res.status}): ${errorText}`);
        lastError = new Error(`Gemini API error [${model}] ${res.status}: ${errorText}`);
        continue;
      }

      const json = await res.json();
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error(`Model ${model} returned empty content.`);
      }

      const cleanedText = extractJsonText(rawText);
      const parsed: ProductAnalysisResult = JSON.parse(cleanedText);

      if (!parsed.title || !parsed.description) {
        throw new Error(`Incomplete response fields from ${model}: ${rawText}`);
      }

      parsed.category = normalizeCategory(parsed.category);
      parsed.price = 8.00;

      // In the rare event that the model returns an excluded title, make it distinct
      if (excludeTitles.length > 0 && excludeTitles.includes(parsed.title)) {
        const freshAdjectives = ['Artisan', 'Delightful', 'Custom', 'Whimsical', 'Handcrafted', 'Elegant'];
        const randomAdj = freshAdjectives[Math.floor(Math.random() * freshAdjectives.length)];
        parsed.title = `${randomAdj} ${parsed.title}`;
      }

      return {
        result: parsed,
        modelUsed: model,
      };
    } catch (err: unknown) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      console.warn(`Error attempting Gemini model ${model}:`, errorObj.message);
      lastError = errorObj;
    }
  }

  // Graceful fallback if models rate-limited or unavailable: analyze actual image pixels, colors & silhouette
  console.warn('All Gemini models failed or rate-limited; running local pixel-vision catalog analyzer.', lastError?.message);
  const fallback = analyzeImagePixelsHeuristic(imageBuffer, excludeTitles);
  return {
    result: fallback,
    modelUsed: 'heuristic-fallback',
  };
}

/**
 * Local Pixel-Vision Color, Silhouette & Geometry Analyzer
 * Inspects the actual uploaded image's foreground pixels, color histogram, aspect ratio,
 * and center-loop transparency so every item gets an accurate, color-true title & category
 * even when the remote Gemini API key is rate-limited or out of quota.
 */
function analyzeImagePixelsHeuristic(
  imageBuffer: Buffer,
  excludeTitles: string[] = []
): ProductAnalysisResult {
  try {
    let width = 0;
    let height = 0;
    let rgba: Uint8Array | Buffer | null = null;

    if (imageBuffer.length >= 8 && imageBuffer.subarray(0, 8).equals(PNG_MAGIC)) {
      const decoded = PNG.sync.read(imageBuffer);
      width = decoded.width;
      height = decoded.height;
      rgba = decoded.data;
    } else if (imageBuffer.length > 4 && imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8) {
      const decoded = jpeg.decode(imageBuffer, { useTArray: true, maxResolutionInMP: 64 });
      width = decoded.width;
      height = decoded.height;
      rgba = decoded.data;
    }

    if (rgba && width > 0 && height > 0) {
      let minX = width, maxX = 0, minY = height, maxY = 0;
      let fgCount = 0;

      const buckets: Record<string, number> = {
        Turquoise: 0,
        'Ocean Blue': 0,
        'Spring Green': 0,
        'Blush Rose': 0,
        'Ruby Red': 0,
        'Golden Honey': 0,
        'Terracotta': 0,
        'Lavender': 0,
        'Midnight Black': 0,
        'Pearl White': 0,
      };

      const step = Math.max(1, Math.floor(Math.max(width, height) / 200));
      let hasTransparency = false;
      for (let i = 3; i < rgba.length; i += 4 * step) {
        if (rgba[i] < 50) {
          hasTransparency = true;
          break;
        }
      }

      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const idx = (y * width + x) * 4;
          const r = rgba[idx];
          const g = rgba[idx + 1];
          const b = rgba[idx + 2];
          const a = rgba[idx + 3];

          if (hasTransparency && a < 80) continue;
          if (!hasTransparency && (x < width * 0.12 || x > width * 0.88 || y < height * 0.12 || y > height * 0.88)) {
            continue;
          }

          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          fgCount++;

          const maxC = Math.max(r, g, b);
          const minC = Math.min(r, g, b);
          const chroma = maxC - minC;

          if (maxC < 52) {
            buckets['Midnight Black'] += 0.6;
          } else if (minC > 195 && chroma < 28) {
            buckets['Pearl White'] += 0.6;
          } else if (g > 130 && b > 130 && r < 115 && Math.abs(g - b) < 55) {
            buckets['Turquoise'] += 1.4;
          } else if (b > 130 && b > r + 40 && b >= g) {
            buckets['Ocean Blue'] += 1.3;
          } else if (g > 115 && g > r + 22 && g > b + 15) {
            buckets['Spring Green'] += 1.2;
          } else if (r > 175 && g < 165 && b > 105 && r > g + 20) {
            buckets['Blush Rose'] += 1.3;
          } else if (r > 155 && g < 75 && b < 80) {
            buckets['Ruby Red'] += 1.3;
          } else if (r > 180 && g > 145 && b < 95) {
            buckets['Golden Honey'] += 1.3;
          } else if (r > 140 && g >= 65 && g <= 145 && b < 85 && r > g + 25) {
            buckets['Terracotta'] += 1.2;
          } else if (b > 115 && r > 95 && g < Math.min(r, b) - 12) {
            buckets['Lavender'] += 1.3;
          }
        }
      }

      if (fgCount > 20 && maxX > minX && maxY > minY) {
        const cropW = maxX - minX + 1;
        const cropH = maxY - minY + 1;
        const aspect = cropH / cropW;

        // Check if center is hollow (like a beaded wristlet/bracelet ring)
        const cx = Math.round((minX + maxX) / 2);
        const cy = Math.round((minY + maxY) / 2);
        const centerAlpha = rgba[(cy * width + cx) * 4 + 3];
        const isHollowRing = hasTransparency && centerAlpha < 40 && aspect >= 0.72 && aspect <= 1.35;

        let category: ProductCategory = 'Keychains';
        let itemSuffixes = ['Beaded Keychain', 'Bag Charm & Keychain', 'Beaded Keychain Loop', 'Artisan Keychain'];

        if (aspect >= 3.15) {
          category = 'Beaded Pens';
          itemSuffixes = ['Beaded Pen', 'Artisan Beaded Pen', 'Handcrafted Pen', 'Signature Beaded Pen'];
        } else if (isHollowRing) {
          category = 'Accessories';
          itemSuffixes = ['Beaded Bracelet', 'Beaded Wristlet', 'Stretch Bracelet', 'Beaded Loop Bracelet'];
        } else if (aspect >= 0.80 && aspect <= 1.22 && !isHollowRing && fgCount > (width * height) / (step * step) * 0.45) {
          category = 'Diamond Art';
          itemSuffixes = ['Framed Diamond Art', 'Diamond Art Portrait', 'Framed Gem Art', 'Artisan Diamond Art'];
        } else if (aspect >= 0.80 && aspect <= 1.22 && !isHollowRing) {
          category = 'Charms & Bookmarks';
          itemSuffixes = ['Artisan Charm', 'Boutique Collector Charm', 'Handcrafted Accent Charm', 'Signature Charm'];
        }

        const chromaticEntries = Object.entries(buckets)
          .filter(([name, score]) => name !== 'Midnight Black' && name !== 'Pearl White' && score > fgCount * 0.015)
          .sort((a, b) => b[1] - a[1]);

        const neutralEntries = Object.entries(buckets)
          .filter(([name, score]) => (name === 'Midnight Black' || name === 'Pearl White') && score > fgCount * 0.05)
          .sort((a, b) => b[1] - a[1]);

        const sortedColors = [
          ...chromaticEntries.map(([name]) => name),
          ...neutralEntries.map(([name]) => name),
        ];

        const primaryColor = sortedColors[0] || 'Sparkling';
        const secondaryColor = sortedColors[1] || '';

        const styleAdjectives = ['Shimmering', 'Handcrafted', 'Radiant', 'Charming', 'Artisan', 'Vibrant', 'Lovely', 'Signature'];

        const candidates: string[] = [];
        for (const suffix of itemSuffixes) {
          if (secondaryColor) {
            candidates.push(`${primaryColor} & ${secondaryColor} ${suffix}`);
          }
          for (const adj of styleAdjectives) {
            candidates.push(`${adj} ${primaryColor} ${suffix}`);
            if (secondaryColor) {
              candidates.push(`${adj} ${primaryColor} & ${secondaryColor} ${suffix}`);
            }
          }
        }

        const chosenTitle =
          candidates.find((c) => !excludeTitles.includes(c)) ||
          `${primaryColor} Handcrafted ${itemSuffixes[0]} #${Math.floor(Math.random() * 90 + 10)}`;

        const colorPhrase = secondaryColor
          ? `${primaryColor.toLowerCase()} and ${secondaryColor.toLowerCase()}`
          : primaryColor.toLowerCase();

        return {
          title: chosenTitle,
          description: `Handcrafted ${chosenTitle.toLowerCase()} featuring ${colorPhrase} tones, lustrous beadwork, and signature B&T Trinkets artisan detail.`,
          category,
          price: 8.00,
        };
      }
    }
  } catch (err) {
    console.warn('[gemini] Local pixel heuristic error:', err);
  }

  return generateHeuristicFallback(excludeTitles);
}

/**
 * Intelligent heuristic fallback generator if all remote Gemini models are unreachable or rate-limited.
 */
function generateHeuristicFallback(excludeTitles: string[] = []): ProductAnalysisResult {
  const adjectives = ['Sparkling', 'Charming', 'Playful', 'Sweet', 'Radiant', 'Pastel', 'Cozy', 'Vibrant', 'Golden', 'Lovely'];
  const toppers = ['Butterfly', 'Puppy Paw', 'Sunflower', 'Heart', 'Daisy', 'Rose', 'Sea Turtle', 'Highland Cow', 'Angel'];

  let chosenTitle = '';
  for (let attempt = 0; attempt < 20; attempt++) {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const top = toppers[Math.floor(Math.random() * toppers.length)];
    const candidate = `${adj} ${top} Beaded Keychain`;
    if (!excludeTitles.includes(candidate)) {
      chosenTitle = candidate;
      break;
    }
  }

  if (!chosenTitle) {
    chosenTitle = `Handmade Boutique Beaded Trinket #${Math.floor(Math.random() * 900 + 100)}`;
  }

  return {
    title: chosenTitle,
    description: "A lovely handcrafted boutique trinket beaded with care by Bonnie & Tammy, featuring colorful accents and charming detail.",
    category: 'Keychains',
    price: 8.00,
  };
}
