/**
 * src/lib/studio/commentary/antiRepetitionLedger.ts
 *
 * Persistent Anti-Repetition Ledger & Trigram Overlap Gatekeeper.
 * Enforces < 15% pairwise trigram overlap across a rolling 12-episode window,
 * LRU show format rotation, and product/reaction clip cooldowns.
 */

import fs from 'fs';
import path from 'path';
import type {
  AntiRepetitionLedger,
  EpisodeLedgerEntry,
  ShowFormatId,
  TrigramOverlapReport,
} from './types';
import { ALL_SHOW_FORMATS } from './types';
import type { CatalogProduct } from '../rpgAppraisal';

const DEFAULT_LEDGER_FILE =
  typeof window === 'undefined' && path && typeof path.join === 'function'
    ? path.join(process.cwd(), 'public', 'exports', 'anti-repetition-ledger.json')
    : 'public/exports/anti-repetition-ledger.json';
const DEFAULT_WINDOW_SIZE = 12;

/**
 * Creates an empty, valid AntiRepetitionLedger structure.
 */
export function createEmptyLedger(windowSize: number = DEFAULT_WINDOW_SIZE): AntiRepetitionLedger {
  const initialCounts: Record<ShowFormatId, number> = {
    wild_nature_commentary: 0,
    chaotic_grandma_hot_takes: 0,
    cozy_boutique_lore: 0,
    vintage_relic_debates: 0,
    gen_z_culture_clash: 0,
    craft_breakdown_asmr: 0,
  };

  return {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    rollingWindowSize: windowSize,
    episodes: [],
    stats: {
      totalGenerated: 0,
      formatCounts: initialCounts,
      maxRecordedOverlap: 0,
    },
  };
}

/**
 * Loads the ledger from disk or creates a default instance if not found.
 */
export function loadLedger(customPath?: string): AntiRepetitionLedger {
  const targetPath = customPath || DEFAULT_LEDGER_FILE;

  if (typeof window !== 'undefined') {
    // In browser environment, fallback to memory ledger
    return createEmptyLedger();
  }

  try {
    if (fs.existsSync(targetPath)) {
      const raw = fs.readFileSync(targetPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.episodes)) {
        // Ensure stats and formatCounts exist
        if (!parsed.stats) parsed.stats = {};
        if (!parsed.stats.formatCounts) {
          parsed.stats.formatCounts = {
            wild_nature_commentary: 0,
            chaotic_grandma_hot_takes: 0,
            cozy_boutique_lore: 0,
            vintage_relic_debates: 0,
            gen_z_culture_clash: 0,
            craft_breakdown_asmr: 0,
          };
        }
        return parsed as AntiRepetitionLedger;
      }
    }
  } catch (err) {
    console.warn(`[antiRepetitionLedger] Warning: Failed to parse ledger at ${targetPath}, reinitializing:`, err);
  }

  const fresh = createEmptyLedger();
  saveLedger(fresh, targetPath);
  return fresh;
}

/**
 * Persists the ledger to disk.
 */
export function saveLedger(ledger: AntiRepetitionLedger, customPath?: string): void {
  if (typeof window !== 'undefined') {
    return;
  }

  const targetPath = customPath || DEFAULT_LEDGER_FILE;
  try {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    ledger.lastUpdated = new Date().toISOString();
    fs.writeFileSync(targetPath, JSON.stringify(ledger, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[antiRepetitionLedger] Error: Failed to write ledger to ${targetPath}:`, err);
  }
}

/**
 * Resets the ledger to an empty initial state.
 */
export function resetLedger(customPath?: string): AntiRepetitionLedger {
  const empty = createEmptyLedger();
  saveLedger(empty, customPath);
  return empty;
}

/**
 * Tokenizes arbitrary dialogue text into normalized word tokens.
 * Strips punctuation, lowers case, and collapses whitespace.
 */
export function tokenizeText(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
}

/**
 * Extracts all unique 3-word n-grams (trigrams) from text or tokens.
 */
export function extractTrigrams(input: string | string[]): string[] {
  const tokens = typeof input === 'string' ? tokenizeText(input) : input;
  if (tokens.length < 3) {
    return [];
  }

  const trigramsSet = new Set<string>();
  for (let i = 0; i <= tokens.length - 3; i++) {
    trigramsSet.add(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`);
  }

  return Array.from(trigramsSet);
}

/**
 * Calculates directed trigram overlap: |intersection| / |candidateTrigrams|.
 */
export function calculateTrigramOverlap(
  candidateTrigrams: string[] | Set<string>,
  recordedTrigrams: string[] | Set<string>
): { overlapRatio: number; commonTrigrams: string[] } {
  const candSet = candidateTrigrams instanceof Set ? candidateTrigrams : new Set(candidateTrigrams);
  const recSet = recordedTrigrams instanceof Set ? recordedTrigrams : new Set(recordedTrigrams);

  if (candSet.size === 0) {
    return { overlapRatio: 0, commonTrigrams: [] };
  }

  const common: string[] = [];
  candSet.forEach((trigram) => {
    if (recSet.has(trigram)) {
      common.push(trigram);
    }
  });

  const overlapRatio = common.length / candSet.size;
  return { overlapRatio, commonTrigrams: common };
}

/**
 * Checks if an episode title was used within the rolling cooldown window.
 */
export function isTitleOnCooldown(
  title: string,
  ledger: AntiRepetitionLedger,
  windowSize: number = DEFAULT_WINDOW_SIZE
): boolean {
  if (!title) return false;
  const normalized = title.trim().toLowerCase();
  const recent = ledger.episodes.slice(-windowSize);
  return recent.some((ep) => ep.title.trim().toLowerCase() === normalized);
}

/**
 * Validates whether a candidate script passes the < 15% trigram overlap threshold
 * against the rolling window of recorded episodes, and ensures title uniqueness.
 */
export function validateCandidateScript(
  candidateText: string,
  ledger: AntiRepetitionLedger,
  threshold: number = 0.15,
  candidateTitle?: string
): TrigramOverlapReport {
  const windowSize = ledger.rollingWindowSize || DEFAULT_WINDOW_SIZE;
  const recentEpisodes = ledger.episodes.slice(-windowSize);

  let titleCollision = false;
  if (candidateTitle) {
    titleCollision = isTitleOnCooldown(candidateTitle, ledger, windowSize);
  }

  const candidateTrigrams = extractTrigrams(candidateText);

  if (candidateTrigrams.length === 0) {
    return {
      passed: !titleCollision,
      maxOverlap: 0,
      offendingTrigrams: [],
      titleCollision,
    };
  }

  let maxOverlap = 0;
  let worstEpisodeId: string | undefined;
  let offendingTrigrams: string[] = [];

  const candSet = new Set(candidateTrigrams);

  for (const ep of recentEpisodes) {
    const recSet = new Set(ep.trigrams);
    const common: string[] = [];
    candSet.forEach((trigram) => {
      if (recSet.has(trigram)) {
        common.push(trigram);
      }
    });

    const candRatio = candSet.size > 0 ? common.length / candSet.size : 0;
    const recRatio = recSet.size > 0 ? common.length / recSet.size : 0;
    // Enforce bidirectional maximum overlap ratio
    const directedMax = Math.max(candRatio, recRatio);

    if (directedMax > maxOverlap) {
      maxOverlap = directedMax;
      worstEpisodeId = ep.id;
      offendingTrigrams = common;
    }
  }

  const passed = !titleCollision && maxOverlap < threshold;

  return {
    passed,
    maxOverlap,
    offendingTrigrams,
    overlappingEpisodeId: worstEpisodeId,
    titleCollision,
  };
}

/**
 * Selects the next show format using a Least Recently Used (LRU) algorithm.
 * Inspects all 6 show formats and returns the one that hasn't appeared for the longest time.
 */
export function pickLruShowFormat(ledger: AntiRepetitionLedger): ShowFormatId {
  const episodes = ledger.episodes;
  if (episodes.length === 0) {
    return ALL_SHOW_FORMATS[0];
  }

  // Find the last index where each format appeared
  const lastSeenIndex: Record<ShowFormatId, number> = {
    wild_nature_commentary: -1,
    chaotic_grandma_hot_takes: -1,
    cozy_boutique_lore: -1,
    vintage_relic_debates: -1,
    gen_z_culture_clash: -1,
    craft_breakdown_asmr: -1,
  };

  for (let i = 0; i < episodes.length; i++) {
    const fmt = episodes[i].format;
    if (fmt in lastSeenIndex) {
      lastSeenIndex[fmt] = i;
    }
  }

  // Find format with lowest lastSeenIndex (or never seen = -1)
  let oldestFormat: ShowFormatId = ALL_SHOW_FORMATS[0];
  let oldestIndex = Infinity;

  for (const fmt of ALL_SHOW_FORMATS) {
    const idx = lastSeenIndex[fmt];
    if (idx < oldestIndex) {
      oldestIndex = idx;
      oldestFormat = fmt;
    }
  }

  return oldestFormat;
}

/**
 * Checks if a product was featured within the rolling cooldown window.
 */
export function isProductOnCooldown(
  productId: string,
  ledger: AntiRepetitionLedger,
  windowSize: number = DEFAULT_WINDOW_SIZE
): boolean {
  if (!productId) return false;
  const recent = ledger.episodes.slice(-windowSize);
  return recent.some((ep) => ep.productId === productId);
}

/**
 * Selects a product from catalog that is not on cooldown.
 */
export function pickCooldownSafeProduct(
  allProducts: CatalogProduct[],
  ledger: AntiRepetitionLedger,
  preferredProductId?: string,
  windowSize: number = DEFAULT_WINDOW_SIZE
): CatalogProduct {
  if (preferredProductId) {
    const match = allProducts.find((p) => p.id === preferredProductId);
    if (match) return match;
  }

  if (allProducts.length === 0) {
    throw new Error('[antiRepetitionLedger] No catalog products available.');
  }

  const available = allProducts.filter((p) => !isProductOnCooldown(p.id, ledger, windowSize));

  if (available.length > 0) {
    // Pick deterministically or pseudorandomly from available pool
    const idx = Math.floor(Math.random() * available.length);
    return available[idx];
  }

  // If all products are on cooldown (e.g. catalog smaller than window), pick least recently used
  const lastUsedMap = new Map<string, number>();
  ledger.episodes.forEach((ep, idx) => {
    lastUsedMap.set(ep.productId, idx);
  });

  let oldestProduct = allProducts[0];
  let oldestIdx = Infinity;

  for (const p of allProducts) {
    const idx = lastUsedMap.has(p.id) ? (lastUsedMap.get(p.id) as number) : -1;
    if (idx < oldestIdx) {
      oldestIdx = idx;
      oldestProduct = p;
    }
  }

  return oldestProduct;
}

/**
 * Checks if a reaction clip is on cooldown.
 */
export function isClipOnCooldown(
  clipFile: string,
  ledger: AntiRepetitionLedger,
  windowSize: number = 6
): boolean {
  if (!clipFile) return false;
  const recent = ledger.episodes.slice(-windowSize);
  return recent.some((ep) => ep.clipFile === clipFile);
}

/**
 * Records a completed episode into the ledger.
 */
export function recordEpisodeToLedger(
  ledger: AntiRepetitionLedger,
  entry: EpisodeLedgerEntry
): AntiRepetitionLedger {
  ledger.episodes.push(entry);
  ledger.stats.totalGenerated += 1;
  ledger.stats.formatCounts[entry.format] = (ledger.stats.formatCounts[entry.format] || 0) + 1;
  ledger.lastUpdated = new Date().toISOString();

  // Cap retained episodes array to 50 to prevent unbounded growth while preserving history
  if (ledger.episodes.length > 50) {
    ledger.episodes = ledger.episodes.slice(-50);
  }

  return ledger;
}
