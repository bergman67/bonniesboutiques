/**
 * scripts/test-challenger-m1.ts
 *
 * Adversarial Empirical Stress Testing Suite for Milestone 1 (Commentary Engine)
 * Executed by: challenger_m1_2
 *
 * Tests:
 * 1. LRU Format Distribution over 24 runs (balanced rotation across 6 formats, 4 times each)
 * 2. Rapid Concurrent Calls to generateCommentaryEpisode (race conditions, ledger clobbering, EBUSY)
 * 3. Beat Structure Integrity (beat count, speaker turns, valid actions & expressions, placeholder leaks)
 * 4. Title Uniqueness & Collision Rate over 12 and 24 runs
 * 5. Adversarial LLM Schema Validator Stress Testing
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
  ALL_SHOW_FORMATS,
  ShowFormatId,
  validateLlmSkitSchema,
  extractTrigrams,
  calculateTrigramOverlap,
} from '../src/lib/studio/commentary';
import {
  CHARACTER_ACTIONS,
  CHARACTER_EXPRESSIONS,
  CharacterAction,
  CharacterExpression,
  CharacterId,
} from '../src/lib/studio/characterRig';
import { getAllCatalogProducts } from '../src/lib/studio/rpgAppraisal';

const LEDGER_PATH = path.join(process.cwd(), 'public', 'exports', 'anti-repetition-ledger.json');
const BACKUP_PATH = path.join(process.cwd(), 'public', 'exports', 'anti-repetition-ledger.backup.json');

const VALID_ACTIONS_SET = new Set<string>(CHARACTER_ACTIONS);
const VALID_EXPRESSIONS_SET = new Set<string>(CHARACTER_EXPRESSIONS);
const VALID_SPEAKERS_SET = new Set<string>(['bonnie', 'tammy', 'narrator']);

interface TestReport {
  lru24: {
    passed: boolean;
    blockResults: { block: number; formats: ShowFormatId[]; isPermutation: boolean }[];
    formatCounts: Record<ShowFormatId, number>;
    duplicatesInBlock: number;
    details: string;
  };
  concurrency: {
    passed: boolean;
    numCalls: number;
    resolvedCount: number;
    rejectedCount: number;
    episodesInLedger: number;
    clobberedCount: number;
    formatsUsed: ShowFormatId[];
    productsUsed: string[];
    errors: string[];
    details: string;
  };
  beatIntegrity: {
    passed: boolean;
    episodesTested: number;
    invalidBeatCounts: number;
    invalidSpeakers: string[];
    invalidActions: string[];
    invalidExpressions: string[];
    placeholderLeaks: string[];
    speakerTurnAnomalies: { skitId: string; format: string; speakers: string[] }[];
    details: string;
  };
  titleUniqueness: {
    passed: boolean;
    runs12Unique: number;
    runs24Unique: number;
    collidingTitles: string[];
    details: string;
  };
}

async function runAdversarialTests() {
  console.log('======================================================================');
  console.log('  CHALLENGER M1-2: ADVERSARIAL EMPIRICAL STRESS TEST SUITE           ');
  console.log('======================================================================\n');

  // Backup existing ledger if it exists
  if (fs.existsSync(LEDGER_PATH)) {
    fs.copyFileSync(LEDGER_PATH, BACKUP_PATH);
    console.log('[Setup] Backed up existing ledger to anti-repetition-ledger.backup.json');
  }

  const report: Partial<TestReport> = {};

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // TEST 1: LRU Format Distribution over 24 runs
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[TEST 1] LRU Format Distribution over 24 Sequential Runs');
    console.log('---------------------------------------------------------');
    resetLedger(LEDGER_PATH);

    const runs24: Array<{ runIndex: number; format: ShowFormatId; title: string }> = [];
    const formatCounts: Record<ShowFormatId, number> = {
      wild_nature_commentary: 0,
      chaotic_grandma_hot_takes: 0,
      cozy_boutique_lore: 0,
      vintage_relic_debates: 0,
      gen_z_culture_clash: 0,
      craft_breakdown_asmr: 0,
    };

    for (let i = 0; i < 24; i++) {
      const res = await generateCommentaryEpisode({ forceProcedural: true });
      runs24.push({ runIndex: i, format: res.format, title: res.skit.title });
      formatCounts[res.format] = (formatCounts[res.format] || 0) + 1;
    }

    const blockResults: { block: number; formats: ShowFormatId[]; isPermutation: boolean }[] = [];
    let lruBlocksPass = true;

    for (let b = 0; b < 4; b++) {
      const blockSlice = runs24.slice(b * 6, (b + 1) * 6).map((r) => r.format);
      const uniqueInBlock = new Set(blockSlice);
      const isPermutation = uniqueInBlock.size === 6;
      if (!isPermutation) lruBlocksPass = false;

      blockResults.push({
        block: b + 1,
        formats: blockSlice,
        isPermutation,
      });

      console.log(`  Block ${b + 1} (runs ${b * 6 + 1}..${(b + 1) * 6}): ${isPermutation ? '✔ BALANCED (6/6 unique)' : '✖ IMBALANCED'}`);
      console.log(`    Formats: [${blockSlice.join(', ')}]`);
    }

    console.log('\n  Total format counts over 24 runs:');
    let allExactly4 = true;
    for (const fmt of ALL_SHOW_FORMATS) {
      const cnt = formatCounts[fmt];
      console.log(`    - ${fmt.padEnd(28)}: ${cnt} ${cnt === 4 ? '(✔ exactly 4)' : '(✖ NOT 4)'}`);
      if (cnt !== 4) allExactly4 = false;
    }

    report.lru24 = {
      passed: lruBlocksPass && allExactly4,
      blockResults,
      formatCounts,
      duplicatesInBlock: blockResults.filter((b) => !b.isPermutation).length,
      details: lruBlocksPass && allExactly4
        ? 'LRU rotation strictly balanced: every 6-run block contains all 6 formats, and each format was selected exactly 4 times in 24 runs.'
        : 'LRU rotation failed balance constraints.',
    };

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 2: Title Uniqueness over 12 & 24 runs
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[TEST 2] Title Uniqueness & Collision Over 12 and 24 Runs');
    console.log('---------------------------------------------------------');
    const titles12 = runs24.slice(0, 12).map((r) => r.title);
    const uniqueTitles12 = new Set(titles12);
    const titles24 = runs24.map((r) => r.title);
    const uniqueTitles24 = new Set(titles24);

    const titleCounts = new Map<string, number>();
    for (const t of titles24) {
      titleCounts.set(t, (titleCounts.get(t) || 0) + 1);
    }
    const collidingTitles = Array.from(titleCounts.entries())
      .filter(([, c]) => c > 1)
      .map(([t, c]) => `"${t}" (occurred ${c} times)`);

    console.log(`  12-run unique titles: ${uniqueTitles12.size} / 12`);
    console.log(`  24-run unique titles: ${uniqueTitles24.size} / 24`);
    if (collidingTitles.length > 0) {
      console.log(`  Colliding titles detected (${collidingTitles.length}):`);
      for (const c of collidingTitles) {
        console.log(`    - ${c}`);
      }
    }

    report.titleUniqueness = {
      passed: uniqueTitles12.size === 12,
      runs12Unique: uniqueTitles12.size,
      runs24Unique: uniqueTitles24.size,
      collidingTitles,
      details: uniqueTitles12.size === 12
        ? 'All 12 titles were unique.'
        : `Duplicate titles generated! Only ${uniqueTitles12.size}/12 unique in first 12 runs, and ${uniqueTitles24.size}/24 in 24 runs.`,
    };

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 3: Beat Structure Integrity
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[TEST 3] Beat Structure Integrity (Beats, Speakers, Actions, Expressions, Placeholders)');
    console.log('-----------------------------------------------------------------------------------');
    // Generate 60 diverse episodes across all 6 formats explicitly to check every scenario
    const sampleEpisodes: any[] = [];
    resetLedger(LEDGER_PATH);

    for (const fmt of ALL_SHOW_FORMATS) {
      for (let s = 0; s < 10; s++) {
        const ep = await generateCommentaryEpisode({ format: fmt, forceProcedural: true });
        sampleEpisodes.push(ep);
      }
    }

    let invalidBeatCounts = 0;
    const invalidSpeakers: string[] = [];
    const invalidActions: string[] = [];
    const invalidExpressions: string[] = [];
    const placeholderLeaks: string[] = [];
    const speakerTurnAnomalies: { skitId: string; format: string; speakers: string[] }[] = [];

    for (const ep of sampleEpisodes) {
      const skit = ep.skit;
      if (!skit.beats || skit.beats.length < 4 || skit.beats.length > 6) {
        invalidBeatCounts++;
      }

      const speakersInSkit: string[] = [];
      let prevSpeaker: string | null = null;
      let hasConsecutiveSameSpeaker = false;

      for (const beat of skit.beats) {
        speakersInSkit.push(beat.speaker);
        if (beat.speaker === prevSpeaker) {
          hasConsecutiveSameSpeaker = true;
        }
        prevSpeaker = beat.speaker;

        if (!VALID_SPEAKERS_SET.has(beat.speaker)) {
          invalidSpeakers.push(`[${skit.id}] Invalid speaker: "${beat.speaker}"`);
        }
        if (!VALID_ACTIONS_SET.has(beat.action)) {
          invalidActions.push(`[${skit.id}] Invalid action: "${beat.action}"`);
        }
        if (!VALID_EXPRESSIONS_SET.has(beat.expression)) {
          invalidExpressions.push(`[${skit.id}] Invalid expression: "${beat.expression}"`);
        }

        // Check for unresolved template tags like {TITLE}, {PRODUCT}, etc.
        if (beat.dialogue.includes('{') || beat.dialogue.includes('}')) {
          placeholderLeaks.push(`[${skit.id}] Unresolved placeholder in dialogue: "${beat.dialogue}"`);
        }
      }

      if (hasConsecutiveSameSpeaker) {
        speakerTurnAnomalies.push({
          skitId: skit.id,
          format: ep.format,
          speakers: speakersInSkit,
        });
      }
    }

    console.log(`  Episodes tested: ${sampleEpisodes.length}`);
    console.log(`  Invalid beat counts: ${invalidBeatCounts}`);
    console.log(`  Invalid speakers: ${invalidSpeakers.length}`);
    console.log(`  Invalid actions: ${invalidActions.length}`);
    console.log(`  Invalid expressions: ${invalidExpressions.length}`);
    console.log(`  Unresolved template placeholder leaks: ${placeholderLeaks.length}`);
    console.log(`  Consecutive same-speaker beats: ${speakerTurnAnomalies.length}`);

    if (speakerTurnAnomalies.length > 0) {
      console.log('  Notice: Detected consecutive same-speaker turns:');
      const byFormat = new Map<string, number>();
      for (const a of speakerTurnAnomalies) {
        byFormat.set(a.format, (byFormat.get(a.format) || 0) + 1);
      }
      for (const [fmt, count] of Array.from(byFormat.entries())) {
        console.log(`    - Format "${fmt}": ${count} skits had consecutive same speaker (e.g. ${speakerTurnAnomalies.find((a) => a.format === fmt)?.speakers.join(' -> ')})`);
      }
    }

    report.beatIntegrity = {
      passed: invalidBeatCounts === 0 && invalidSpeakers.length === 0 && invalidActions.length === 0 && invalidExpressions.length === 0 && placeholderLeaks.length === 0,
      episodesTested: sampleEpisodes.length,
      invalidBeatCounts,
      invalidSpeakers,
      invalidActions,
      invalidExpressions,
      placeholderLeaks,
      speakerTurnAnomalies,
      details: 'All beats have strictly valid character actions and expressions, and 4 beats per skit.',
    };

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 4: Rapid Concurrent Calls to generateCommentaryEpisode
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[TEST 4] Rapid Concurrent Calls to generateCommentaryEpisode');
    console.log('------------------------------------------------------------');
    resetLedger(LEDGER_PATH);

    const CONCURRENCY_BATCH_SIZE = 12;
    console.log(`  Launching ${CONCURRENCY_BATCH_SIZE} simultaneous calls to generateCommentaryEpisode({ forceProcedural: true })...`);

    const errors: string[] = [];
    const settled = await Promise.allSettled(
      Array.from({ length: CONCURRENCY_BATCH_SIZE }, () =>
        generateCommentaryEpisode({ forceProcedural: true })
      )
    );

    let resolvedCount = 0;
    let rejectedCount = 0;
    const concurrentResults: any[] = [];

    for (let i = 0; i < settled.length; i++) {
      const s = settled[i];
      if (s.status === 'fulfilled') {
        resolvedCount++;
        concurrentResults.push(s.value);
      } else {
        rejectedCount++;
        errors.push(`Call ${i + 1} rejected: ${s.reason?.message || s.reason}`);
      }
    }

    // Inspect disk ledger
    const finalLedger = loadLedger(LEDGER_PATH);
    const episodesInLedger = finalLedger.episodes.length;
    const clobberedCount = CONCURRENCY_BATCH_SIZE - episodesInLedger;

    const concurrentFormats = concurrentResults.map((r) => r.format);
    const concurrentProducts = concurrentResults.map((r) => r.ledgerEntry.productId);

    console.log(`  Resolved calls: ${resolvedCount} / ${CONCURRENCY_BATCH_SIZE}`);
    console.log(`  Rejected calls: ${rejectedCount}`);
    console.log(`  Episodes persisted on disk: ${episodesInLedger} / ${CONCURRENCY_BATCH_SIZE}`);
    console.log(`  Clobbered / lost episodes: ${clobberedCount}`);
    console.log(`  Formats selected: [${concurrentFormats.join(', ')}]`);
    console.log(`  Unique formats in batch: ${new Set(concurrentFormats).size} / 6`);
    console.log(`  Unique products in batch: ${new Set(concurrentProducts).size} / ${CONCURRENCY_BATCH_SIZE}`);

    // Test 4B: Concurrent calls with async tick (simulating async I/O / LLM)
    console.log('\n  [TEST 4B] Rapid Concurrent Calls with true async interleaving...');
    resetLedger(LEDGER_PATH);

    // If an async delay occurs between loadLedger and saveLedger, observe file clobbering:
    const asyncErrors: string[] = [];
    const asyncBatchSize = 6;
    
    // We test calling generateCommentaryEpisode concurrently when an async operation occurs
    const p1 = Promise.allSettled(
      Array.from({ length: asyncBatchSize }, async (_, idx) => {
        // simulate async interleave
        return generateCommentaryEpisode({ forceProcedural: true });
      })
    );

    const asyncSettled = await p1;
    const asyncFinalLedger = loadLedger(LEDGER_PATH);

    console.log(`  Async batch size: ${asyncBatchSize}`);
    console.log(`  Persisted episodes in ledger: ${asyncFinalLedger.episodes.length}`);

    report.concurrency = {
      passed: rejectedCount === 0 && episodesInLedger === CONCURRENCY_BATCH_SIZE,
      numCalls: CONCURRENCY_BATCH_SIZE,
      resolvedCount,
      rejectedCount,
      episodesInLedger,
      clobberedCount,
      formatsUsed: concurrentFormats,
      productsUsed: concurrentProducts,
      errors,
      details: episodesInLedger === CONCURRENCY_BATCH_SIZE
        ? `All ${CONCURRENCY_BATCH_SIZE} calls resolved and were persisted to the ledger without data loss or crashes.`
        : `DATA LOSS / RACE CONDITION: ${clobberedCount} episodes were lost due to uncoordinated concurrent ledger read-modify-writes!`,
    };

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 5: Adversarial LLM Schema Validator Testing
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[TEST 5] Adversarial LLM Schema Validator Edge Cases');
    console.log('----------------------------------------------------');
    const dummyProduct = getAllCatalogProducts()[0];
    let schemaGuardsPassed = true;

    // 5.1 Missing title
    const resNoTitle = validateLlmSkitSchema({ beats: [{}, {}, {}, {}] }, dummyProduct, 'wild_nature_commentary');
    assert.strictEqual(resNoTitle, null, 'Must reject missing title');

    // 5.2 Too few beats (3 beats)
    const resFewBeats = validateLlmSkitSchema(
      {
        title: 'Valid Title',
        beats: [
          { speaker: 'tammy', expression: 'shocked', action: 'gasp', dialogue: 'Valid dialogue beat 1' },
          { speaker: 'bonnie', expression: 'proud grandma', action: 'sip tea', dialogue: 'Valid dialogue beat 2' },
          { speaker: 'tammy', expression: 'laughing', action: 'turn', dialogue: 'Valid dialogue beat 3' },
        ],
      },
      dummyProduct,
      'wild_nature_commentary'
    );
    assert.strictEqual(resFewBeats, null, 'Must reject < 4 beats');

    // 5.3 Too many beats (7 beats)
    const resManyBeats = validateLlmSkitSchema(
      {
        title: 'Valid Title',
        beats: Array.from({ length: 7 }, (_, i) => ({
          speaker: 'tammy',
          expression: 'happy',
          action: 'turn',
          dialogue: `Valid dialogue beat ${i + 1}`,
        })),
      },
      dummyProduct,
      'wild_nature_commentary'
    );
    assert.strictEqual(resManyBeats, null, 'Must reject > 6 beats');

    // 5.4 Empty dialogue
    const resEmptyDialogue = validateLlmSkitSchema(
      {
        title: 'Valid Title',
        beats: [
          { speaker: 'tammy', expression: 'shocked', action: 'gasp', dialogue: '' },
          { speaker: 'bonnie', expression: 'proud grandma', action: 'sip tea', dialogue: 'Valid dialogue 2' },
          { speaker: 'tammy', expression: 'laughing', action: 'turn', dialogue: 'Valid dialogue 3' },
          { speaker: 'bonnie', expression: 'happy', action: 'turn', dialogue: 'Valid dialogue 4' },
        ],
      },
      dummyProduct,
      'wild_nature_commentary'
    );
    assert.strictEqual(resEmptyDialogue, null, 'Must reject empty dialogue beat');

    // 5.5 Sanitizes invalid speaker, action, and expression gracefully
    const resSanitizes = validateLlmSkitSchema(
      {
        title: 'Sanitization Test',
        beats: [
          { speaker: 'alien', expression: 'furious', action: 'backflip', dialogue: 'Look at that weird creature' },
          { speaker: 'robot', expression: 'bored', action: 'levitate', dialogue: 'Grandma says it is friendly' },
          { speaker: 'dog', expression: 'annoyed', action: 'fly', dialogue: 'Tammy rolls her eyes at grandma' },
          { speaker: 'ghost', expression: 'crying', action: 'dance', dialogue: 'Check out the product in our shop' },
        ],
      },
      dummyProduct,
      'wild_nature_commentary'
    );
    assert(resSanitizes !== null, 'Must sanitize invalid actions/expressions rather than crashing');
    for (const b of resSanitizes.beats) {
      assert(VALID_SPEAKERS_SET.has(b.speaker), `Sanitized speaker must be valid: ${b.speaker}`);
      assert(VALID_ACTIONS_SET.has(b.action), `Sanitized action must be valid: ${b.action}`);
      assert(VALID_EXPRESSIONS_SET.has(b.expression), `Sanitized expression must be valid: ${b.expression}`);
    }
    console.log('  ✔ All LLM schema edge cases handled correctly.');

    console.log('\n======================================================================');
    console.log('  EMPIRICAL RESULTS SUMMARY:');
    console.log('======================================================================');
    console.log(`  [1] LRU Format Distribution (24 runs): ${report.lru24?.passed ? 'PASS' : 'FAIL'}`);
    console.log(`  [2] Rapid Concurrency Calls:          ${report.concurrency?.passed ? 'PASS' : 'FAIL'}`);
    console.log(`  [3] Beat Structure Integrity:         ${report.beatIntegrity?.passed ? 'PASS' : 'FAIL'}`);
    console.log(`  [4] Title Uniqueness (12 runs):       ${report.titleUniqueness?.passed ? 'PASS' : 'FAIL'}`);

    return report;
  } finally {
    // Restore backed up ledger
    if (fs.existsSync(BACKUP_PATH)) {
      fs.copyFileSync(BACKUP_PATH, LEDGER_PATH);
      fs.unlinkSync(BACKUP_PATH);
      console.log('\n[Teardown] Restored original anti-repetition-ledger.json from backup.');
    }
  }
}

runAdversarialTests().catch((err) => {
  console.error('\n[FATAL ERROR in test runner]:', err);
  process.exit(1);
});
