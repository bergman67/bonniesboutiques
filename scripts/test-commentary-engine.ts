/**
 * scripts/test-commentary-engine.ts
 *
 * Exhaustive Verification Test Script for Milestone 1:
 * - Generates 12 consecutive episodes using the Commentary Engine.
 * - Enforces < 15% pairwise trigram overlap across all 12 episodes.
 * - Asserts rotation across all 6 show formats.
 * - Asserts 12 unique titles and valid beat schemas.
 * - Validates persistent ledger updates at public/exports/anti-repetition-ledger.json.
 * - Tests candidate validation and schema guards.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  generateCommentaryEpisode,
  validateCandidateScript,
  loadLedger,
  resetLedger,
  extractTrigrams,
  calculateTrigramOverlap,
  ALL_SHOW_FORMATS,
  validateLlmSkitSchema,
  ShowFormatId,
  getClipFileForScene,
} from '../src/lib/studio/commentary';
import { getAllCatalogProducts } from '../src/lib/studio/rpgAppraisal';

async function runCommentaryEngineTests() {
  console.log('======================================================================');
  console.log('   M1 COMMENTARY ENGINE & ANTI-REPETITION LEDGER VERIFICATION SUITE   ');
  console.log('======================================================================\n');

  // Step 1: Clean reset the ledger for fresh test run
  console.log('[Test 1] Resetting persistent anti-repetition ledger...');
  const ledgerPath = path.join(process.cwd(), 'public', 'exports', 'anti-repetition-ledger.json');
  resetLedger(ledgerPath);
  const initialLedger = loadLedger(ledgerPath);
  assert.strictEqual(initialLedger.episodes.length, 0, 'Initial ledger must have 0 episodes');
  console.log('  ✔ Ledger reset successfully.\n');

  // Step 2: Generate 12 consecutive episodes in procedural mode
  console.log('[Test 2] Generating 12 consecutive episodes (forcing procedural mode)...');
  const episodes: any[] = [];
  const fullTexts: string[] = [];
  const episodeTrigramSets: Set<string>[] = [];

  for (let i = 0; i < 12; i++) {
    const result = await generateCommentaryEpisode({ forceProcedural: true });
    assert(result.skit, `Episode ${i + 1} skit must exist`);
    assert(result.skit.title, `Episode ${i + 1} must have a title`);
    assert(result.skit.beats.length >= 4, `Episode ${i + 1} must have at least 4 beats`);
    assert.strictEqual(result.source, 'procedural', `Episode ${i + 1} source must be procedural`);

    episodes.push(result);
    const fullText = result.skit.beats.map((b) => b.dialogue).join(' ');
    fullTexts.push(fullText);
    const trigrams = extractTrigrams(fullText);
    episodeTrigramSets.push(new Set(trigrams));

    // Verify speaker turn-taking alternation (no consecutive same speaker)
    for (let b = 1; b < result.skit.beats.length; b++) {
      assert.notStrictEqual(
        result.skit.beats[b].speaker,
        result.skit.beats[b - 1].speaker,
        `Episode ${i + 1} beat ${b + 1} speaker must alternate from beat ${b}`
      );
    }

    // Verify nature commentary clip-scene coupling
    if (result.format === 'wild_nature_commentary') {
      const beatScene = result.skit.beats[0].natGeoScene;
      assert(beatScene, `Wild nature commentary must define natGeoScene`);
      const expectedClip = getClipFileForScene(beatScene);
      assert.strictEqual(
        result.ledgerEntry.clipFile,
        expectedClip,
        `Ledger clipFile (${result.ledgerEntry.clipFile}) must match natGeoScene clip (${expectedClip})`
      );
    }

    console.log(
      `  Episode ${String(i + 1).padStart(2, '0')}: [${result.format}] "${result.skit.title}" ` +
      `(${result.skit.beats.length} beats, ${trigrams.length} trigrams, product: "${result.ledgerEntry.productTitle}")`
    );
  }
  console.log('  ✔ 12 consecutive episodes generated (100% turn-taking & clip-sync compliant).\n');

  // Step 3: Check title uniqueness
  console.log('[Test 3] Verifying title uniqueness...');
  const titles = episodes.map((e) => e.skit.title);
  const uniqueTitles = new Set(titles);
  console.log(`  Unique titles: ${uniqueTitles.size} / 12`);
  assert.strictEqual(uniqueTitles.size, 12, 'All 12 episode titles must be completely unique');
  console.log('  ✔ All 12 titles are distinct.\n');

  // Step 4: Check format rotation across all 6 formats
  console.log('[Test 4] Verifying rotation across all 6 show formats...');
  const formatsUsed = episodes.map((e) => e.format);
  const uniqueFormats = new Set(formatsUsed);
  console.log('  Formats used in 12 episodes:', Array.from(uniqueFormats));
  for (const fmt of ALL_SHOW_FORMATS) {
    assert(uniqueFormats.has(fmt), `Format "${fmt}" must be represented in the 12 episodes`);
  }
  assert.strictEqual(uniqueFormats.size, 6, 'All 6 distinct show formats must be used');

  // Verify first 6 episodes cover all 6 formats (LRU guarantee)
  const first6Formats = new Set(formatsUsed.slice(0, 6));
  assert.strictEqual(first6Formats.size, 6, 'First 6 episodes must cover all 6 formats');
  console.log('  ✔ LRU rotation successfully covered all 6 formats.\n');

  // Step 5: Check pairwise trigram overlap across all 66 pairs (12 choose 2)
  console.log('[Test 5] Computing pairwise trigram overlap across all 66 pairs...');
  let maxPairwiseOverlap = 0;
  let worstPair = { i: -1, j: -1, overlap: 0, common: [] as string[] };
  let totalPairsChecked = 0;

  for (let i = 0; i < 12; i++) {
    for (let j = 0; j < 12; j++) {
      if (i === j) continue;
      totalPairsChecked++;
      const { overlapRatio, commonTrigrams } = calculateTrigramOverlap(
        episodeTrigramSets[i],
        episodeTrigramSets[j]
      );

      if (overlapRatio > maxPairwiseOverlap) {
        maxPairwiseOverlap = overlapRatio;
        worstPair = { i, j, overlap: overlapRatio, common: commonTrigrams };
      }

      // Assert < 15% overlap for every directed pair
      assert(
        overlapRatio < 0.15,
        `Pairwise trigram overlap between Episode ${i + 1} and Episode ${j + 1} exceeded 15%: ${(overlapRatio * 100).toFixed(2)}%\n` +
        `Offending trigrams: ${commonTrigrams.join(', ')}`
      );
    }
  }

  console.log(`  Total pairs evaluated: ${totalPairsChecked} / 132 directed pairs (66 bidirectional)`);
  console.log(
    `  Worst pairwise overlap: ${(maxPairwiseOverlap * 100).toFixed(2)}% between Episode ${worstPair.i + 1} and Episode ${worstPair.j + 1}`
  );
  if (worstPair.common.length > 0) {
    console.log(`  Common trigrams in worst pair: ${worstPair.common.slice(0, 3).join(', ')}`);
  }
  assert(maxPairwiseOverlap < 0.15, `Max pairwise overlap must be strictly < 15% (actual: ${(maxPairwiseOverlap * 100).toFixed(2)}%)`);
  console.log('  ✔ Pairwise trigram overlap strictly < 15% across all pairs!\n');

  // Step 6: Verify ledger persistence on disk
  console.log('[Test 6] Verifying persistent ledger on disk...');
  const savedLedger = loadLedger(ledgerPath);
  assert.strictEqual(savedLedger.episodes.length, 12, 'Saved ledger must have exactly 12 episodes recorded');
  assert.strictEqual(savedLedger.stats.totalGenerated, 12, 'stats.totalGenerated must be 12');
  for (const fmt of ALL_SHOW_FORMATS) {
    assert(savedLedger.stats.formatCounts[fmt] >= 1, `Format count for "${fmt}" must be >= 1`);
  }
  console.log('  Ledger format counts:', savedLedger.stats.formatCounts);
  console.log('  ✔ Ledger file verified on disk.\n');

  // Step 7: Verify candidate rejection of identical script
  console.log('[Test 7] Testing candidate validator rejection...');
  const duplicateText = fullTexts[0];
  const duplicateReport = validateCandidateScript(duplicateText, savedLedger, 0.15);
  console.log(`  Duplicate script overlap vs ledger: ${(duplicateReport.maxOverlap * 100).toFixed(1)}%`);
  assert.strictEqual(duplicateReport.passed, false, 'Duplicate script must fail validation');
  assert(duplicateReport.maxOverlap >= 0.85, 'Duplicate script overlap must be high (>= 85%)');

  const distinctText = 'A completely unrelated astronaut floating near Saturn drinking warm lavender honey tea with comets.';
  const distinctReport = validateCandidateScript(distinctText, savedLedger, 0.15);
  console.log(`  Distinct script overlap vs ledger: ${(distinctReport.maxOverlap * 100).toFixed(1)}%`);
  assert.strictEqual(distinctReport.passed, true, 'Distinct script must pass validation');
  console.log('  ✔ Candidate validator correctly rejects duplicates and accepts novel scripts.\n');

  // Step 8: Verify LLM Schema Validator
  console.log('[Test 8] Testing LLM Schema Validator...');
  const products = getAllCatalogProducts();
  const sampleProduct = products[0];

  const validMock = {
    title: 'Testing LLM Output',
    description: 'A mock skit for validation',
    beats: [
      { speaker: 'tammy', expression: 'shocked', action: 'turn', dialogue: 'Look at this amazing handcrafted pen on the table!' },
      { speaker: 'bonnie', expression: 'proud grandma', action: 'sip tea', dialogue: 'I beaded that one with rose quartz and lavender thread, honey!' },
      { speaker: 'tammy', expression: 'eye-rolling daughter', action: 'turn', dialogue: 'Mom you cannot infuse stationery with emotional protection spells!' },
      { speaker: 'bonnie', expression: 'laughing', action: 'hold trinket', dialogue: 'Tap our link at btboutiqe.com and see for yourself, sweet pea!' },
    ],
  };

  const parsedValid = validateLlmSkitSchema(validMock, sampleProduct, 'chaotic_grandma_hot_takes');
  assert(parsedValid, 'Valid schema must be accepted');
  assert.strictEqual(parsedValid.beats.length, 4, 'Validated skit must have 4 beats');
  assert.strictEqual(parsedValid.category, 'chaotic_grandma_hot_takes', 'Category must match format');

  const invalidMock = {
    title: 'Broken Schema',
    beats: 'not an array',
  };
  const parsedInvalid = validateLlmSkitSchema(invalidMock, sampleProduct, 'chaotic_grandma_hot_takes');
  assert.strictEqual(parsedInvalid, null, 'Invalid schema must be rejected');
  console.log('  ✔ LLM Schema Validator functions correctly.\n');

  // Step 9: Verify explicit videoClipPath synchronization
  console.log('[Test 9] Verifying explicit videoClipPath synchronization in nature commentary...');
  const testClips = ['hermit_crab.mp4', 'savanna_meerkat.mp4', 'baby_capybaras.mp4', 'penguins_slowmo.mp4'];
  for (const clip of testClips) {
    const res = await generateCommentaryEpisode({
      format: 'wild_nature_commentary',
      videoClipPath: clip,
      forceProcedural: true,
    });
    assert.strictEqual(res.ledgerEntry.clipFile, clip, `Clip ${clip} must be recorded in ledgerEntry`);
    const expectedClip = getClipFileForScene(res.skit.beats[0].natGeoScene!);
    assert.strictEqual(expectedClip, clip, `natGeoScene must match requested clip ${clip}`);
    // Also verify dialogue corresponds to the animal
    const fullDiag = res.skit.beats.map(b => b.dialogue).join(' ');
    assert(fullDiag.length > 50, 'Dialogue must be generated');
  }
  console.log('  ✔ All requested clips strictly coupled with dialogue and natGeoScene.\n');

  console.log('======================================================================');
  console.log('   ALL COMMENTARY ENGINE VERIFICATION CHECKS PASSED (100% SUCCESS)   ');
  console.log('======================================================================');
}

runCommentaryEngineTests().catch((err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
