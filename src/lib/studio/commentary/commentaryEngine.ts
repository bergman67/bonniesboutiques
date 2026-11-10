/**
 * src/lib/studio/commentary/commentaryEngine.ts
 *
 * Master Facade for the Multi-Format Commentary Engine.
 * Coordinates LRU format selection, cooldown safe product/clip assignment,
 * hybrid LLM / procedural generation, trigram overlap verification (< 15%),
 * title uniqueness deduplication, and persistent anti-repetition ledger updates.
 */

import path from 'path';
import fs from 'fs';
import type {
  CommentaryGenerationOptions,
  CommentaryGenerationResult,
  EpisodeLedgerEntry,
  ShowFormatId,
  TrigramOverlapReport,
} from './types';
import {
  loadLedger,
  saveLedger,
  validateCandidateScript,
  pickLruShowFormat,
  pickCooldownSafeProduct,
  isClipOnCooldown,
  isTitleOnCooldown,
  extractTrigrams,
  recordEpisodeToLedger,
} from './antiRepetitionLedger';
import {
  generateProceduralCommentary,
  normalizeClipFileName,
  getClipFileForScene,
  getAllRegisteredWildlifeClips,
} from './proceduralGenerator';
import { generateLlmCommentary } from './llmCommentaryGenerator';
import { getAllCatalogProducts, getProductById, type CatalogProduct } from '../rpgAppraisal';
import type { SkitTemplate } from '../skitTemplates';

// Re-export validation helper per PROJECT.md interface contract
export { validateCandidateScript } from './antiRepetitionLedger';

/**
 * Resolves a reaction clip that is not on cooldown for wild_nature_commentary.
 */
function resolveReactionClip(
  ledger: ReturnType<typeof loadLedger>,
  preferredClip?: string,
  attemptIndex: number = 0
): string {
  if (preferredClip) {
    const norm = normalizeClipFileName(preferredClip);
    if (norm) return norm;
  }

  let clipPool = getAllRegisteredWildlifeClips();
  if (typeof window === 'undefined') {
    const clipsDir = path.join(process.cwd(), 'public', 'reaction-clips');
    if (fs.existsSync(clipsDir)) {
      const files = fs.readdirSync(clipsDir).filter((f) => f.toLowerCase().endsWith('.mp4'));
      if (files.length > 0) {
        const registered = clipPool.filter((c) => files.includes(c));
        if (registered.length > 0) {
          clipPool = registered;
        }
      }
    }
  }

  // Filter out clips on cooldown using full rolling window size (default 12)
  const windowSize = ledger.rollingWindowSize || 12;
  const available = clipPool.filter((c) => !isClipOnCooldown(c, ledger, windowSize));
  if (available.length > 0) {
    return available[(attemptIndex + Math.floor(Math.random() * available.length)) % available.length];
  }

  // If all clips have appeared in the window, select the least recently used clip
  const lastUsedMap = new Map<string, number>();
  ledger.episodes.forEach((ep, idx) => {
    if (ep.clipFile) lastUsedMap.set(ep.clipFile, idx);
  });
  let oldestClip = clipPool[0];
  let oldestIdx = Infinity;
  for (const c of clipPool) {
    const idx = lastUsedMap.has(c) ? (lastUsedMap.get(c) as number) : -1;
    if (idx < oldestIdx) {
      oldestIdx = idx;
      oldestClip = c;
    }
  }
  return oldestClip;
}

/**
 * Extracts dialogue text across all beats of a skit.
 */
function extractFullScriptText(skit: SkitTemplate): string {
  return skit.beats.map((b) => b.dialogue).join(' ');
}

/**
 * Generates a full commentary episode with guaranteed < 15% trigram overlap
 * and guaranteed unique titles against the persistent rolling 12-episode ledger.
 */
export async function generateCommentaryEpisode(
  options: CommentaryGenerationOptions = {}
): Promise<CommentaryGenerationResult> {
  const ledger = loadLedger();
  const allProducts = getAllCatalogProducts();

  // 1. Determine show format
  const format: ShowFormatId = options.format || pickLruShowFormat(ledger);

  // 2. Resolve catalog product
  let product: CatalogProduct;
  if (options.product) {
    product = options.product;
  } else if (options.productId) {
    const found = getProductById(options.productId);
    product = found || pickCooldownSafeProduct(allProducts, ledger, options.productId);
  } else {
    product = pickCooldownSafeProduct(allProducts, ledger);
  }

  // 3. Resolve Shop TV reaction clip across all show formats (12-episode cooldown across 19+ clips)
  const clipFile = resolveReactionClip(ledger, options.videoClipPath);

  let chosenSkit: SkitTemplate | null = null;
  let source: 'llm' | 'procedural' = 'procedural';
  let bestOverlapReport: TrigramOverlapReport = {
    passed: false,
    maxOverlap: 1.0,
    offendingTrigrams: [],
  };

  // 4. Try LLM generation if allowed and configured
  if (!options.forceProcedural && process.env.GEMINI_API_KEY) {
    try {
      const llmCandidate = await generateLlmCommentary({
        product,
        format,
        ledger,
        clipFile,
        customTopic: options.customTopic,
      });

      if (llmCandidate) {
        const fullText = extractFullScriptText(llmCandidate);
        const report = validateCandidateScript(fullText, ledger, 0.15, llmCandidate.title);
        const titleCollides = isTitleOnCooldown(llmCandidate.title, ledger);

        if (report.passed && !titleCollides) {
          chosenSkit = llmCandidate;
          source = 'llm';
          bestOverlapReport = report;
        } else {
          console.warn(
            `[commentaryEngine] LLM candidate failed checks (overlap: ${(report.maxOverlap * 100).toFixed(1)}%, titleCollision: ${titleCollides}). Falling back to procedural re-roll.`
          );
        }
      }
    } catch (err) {
      console.warn('[commentaryEngine] LLM generation error, falling back to procedural:', err);
    }
  }

  // 5. Procedural generation with candidate validation & re-roll loop
  if (!chosenSkit) {
    source = 'procedural';
    let bestCandidate: SkitTemplate | null = null;
    let lowestOverlap = Infinity;

    const windowSize = ledger.rollingWindowSize || 12;
    const recentEpisodes = ledger.episodes.slice(-windowSize);
    const recentTitles = new Set(recentEpisodes.map((e) => e.title.trim().toLowerCase()));
    const recentFormatsEpisodes = recentEpisodes.filter((e) => e.format === format);
    const recentScenarioKeys = recentFormatsEpisodes.map((e) => e.title.toLowerCase());

    const maxAttempts = 30;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const activeClip = options.videoClipPath
        ? clipFile
        : resolveReactionClip(ledger, undefined, attempt);
      const seed = Date.now() + attempt * 17921 + Math.floor(Math.random() * 1000000);
      const candidate = generateProceduralCommentary({
        product,
        format,
        clipFile: activeClip,
        customTopic: options.customTopic,
        seed,
        excludeTitles: Array.from(recentTitles),
        recentScenarioKeys,
      });

      const fullText = extractFullScriptText(candidate);
      const report = validateCandidateScript(fullText, ledger, 0.15, candidate.title);
      const titleCollides =
        isTitleOnCooldown(candidate.title, ledger, windowSize) ||
        recentTitles.has(candidate.title.trim().toLowerCase());

      if (report.passed && !titleCollides) {
        bestCandidate = candidate;
        bestOverlapReport = report;
        break;
      }

      if (!titleCollides && report.maxOverlap < lowestOverlap) {
        lowestOverlap = report.maxOverlap;
        bestCandidate = candidate;
        bestOverlapReport = report;
      } else if (!bestCandidate && report.maxOverlap < lowestOverlap) {
        lowestOverlap = report.maxOverlap;
        bestCandidate = candidate;
        bestOverlapReport = report;
      }
    }

    // Invariant Gate: If still not passing, try emergency diversification pass with explicit scenarioOffset
    if (!bestCandidate || !bestOverlapReport.passed) {
      for (let emergencyOffset = 1; emergencyOffset <= 6; emergencyOffset++) {
        const emergencyClip = options.videoClipPath
          ? clipFile
          : resolveReactionClip(ledger, undefined, emergencyOffset);
        const emergencySeed = Date.now() + emergencyOffset * 99991 + Math.floor(Math.random() * 10000);
        const candidate = generateProceduralCommentary({
          product,
          format,
          clipFile: emergencyClip,
          customTopic: options.customTopic,
          scenarioOffset: emergencyOffset,
          seed: emergencySeed,
          excludeTitles: Array.from(recentTitles),
        });

        const fullText = extractFullScriptText(candidate);
        const report = validateCandidateScript(fullText, ledger, 0.15, candidate.title);
        const titleCollides =
          isTitleOnCooldown(candidate.title, ledger, windowSize) ||
          recentTitles.has(candidate.title.trim().toLowerCase());

        if (report.passed && !titleCollides) {
          bestCandidate = candidate;
          bestOverlapReport = report;
          break;
        }

        if (!titleCollides && report.maxOverlap < lowestOverlap) {
          lowestOverlap = report.maxOverlap;
          bestCandidate = candidate;
          bestOverlapReport = report;
        }
      }
    }

    // Hard Invariant Guarantee: NEVER silently commit a non-compliant candidate to disk!
    if (!bestCandidate || !bestOverlapReport.passed) {
      throw new Error(
        `[commentaryEngine] Invariant violation: could not satisfy < 15% trigram overlap contract for format "${format}". Best observed overlap: ${(bestOverlapReport.maxOverlap * 100).toFixed(1)}%`
      );
    }

    // Failsafe title disambiguation in case of edge-case collision
    if (isTitleOnCooldown(bestCandidate.title, ledger, windowSize)) {
      const cleanProd = product.title.replace(/['"]/g, '').trim();
      bestCandidate.title = `${bestCandidate.title} - ${cleanProd} Edition`;
      if (isTitleOnCooldown(bestCandidate.title, ledger, windowSize)) {
        bestCandidate.title = `${bestCandidate.title} #${ledger.stats.totalGenerated + 1}`;
      }
    }

    chosenSkit = bestCandidate;
  }

  // 6. Extract candidate trigrams and compile ledger entry
  const fullDialogue = extractFullScriptText(chosenSkit);
  const trigrams = extractTrigrams(fullDialogue);
  const openingHook = chosenSkit.beats[0]?.dialogue || '';
  const punchline = chosenSkit.beats[chosenSkit.beats.length - 1]?.dialogue || '';

  // Synchronize reaction clip strictly with chosen skit's natGeoScene
  const finalClipFile = chosenSkit.beats[0]?.natGeoScene
    ? getClipFileForScene(chosenSkit.beats[0].natGeoScene)
    : clipFile;

  const ledgerEntry: EpisodeLedgerEntry = {
    id: chosenSkit.id,
    timestamp: new Date().toISOString(),
    format,
    title: chosenSkit.title,
    productId: product.id,
    productTitle: product.title,
    clipFile: finalClipFile,
    openingHook,
    punchline,
    trigrams,
    trigramCount: trigrams.length,
    source,
  };

  // 7. Record episode to persistent ledger
  recordEpisodeToLedger(ledger, ledgerEntry);
  saveLedger(ledger);

  return {
    skit: chosenSkit,
    format,
    source,
    trigramOverlapMax: bestOverlapReport.maxOverlap,
    ledgerEntry,
  };
}
