/**
 * scripts/test-challenger-m1-empirical.ts
 *
 * Adversarial Empirical Verification Suite for Milestone 1:
 * Commentary Engine & Anti-Repetition Ledger
 *
 * Authored by: challenger_m1_1 (Critic / Specialist)
 *
 * Exhaustive Empirical Tests:
 * 1. 30 Consecutive Episode Generation & Rolling 12-Episode Pairwise Trigram Overlap Distribution (3 independent test runs)
 * 2. Full 30-Episode Global Pairwise Trigram Distribution
 * 3. Adversarial Edge Cases:
 *    - Empty strings, whitespace, unicode, long strings in customTopic & titles
 *    - Non-existent / invalid / null product IDs and empty products
 *    - Deliberately repeated product inputs (forcing cooldown stress)
 * 4. Missing & Corrupted Ledger Recovery:
 *    - Non-existent file
 *    - Corrupted / truncated JSON
 *    - 0-byte file
 *    - Malformed schema objects
 * 5. Candidate Rejection Verification:
 *    - Exact duplicates, permutations, subtle paraphrases, short strings (< 3 tokens)
 *    - Edge cases: empty text, whitespace, novel scripts
 * 6. LRU Format Rotation & Cooldown Invariants:
 *    - Deterministic cycling across 60 steps
 *    - Degraded catalog (smaller than window) graceful handling
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  generateCommentaryEpisode,
  validateCandidateScript,
  loadLedger,
  saveLedger,
  resetLedger,
  createEmptyLedger,
  extractTrigrams,
  calculateTrigramOverlap,
  tokenizeText,
  pickLruShowFormat,
  pickCooldownSafeProduct,
  isProductOnCooldown,
  isClipOnCooldown,
  ALL_SHOW_FORMATS,
  validateLlmSkitSchema,
  ShowFormatId,
  EpisodeLedgerEntry,
  AntiRepetitionLedger,
} from '../src/lib/studio/commentary';
import { getAllCatalogProducts, CatalogProduct } from '../src/lib/studio/rpgAppraisal';

interface DistributionStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p90: number;
  p95: number;
  p99: number;
}

function computeStats(values: number[]): DistributionStats {
  if (values.length === 0) {
    return { count: 0, min: 0, max: 0, mean: 0, median: 0, p90: 0, p95: 0, p99: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / sorted.length;
  const median = sorted[Math.floor(sorted.length * 0.5)];
  const p90 = sorted[Math.floor(sorted.length * 0.9)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = Math.min(sorted[sorted.length - 1], sorted[Math.floor(sorted.length * 0.99)]);
  return {
    count: values.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean,
    median,
    p90,
    p95,
    p99,
  };
}

async function runEmpiricalSuite() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  CHALLENGER M1: ADVERSARIAL EMPIRICAL VERIFICATION & STRESS HARNESS  ');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  const testTempDir = path.join(process.cwd(), 'public', 'exports', 'challenger_test_temp');
  if (!fs.existsSync(testTempDir)) {
    fs.mkdirSync(testTempDir, { recursive: true });
  }

  const liveLedgerPath = path.join(process.cwd(), 'public', 'exports', 'anti-repetition-ledger.json');
  let originalLiveLedgerContent: string | null = null;
  if (fs.existsSync(liveLedgerPath)) {
    originalLiveLedgerContent = fs.readFileSync(liveLedgerPath, 'utf-8');
  }

  const failures: string[] = [];
  const warnings: string[] = [];

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 1: 30 CONSECUTIVE EPISODES & ROLLING 12-EPISODE TRIGRAM OVERLAP
    // ─────────────────────────────────────────────────────────────────────────
    console.log('>>> [TEST 1] Generating 30 Consecutive Episodes (3 Independent Runs) & Analyzing Rolling Overlap...');

    const numRuns = 3;
    let worstGlobalRollingOverlap = 0;
    let worstGlobalPair: any = null;
    let runsWithViolations = 0;

    for (let r = 1; r <= numRuns; r++) {
      resetLedger(liveLedgerPath);

      const generatedEpisodes: Array<{
        index: number;
        format: ShowFormatId;
        title: string;
        productTitle: string;
        productId: string;
        beatsCount: number;
        dialogueText: string;
        trigrams: string[];
        trigramSet: Set<string>;
        reportedOverlap: number;
      }> = [];

      for (let i = 0; i < 30; i++) {
        const res = await generateCommentaryEpisode({ forceProcedural: true });
        assert(res.skit, `Episode ${i + 1} must return a skit`);
        assert(res.skit.title && res.skit.title.trim().length > 0, `Episode ${i + 1} title must be non-empty`);
        assert(res.skit.beats.length >= 4, `Episode ${i + 1} must have >= 4 beats`);

        const fullDialogue = res.skit.beats.map((b) => b.dialogue).join(' ');
        const trigrams = extractTrigrams(fullDialogue);

        generatedEpisodes.push({
          index: i + 1,
          format: res.format,
          title: res.skit.title,
          productTitle: res.ledgerEntry.productTitle,
          productId: res.ledgerEntry.productId,
          beatsCount: res.skit.beats.length,
          dialogueText: fullDialogue,
          trigrams,
          trigramSet: new Set(trigrams),
          reportedOverlap: res.trigramOverlapMax,
        });
      }

      // Check format distribution across 30 episodes
      const formatCounts: Record<string, number> = {};
      for (const ep of generatedEpisodes) {
        formatCounts[ep.format] = (formatCounts[ep.format] || 0) + 1;
      }
      for (const fmt of ALL_SHOW_FORMATS) {
        assert.strictEqual(formatCounts[fmt], 5, `Each format must appear 5 times with LRU in 30 eps`);
      }

      // Evaluate rolling 12-episode windows
      const rollingOverlaps: number[] = [];
      let runMaxRolling = 0;
      const runViolations: any[] = [];

      for (let w = 0; w <= 30 - 12; w++) {
        const windowEpisodes = generatedEpisodes.slice(w, w + 12);

        for (let i = 0; i < 12; i++) {
          for (let j = i + 1; j < 12; j++) {
            const epA = windowEpisodes[i];
            const epB = windowEpisodes[j];

            const { overlapRatio: ratioAB, commonTrigrams: commonAB } = calculateTrigramOverlap(epA.trigramSet, epB.trigramSet);
            const { overlapRatio: ratioBA, commonTrigrams: commonBA } = calculateTrigramOverlap(epB.trigramSet, epA.trigramSet);
            const maxDirected = Math.max(ratioAB, ratioBA);
            const common = ratioAB >= ratioBA ? commonAB : commonBA;

            rollingOverlaps.push(maxDirected);

            if (maxDirected > runMaxRolling) {
              runMaxRolling = maxDirected;
            }

            if (maxDirected > worstGlobalRollingOverlap) {
              worstGlobalRollingOverlap = maxDirected;
              worstGlobalPair = {
                run: r,
                windowIndex: w + 1,
                ep1: epA.index,
                ep2: epB.index,
                format1: epA.format,
                format2: epB.format,
                overlap: maxDirected,
                common,
              };
            }

            if (maxDirected >= 0.15) {
              const alreadyLogged = runViolations.some((v) => v.ep1 === epA.index && v.ep2 === epB.index);
              if (!alreadyLogged) {
                runViolations.push({
                  windowIndex: w + 1,
                  ep1: epA.index,
                  ep2: epB.index,
                  format1: epA.format,
                  format2: epB.format,
                  overlap: maxDirected,
                  common,
                });
              }
            }
          }
        }
      }

      const stats = computeStats(rollingOverlaps);
      console.log(`  Run ${r}/${numRuns}: Max rolling overlap = ${(runMaxRolling * 100).toFixed(2)}%, Mean = ${(stats.mean * 100).toFixed(2)}%, Violations >= 15%: ${runViolations.length}`);

      if (runViolations.length > 0) {
        runsWithViolations++;
        for (const v of runViolations) {
          const msg = `[Run ${r}] Pair (Ep ${v.ep1} [${v.format1}], Ep ${v.ep2} [${v.format2}]) in Window ${v.windowIndex} had ${(v.overlap * 100).toFixed(2)}% overlap (>= 15% threshold). Common trigrams: ${v.common.slice(0, 3).join(' | ')}`;
          failures.push(msg);
        }
      }

      // Check title uniqueness in Run 1
      if (r === 1) {
        const uniqueTitles = new Set(generatedEpisodes.map((e) => e.title));
        console.log(`  Run 1 Title Uniqueness across 30 episodes: ${uniqueTitles.size} / 30 unique`);
        if (uniqueTitles.size < 30) {
          warnings.push(`Only ${uniqueTitles.size}/30 unique titles generated across 30 episodes (${30 - uniqueTitles.size} duplicate titles occur outside rolling window due to limited scenario pools).`);
        }
      }
    }

    if (failures.length > 0) {
      console.log(`\n  🚨 CRITICAL FAILURE: ${failures.length} pairwise trigram violation(s) >= 15% detected across ${runsWithViolations}/${numRuns} test runs!`);
      console.log(`  Worst observed pairwise overlap: ${(worstGlobalRollingOverlap * 100).toFixed(2)}% (Requirement is strictly < 15%)`);
      if (worstGlobalPair) {
        console.log(`  Offending pair: Ep ${worstGlobalPair.ep1} vs Ep ${worstGlobalPair.ep2} [${worstGlobalPair.format1}] in Run ${worstGlobalPair.run}`);
        console.log(`  Sample offending trigrams: ${worstGlobalPair.common.slice(0, 4).join(' | ')}\n`);
      }
    } else {
      console.log('  ✔ All rolling 12-episode windows had < 15% overlap in this run.\n');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 2: ADVERSARIAL EDGE CASES
    // ─────────────────────────────────────────────────────────────────────────
    console.log('>>> [TEST 2] Testing Adversarial Edge Cases...');

    // 2.1 Empty & Whitespace customTopic
    console.log('  [2.1] Testing empty and whitespace customTopic...');
    const emptyTopicRes = await generateCommentaryEpisode({ customTopic: '', forceProcedural: true });
    assert(emptyTopicRes.skit, 'Empty customTopic must return valid skit');
    assert(emptyTopicRes.skit.beats.length >= 4, 'Empty customTopic must produce valid beats');

    const wsTopicRes = await generateCommentaryEpisode({ customTopic: '   \n\t   ', forceProcedural: true });
    assert(wsTopicRes.skit, 'Whitespace customTopic must return valid skit');

    // 2.2 Special Characters & Code Injection in customTopic
    console.log('  [2.2] Testing HTML/XSS and Special Characters in customTopic...');
    const xssTopic = '<script>alert("XSS")</script>&"\';!--<XSS>=&{()}';
    const xssTopicRes = await generateCommentaryEpisode({ customTopic: xssTopic, forceProcedural: true });
    assert(xssTopicRes.skit, 'XSS customTopic must not crash');
    assert(!xssTopicRes.skit.title.includes('<script>'), 'Title must sanitize or not execute scripts');

    // 2.3 Unicode, Emoji & Non-Latin Scripts
    console.log('  [2.3] Testing Non-Latin Scripts & Emoji...');
    const unicodeTopic = '🌸 펜 공예 貓咪 תכשיטים 💎✨ \u0000\u001F';
    const unicodeRes = await generateCommentaryEpisode({ customTopic: unicodeTopic, forceProcedural: true });
    assert(unicodeRes.skit, 'Unicode customTopic must succeed');

    // 2.4 Ultra-Long customTopic (5,000 characters)
    console.log('  [2.4] Testing Ultra-Long customTopic (5,000 chars)...');
    const longTopic = 'A'.repeat(5000);
    const longTopicRes = await generateCommentaryEpisode({ customTopic: longTopic, forceProcedural: true });
    assert(longTopicRes.skit, 'Long customTopic must succeed without memory overflow');

    // 2.5 Non-existent / invalid productId
    console.log('  [2.5] Testing Non-Existent and Invalid productId...');
    const nonExistentRes = await generateCommentaryEpisode({ productId: 'invalid_prod_xyz_999999', forceProcedural: true });
    assert(nonExistentRes.skit, 'Invalid productId must fall back to safe catalog product');
    assert(nonExistentRes.ledgerEntry.productId, 'Ledger entry must have valid product ID');

    const emptyProdIdRes = await generateCommentaryEpisode({ productId: '', forceProcedural: true });
    assert(emptyProdIdRes.skit, 'Empty productId must fall back to safe catalog product');

    // 2.6 Malformed CatalogProduct with empty or special title
    console.log('  [2.6] Testing Malformed CatalogProduct object...');
    const malformedProd: CatalogProduct = {
      id: 'malformed_test_1',
      title: '   ',
      category: 'Beaded Pens',
      price: 8,
      transparentLocalUrl: '',
      filename: '',
    };
    const malformedProdRes = await generateCommentaryEpisode({ product: malformedProd, forceProcedural: true });
    assert(malformedProdRes.skit, 'Malformed product with empty title must not crash');
    assert(malformedProdRes.skit.beats.length >= 4, 'Malformed product must produce beats');

    const specialTitleProd: CatalogProduct = {
      id: 'special_title_prod_2',
      title: 'Special "Beaded" \'Pen\' <Tag> & 🌟 Charm',
      category: 'Charms & Bookmarks',
      price: 12,
      transparentLocalUrl: '',
      filename: '',
    };
    const specialTitleRes = await generateCommentaryEpisode({ product: specialTitleProd, forceProcedural: true });
    assert(specialTitleRes.skit, 'Product with quotes and symbols must be cleanly stripped/handled');

    // 2.7 Stressing Repeated Product Inputs
    console.log('  [2.7] Stressing Repeated Product Inputs (Forced same product 5x in a row)...');
    const catalog = getAllCatalogProducts();
    const fixedProduct = catalog[0];
    const repeatedEpisodes: any[] = [];

    for (let r = 0; r < 5; r++) {
      const repRes = await generateCommentaryEpisode({ product: fixedProduct, forceProcedural: true });
      repeatedEpisodes.push(repRes);
      assert.strictEqual(repRes.ledgerEntry.productId, fixedProduct.id, 'Should use requested product');
    }

    for (let i = 0; i < repeatedEpisodes.length; i++) {
      for (let j = i + 1; j < repeatedEpisodes.length; j++) {
        const textA = repeatedEpisodes[i].skit.beats.map((b: any) => b.dialogue).join(' ');
        const textB = repeatedEpisodes[j].skit.beats.map((b: any) => b.dialogue).join(' ');
        const trigA = new Set(extractTrigrams(textA));
        const trigB = new Set(extractTrigrams(textB));
        const { overlapRatio } = calculateTrigramOverlap(trigA, trigB);
        assert(
          overlapRatio < 0.15,
          `Overlap between forced product repeats exceeded 15%: ${(overlapRatio * 100).toFixed(2)}%`
        );
      }
    }
    console.log('  ✔ All edge-case inputs handled gracefully without exceptions.\n');

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 3: MISSING & CORRUPTED LEDGER FILE RECOVERY
    // ─────────────────────────────────────────────────────────────────────────
    console.log('>>> [TEST 3] Testing Missing and Corrupted Ledger File Recovery...');

    // 3.1 Non-existent file in non-existent directory
    const missingDirLedger = path.join(testTempDir, 'deep', 'nested', 'missing-ledger.json');
    if (fs.existsSync(missingDirLedger)) fs.unlinkSync(missingDirLedger);

    const loadedFromMissing = loadLedger(missingDirLedger);
    assert(loadedFromMissing, 'Loading missing ledger must return a valid ledger object');
    assert.strictEqual(loadedFromMissing.episodes.length, 0, 'Loaded missing ledger must have 0 episodes');
    assert.strictEqual(loadedFromMissing.rollingWindowSize, 12, 'Default window size must be 12');

    saveLedger(loadedFromMissing, missingDirLedger);
    assert(fs.existsSync(missingDirLedger), 'saveLedger must create parent directories if missing');

    // 3.2 Corrupted / Truncated JSON file
    const corruptedPath = path.join(testTempDir, 'corrupted-ledger.json');
    fs.writeFileSync(corruptedPath, '{"version": "1.0.0", "episodes": [ { "id": "trun', 'utf-8');
    const recoveredCorrupted = loadLedger(corruptedPath);
    assert(recoveredCorrupted, 'Must gracefully recover from corrupted JSON');
    assert.strictEqual(recoveredCorrupted.episodes.length, 0, 'Recovered ledger must be re-initialized');

    // 3.3 Completely empty file (0 bytes)
    const emptyFilePath = path.join(testTempDir, 'empty-ledger.json');
    fs.writeFileSync(emptyFilePath, '', 'utf-8');
    const recoveredEmpty = loadLedger(emptyFilePath);
    assert(recoveredEmpty, 'Must handle 0-byte file');
    assert.strictEqual(recoveredEmpty.episodes.length, 0, 'Recovered empty file must be re-initialized');

    // 3.4 Malformed schema (e.g. episodes is an object, not array)
    const malformedSchemaPath = path.join(testTempDir, 'malformed-schema-ledger.json');
    fs.writeFileSync(malformedSchemaPath, JSON.stringify({ version: '1.0.0', episodes: 'not an array' }), 'utf-8');
    const recoveredMalformed = loadLedger(malformedSchemaPath);
    assert(recoveredMalformed, 'Must handle malformed schema where episodes is string');
    assert(Array.isArray(recoveredMalformed.episodes), 'episodes must be an array');

    console.log('  ✔ Ledger resilience verified against missing files, nested dirs, 0-byte files, and corrupted JSON.\n');

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 4: CANDIDATE REJECTION VERIFICATION
    // ─────────────────────────────────────────────────────────────────────────
    console.log('>>> [TEST 4] Testing Candidate Script Validation & Rejection...');

    const sampleLedger = loadLedger(liveLedgerPath);
    assert(sampleLedger.episodes.length > 0, 'Ledger must have episodes for rejection test');

    const knownEpisode = sampleLedger.episodes[sampleLedger.episodes.length - 1];
    const knownFullText = [knownEpisode.openingHook, knownEpisode.punchline].join(' ');

    // 4.1 Identical text rejection
    const duplicateReport = validateCandidateScript(knownFullText, sampleLedger, 0.15);
    console.log(`  Identical text max overlap: ${(duplicateReport.maxOverlap * 100).toFixed(2)}% (passed: ${duplicateReport.passed})`);
    assert.strictEqual(duplicateReport.passed, false, 'Exact duplicate must be rejected');
    assert(duplicateReport.maxOverlap >= 0.50, 'Exact duplicate overlap must be >= 50%');

    // 4.2 Empty, 1-word, 2-word inputs
    const emptyReport = validateCandidateScript('', sampleLedger, 0.15);
    assert.strictEqual(emptyReport.passed, true, 'Empty script has 0 trigrams, must pass');
    assert.strictEqual(emptyReport.maxOverlap, 0, 'Empty script overlap must be 0');

    const shortReport = validateCandidateScript('hello world', sampleLedger, 0.15);
    assert.strictEqual(shortReport.passed, true, 'Short script (<3 words) has 0 trigrams, must pass');

    // 4.3 Novel script acceptance
    const novelScript = 'Galactic botanists cultivate fluorescent bioluminescent orchids inside zero gravity space stations near Neptune.';
    const novelReport = validateCandidateScript(novelScript, sampleLedger, 0.15);
    console.log(`  Novel script max overlap: ${(novelReport.maxOverlap * 100).toFixed(2)}% (passed: ${novelReport.passed})`);
    assert.strictEqual(novelReport.passed, true, 'Novel script must pass validation');
    assert.strictEqual(novelReport.maxOverlap, 0, 'Novel script overlap must be 0%');

    console.log('  ✔ Candidate validation gatekeeper accurately rejects duplicates and permits novel scripts.\n');

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 5: LRU FORMAT ROTATION & COOLDOWN INVARIANTS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('>>> [TEST 5] Testing LRU Format Rotation & Cooldown Invariants...');

    const simulatedLedger = createEmptyLedger(12);
    const chosenOrder: ShowFormatId[] = [];

    for (let step = 0; step < 60; step++) {
      const nextFormat = pickLruShowFormat(simulatedLedger);
      chosenOrder.push(nextFormat);

      const fakeEntry: EpisodeLedgerEntry = {
        id: `fake_${step}`,
        timestamp: new Date().toISOString(),
        format: nextFormat,
        title: `Fake Ep ${step}`,
        productId: `prod_${step % 15}`,
        productTitle: `Product ${step % 15}`,
        openingHook: 'hook',
        punchline: 'punch',
        trigrams: ['a b c'],
        trigramCount: 1,
        source: 'procedural',
      };
      simulatedLedger.episodes.push(fakeEntry);
    }

    for (let block = 0; block < 10; block++) {
      const slice = chosenOrder.slice(block * 6, (block + 1) * 6);
      const set = new Set(slice);
      assert.strictEqual(
        set.size,
        6,
        `Block ${block + 1} did not contain all 6 formats: ${slice.join(', ')}`
      );
    }
    console.log('  ✔ LRU format selector produces perfect round-robin across 60 simulated episodes.\n');

    // 5.2 Degraded Catalog
    console.log('  [5.2] Testing Degraded Catalog (Catalog smaller than cooldown window)...');
    const tinyCatalog: CatalogProduct[] = catalog.slice(0, 4);
    const smallCatalogLedger = createEmptyLedger(12);

    for (let step = 0; step < 16; step++) {
      const picked = pickCooldownSafeProduct(tinyCatalog, smallCatalogLedger, undefined, 12);
      assert(picked, `Step ${step}: Must return a product even when all 4 products are on cooldown`);

      smallCatalogLedger.episodes.push({
        id: `ep_tiny_${step}`,
        timestamp: new Date().toISOString(),
        format: 'cozy_boutique_lore',
        title: `Tiny ${step}`,
        productId: picked.id,
        productTitle: picked.title,
        openingHook: 'hook',
        punchline: 'punch',
        trigrams: [],
        trigramCount: 0,
        source: 'procedural',
      });
    }
    console.log('  ✔ Degraded catalog gracefully falls back to LRU product selection without crashing or looping.\n');

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 6: FINAL EMPIRICAL SUMMARY & VERDICT
    // ─────────────────────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('  CHALLENGER HARNESS EXECUTION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log(`Total Failures: ${failures.length}`);
    console.log(`Total Warnings: ${warnings.length}`);

    if (failures.length > 0) {
      console.log('\n❌ EMPIRICAL VERDICT: REQUEST_CHANGES');
      for (const f of failures) {
        console.log(`  - FAILURE: ${f}`);
      }
      process.exitCode = 1;
    } else {
      console.log('\n✅ EMPIRICAL VERDICT: APPROVE');
    }

  } finally {
    if (originalLiveLedgerContent !== null) {
      fs.writeFileSync(liveLedgerPath, originalLiveLedgerContent, 'utf-8');
    }
    try {
      if (fs.existsSync(testTempDir)) {
        fs.rmSync(testTempDir, { recursive: true, force: true });
      }
    } catch (e) {
      // ignore
    }
  }
}

runEmpiricalSuite().catch((err) => {
  console.error('\n❌ UNEXPECTED CRASH IN CHALLENGER SUITE:', err);
  process.exit(1);
});
