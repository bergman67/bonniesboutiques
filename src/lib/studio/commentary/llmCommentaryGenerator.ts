/**
 * src/lib/studio/commentary/llmCommentaryGenerator.ts
 *
 * Resilient Gemini LLM Commentary Generator with model fallback list,
 * negative constraint injection, 5-second timeout, and strict schema validation.
 */

import type { SkitTemplate, SkitBeat } from '../skitTemplates';
import type { CharacterExpression, CharacterAction, CharacterId } from '../characterRig';
import type { CatalogProduct } from '../rpgAppraisal';
import type { AntiRepetitionLedger, ShowFormatId } from './types';
import type { BackdropId } from '../backdrops';
import { getWildlifeScenarioByClip } from './proceduralGenerator';

const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
const TIMEOUT_MS = 5000;

export interface LlmGenerationOptions {
  product: CatalogProduct;
  format: ShowFormatId;
  ledger?: AntiRepetitionLedger;
  clipFile?: string;
  customTopic?: string;
  reactionLabel?: string;
  apiKey?: string;
}

const VALID_EXPRESSIONS = new Set<CharacterExpression>([
  'happy',
  'shocked',
  'sleepy',
  'laughing',
  'proud grandma',
  'eye-rolling daughter',
]);

const VALID_ACTIONS = new Set<CharacterAction>([
  'idle',
  'walk',
  'turn',
  'laugh',
  'gasp',
  'hold trinket',
  'sip tea',
  'pack box',
]);

const VALID_SPEAKERS = new Set<CharacterId>(['bonnie', 'tammy', 'narrator']);

function getBackdropForFormat(format: ShowFormatId): BackdropId {
  switch (format) {
    case 'chaotic_grandma_hot_takes':
      return 'morning_coffee_prep';
    case 'cozy_boutique_lore':
      return 'rainy_window_crafting';
    case 'craft_breakdown_asmr':
      return 'closing_time_lofi';
    case 'wild_nature_commentary':
    case 'vintage_relic_debates':
    case 'gen_z_culture_clash':
    default:
      return 'cozy_night_shop';
  }
}

/**
 * Validates that the raw LLM output conforms to the required skit schema.
 */
export function validateLlmSkitSchema(
  raw: unknown,
  product: CatalogProduct,
  format: ShowFormatId
): SkitTemplate | null {
  if (!raw || typeof raw !== 'object') return null;
  const rawObj = raw as Record<string, unknown>;
  if (typeof rawObj.title !== 'string' || rawObj.title.trim().length === 0) return null;
  if (!Array.isArray(rawObj.beats) || rawObj.beats.length < 4 || rawObj.beats.length > 6) return null;

  const validBeats: SkitBeat[] = [];
  const skitId = `skit_llm_${format}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  for (let i = 0; i < rawObj.beats.length; i++) {
    const b = rawObj.beats[i];
    if (!b || typeof b !== 'object') return null;
    const beatObj = b as Record<string, unknown>;
    if (typeof beatObj.dialogue !== 'string' || beatObj.dialogue.trim().length < 5) return null;

    const speakerStr = typeof beatObj.speaker === 'string' ? beatObj.speaker : '';
    const speaker: CharacterId = VALID_SPEAKERS.has(speakerStr as CharacterId)
      ? (speakerStr as CharacterId)
      : i % 2 === 0
      ? 'tammy'
      : 'bonnie';
    const exprStr = typeof beatObj.expression === 'string' ? beatObj.expression : '';
    const expression: CharacterExpression = VALID_EXPRESSIONS.has(exprStr as CharacterExpression)
      ? (exprStr as CharacterExpression)
      : speaker === 'bonnie'
      ? 'proud grandma'
      : 'eye-rolling daughter';
    const actionStr = typeof beatObj.action === 'string' ? beatObj.action : '';
    const action: CharacterAction = VALID_ACTIONS.has(actionStr as CharacterAction)
      ? (actionStr as CharacterAction)
      : i === rawObj.beats.length - 1
      ? 'hold trinket'
      : 'turn';

    const beatDuration =
      typeof beatObj.durationSec === 'number' && beatObj.durationSec >= 3 && beatObj.durationSec <= 8
        ? beatObj.durationSec
        : Math.max(3.5, Math.min(6.5, Math.round(beatObj.dialogue.split(/\s+/).length * 0.35 * 10) / 10));

    validBeats.push({
      id: `${skitId}_b${i + 1}`,
      speaker,
      expression,
      action,
      dialogue: beatObj.dialogue.trim(),
      propId: action === 'hold trinket' || i === rawObj.beats.length - 1 ? product.id : undefined,
      durationSec: beatDuration,
      soundEffect: i === 0 ? 'gasp' : i === rawObj.beats.length - 1 ? 'chime' : 'laugh',
      showAppraisalCard: format === 'vintage_relic_debates',
      fourthWallEffect: i === rawObj.beats.length - 1 ? 'camera_zoom' : undefined,
    });
  }

  const durationSeconds = Math.round(validBeats.reduce((sum, beat) => sum + (beat.durationSec || 5), 0));

  return {
    id: skitId,
    title: (rawObj.title as string).trim().slice(0, 60),
    category: format,
    durationSeconds,
    defaultBackdrop: getBackdropForFormat(format),
    defaultPropId: product.id,
    description: typeof rawObj.description === 'string' ? rawObj.description : `AI Commentary on ${product.title}`,
    beats: validBeats,
  };
}

/**
 * Constructs prompt with negative constraints injected from the rolling ledger.
 */
function buildPrompt(options: LlmGenerationOptions): string {
  const { product, format, ledger, reactionLabel, customTopic, clipFile } = options;

  let negativeBlock = '';
  if (ledger && ledger.episodes.length > 0) {
    const recent = ledger.episodes.slice(-12);
    const recentHooks = recent.map((e) => `"${e.openingHook}"`).slice(-6);
    const recentPunchlines = recent.map((e) => `"${e.punchline}"`).slice(-6);
    const recentTitles = recent.map((e) => `"${e.title}"`).slice(-8);

    negativeBlock = `
CRITICAL ANTI-REPETITION CONSTRAINTS:
1. Do NOT use or repeat any of these recently used episode titles:
${recentTitles.map((t) => `   - ${t}`).join('\n')}
2. Do NOT use or paraphrase any of these recently used opening hooks:
${recentHooks.map((h) => `   - ${h}`).join('\n')}
3. Do NOT use or paraphrase any of these recently used punchlines or call-to-actions:
${recentPunchlines.map((p) => `   - ${p}`).join('\n')}
4. STRICTLY AVOID repetitive boilerplate phrases such as:
   - "Mom look at the shop TV!"
   - "Oh bless his heart, he looks freezing!"
   - "I am knitting him a rose velvet sweater right now!"
   - "+10,000 unbothered aura"
   - "Listen up honey! Tap our link"
   - "Tap the link below at btboutiqe.com"
`;
  }

  const resolvedClipAnimal = clipFile ? getWildlifeScenarioByClip(clipFile)?.animal : undefined;
  const effectiveReactionLabel = reactionLabel || resolvedClipAnimal || 'wild creatures in action';

  const formatGuidance: Record<ShowFormatId, string> = {
    wild_nature_commentary: `Show Format: "Channel 42 Wildlife Watch". Bonnie and Tammy react to viral nature video clip: "${effectiveReactionLabel}". Bonnie interprets the creature through grandma home remedies and domestic care; Tammy roasts her with fast internet wit.`,
    chaotic_grandma_hot_takes: `Show Format: "Grandma Unfiltered". Bonnie delivers an unhinged, hilarious common-sense hot take on modern technology, smart appliances, or modern trends (${customTopic || 'smart appliances and subscription services'}). Tammy tries to explain modern reality and gets defeated.`,
    cozy_boutique_lore: `Show Format: "Behind the Counter Chronicles". Bonnie shares cozy, whimsical micro-lore or a funny behind-the-scenes mystery from the boutique. Tammy fact-checks with hilarious shop receipts.`,
    vintage_relic_debates: `Show Format: "Relic Radar". Appraise the featured handmade product as if it were a high-tier fantasy RPG artifact. Tammy reads RPG stats and stats cards; Bonnie blesses the item with grandma magic.`,
    gen_z_culture_clash: `Show Format: "Aura Checks & Brainrot". Direct clash of modern internet slang with grandma vocabulary. Bonnie uses modern slang with devastating accidental accuracy or misunderstands it wholesome-style.`,
    craft_breakdown_asmr: `Show Format: "The Triple-Knot Tension Lab". Tactile breakdown of the handmade product's engineering, triple-knot tension, glass bead acoustics, and anti-stress thumb spins. Tammy evaluates tensile metrics; Bonnie shares stress-test stories.`,
  };

  return `You are the lead comedy scriptwriter for "Bonnie & Tammy's Trinket Tales" (btboutiqe.com).
Characters:
- "bonnie": 74-year-old maternal, slightly eccentric grandma who knits, bakes, crafts handmade beaded pens & charms, and loves tea.
- "tammy": Her witty Gen-Z daughter who manages the shop and lovingly roasts Bonnie's vintage logic.

Featured Product: "${product.title}" ($${product.price.toFixed(2)}, Category: ${product.category})
Craft Highlights to Weave Naturally When Relevant: Handcrafted one by one in Clearbrook, Virginia; beaded pens feature smooth-writing refillable 1.0mm black ink & wipe-clean silicone/focal beads loved by teachers, nurses, and gift-givers.
${formatGuidance[format]}
${negativeBlock}

Write a high-retention 4-beat conversational comedy skit with natural banter, interruptions, character-specific humor, and a punchy Beat 4 ending that loops smoothly back into Beat 1's opening energy (never use pushy infomercial sales pitches).
Return ONLY valid JSON matching this exact structure:
{
  "title": "Creative 3-6 word episode title",
  "description": "1-sentence episode summary",
  "beats": [
    {
      "speaker": "tammy" | "bonnie",
      "expression": "happy" | "shocked" | "sleepy" | "laughing" | "proud grandma" | "eye-rolling daughter",
      "action": "idle" | "walk" | "turn" | "laugh" | "gasp" | "hold trinket" | "sip tea" | "pack box",
      "dialogue": "Natural spoken dialogue line (50-130 chars)",
      "durationSec": 5.0
    }
  ]
}`;
}

/**
 * Attempts to generate a commentary skit via Gemini API with model fallbacks and 5s timeout.
 */
export async function generateLlmCommentary(options: LlmGenerationOptions): Promise<SkitTemplate | null> {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const prompt = buildPrompt(options);

  for (const model of GEMINI_MODELS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.95,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[llmCommentaryGenerator] Model ${model} returned HTTP ${response.status}. Trying next fallback.`);
        continue;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        continue;
      }

      const parsed = JSON.parse(rawText);
      const validatedSkit = validateLlmSkitSchema(parsed, options.product, options.format);
      if (validatedSkit) {
        return validatedSkit;
      }
    } catch (err: unknown) {
      const errorObj = err as { name?: string; message?: string } | null;
      if (errorObj?.name === 'AbortError') {
        console.warn(`[llmCommentaryGenerator] Model ${model} timed out after ${TIMEOUT_MS}ms.`);
      } else {
        console.warn(`[llmCommentaryGenerator] Error with model ${model}:`, errorObj?.message || err);
      }
    }
  }

  return null;
}
