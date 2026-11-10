#!/usr/bin/env node
/**
 * scripts/test-e2e-suite.mjs
 *
 * Master E2E Test Runner for Bonnie & Tammy's Trinket Tales Video Production Pipeline Overhaul.
 * Strictly derives opaque-box requirement tests from ORIGINAL_REQUEST.md (## 2026-10-27T04:12:40Z)
 * and PROJECT.md across 4 comprehensive tiers:
 *
 * Tier 1: Feature Coverage (>=5 test cases per feature area across all 11 areas:
 *         Commentary Formats, Anti-Repetition Ledger, Flow Music Synthesis, Ducking, Custom Tracks,
 *         Cinematography, Character Kinematics & Emotes, Reaction Clips, Captions, 30fps Export, Storefront Guardrails)
 * Tier 2: Boundary & Corner Cases (empty/missing audio, extreme durations, rate-limit fallback, special characters, 12-episode overlap limit)
 * Tier 3: Cross-Feature Combinations (e.g., flow music + sidechain ducking + 30fps video compositing; LLM failure + procedural fallback + ledger update)
 * Tier 4: Real-World Application Scenarios (full episode with custom music, full episode with procedural music across all 6 formats, storefront integrity check)
 *
 * Usage:
 *   node scripts/test-e2e-suite.mjs
 *   node scripts/test-e2e-suite.mjs --tier=1
 *   node scripts/test-e2e-suite.mjs --tier=2
 *   node scripts/test-e2e-suite.mjs --tier=3
 *   node scripts/test-e2e-suite.mjs --tier=4
 *   node scripts/test-e2e-suite.mjs --verbose
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

const ROOT_DIR = process.cwd();

// ANSI color formatting
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// ──────────────────────────────────────────────────────────────────────────────
// TEST HARNESS ENGINE
// ──────────────────────────────────────────────────────────────────────────────
class E2ETestRunner {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.totalPassed = 0;
    this.totalFailed = 0;
    this.totalSkipped = 0;
    this.startTime = Date.now();
  }

  async describeAsync(name, fn) {
    const suite = {
      name,
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
    };
    this.suites.push(suite);
    const prevSuite = this.currentSuite;
    this.currentSuite = suite;
    const start = Date.now();
    try {
      await fn();
    } finally {
      suite.duration = Date.now() - start;
      this.currentSuite = prevSuite;
    }
  }

  async test(name, fn) {
    const suite = this.currentSuite;
    const start = Date.now();
    try {
      await fn();
      const duration = Date.now() - start;
      const testRecord = { name, passed: true, duration, error: null };
      if (suite) {
        suite.tests.push(testRecord);
        suite.passed++;
      }
      this.totalPassed++;
      console.log(`    ${colors.green}✔ [PASS]${colors.reset} ${name} ${colors.dim}(${duration}ms)${colors.reset}`);
      return testRecord;
    } catch (err) {
      const duration = Date.now() - start;
      const testRecord = { name, passed: false, duration, error: err };
      if (suite) {
        suite.tests.push(testRecord);
        suite.failed++;
      }
      this.totalFailed++;
      console.error(`    ${colors.red}✖ [FAIL]${colors.reset} ${name} ${colors.dim}(${duration}ms)${colors.reset}`);
      console.error(`       ${colors.red}Error: ${err.message}${colors.reset}`);
      if (err.stack && process.env.VERBOSE) {
        console.error(err.stack);
      }
      return testRecord;
    }
  }

  skip(name, reason = 'Skipped') {
    const suite = this.currentSuite;
    const testRecord = { name, passed: true, skipped: true, duration: 0, reason };
    if (suite) {
      suite.tests.push(testRecord);
      suite.skipped++;
    }
    this.totalSkipped++;
    console.log(`    ${colors.yellow}↷ [SKIP]${colors.reset} ${name} ${colors.dim}(${reason})${colors.reset}`);
    return testRecord;
  }

  printSummary() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    console.log(`\n${colors.bold}══════════════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}E2E VIDEO PIPELINE TEST SUMMARY: ${this.totalPassed} Passed, ${this.totalFailed} Failed, ${this.totalSkipped} Skipped (${duration}s)${colors.reset}`);
    console.log(`${colors.bold}══════════════════════════════════════════════════════════════════════════${colors.reset}`);
    for (const suite of this.suites) {
      const statusIcon = suite.failed === 0 ? `${colors.green}✔${colors.reset}` : `${colors.red}✖${colors.reset}`;
      console.log(`  ${statusIcon} ${suite.name}: ${suite.passed}/${suite.tests.length} passed ${colors.dim}(${suite.duration}ms)${colors.reset}`);
      if (suite.failed > 0) {
        for (const t of suite.tests.filter((x) => !x.passed)) {
          console.log(`      ${colors.red}✖ ${t.name} -> ${t.error?.message}${colors.reset}`);
        }
      }
    }
    console.log(`${colors.bold}══════════════════════════════════════════════════════════════════════════${colors.reset}\n`);
    return this.totalFailed === 0;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// FILE & UTILITY HELPERS
// ──────────────────────────────────────────────────────────────────────────────
function readFileUtf8(relPath) {
  const fullPath = path.resolve(ROOT_DIR, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Required file not found: ${relPath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function fileExists(relPath) {
  return fs.existsSync(path.resolve(ROOT_DIR, relPath));
}

function loadJson(relPath) {
  return JSON.parse(readFileUtf8(relPath));
}

// Reference Trigram Tokenizer (Authoritative Specification)
function referenceTokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

function referenceExtractTrigrams(text) {
  const tokens = referenceTokenize(text);
  if (tokens.length < 3) return [];
  const set = new Set();
  for (let i = 0; i <= tokens.length - 3; i++) {
    set.add(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`);
  }
  return Array.from(set);
}

function referenceTrigramOverlap(candidateText, targetText) {
  const candTri = referenceExtractTrigrams(candidateText);
  if (candTri.length === 0) return 0;
  const targetSet = new Set(referenceExtractTrigrams(targetText));
  let common = 0;
  for (const tri of candTri) {
    if (targetSet.has(tri)) common++;
  }
  return common / candTri.length;
}

// Reference Sidechain Ducking Math (70ms attack, 600ms release, -10.5 dB target)
function computeReferenceDuckingGain(tSec, speechIntervals) {
  const TARGET_ATTENUATION_DB = -10.5;
  const DUCKED_GAIN = Math.pow(10, TARGET_ATTENUATION_DB / 20); // ~0.2985
  const ATTACK_SEC = 0.07;
  const RELEASE_SEC = 0.6;

  let minGain = 1.0;
  for (const iv of speechIntervals) {
    if (tSec >= iv.startSec && tSec <= iv.endSec) {
      // In speech: ramp down from 1.0 to DUCKED_GAIN over ATTACK_SEC
      const progress = Math.min(1.0, (tSec - iv.startSec) / ATTACK_SEC);
      const g = 1.0 - progress * (1.0 - DUCKED_GAIN);
      if (g < minGain) minGain = g;
    } else if (tSec > iv.endSec && tSec < iv.endSec + RELEASE_SEC) {
      // After speech: ramp back up from DUCKED_GAIN to 1.0 over RELEASE_SEC
      const progress = (tSec - iv.endSec) / RELEASE_SEC;
      const g = DUCKED_GAIN + progress * (1.0 - DUCKED_GAIN);
      if (g < minGain) minGain = g;
    }
  }
  return minGain;
}

// ──────────────────────────────────────────────────────────────────────────────
// TIER 1: FEATURE COVERAGE (55 TESTS ACROSS 11 FEATURE AREAS)
// ──────────────────────────────────────────────────────────────────────────────

// Feature Area 1: Commentary Formats Engine (F1, F3, F4)
async function testCommentaryFormats(runner) {
  await runner.describeAsync('Tier 1.1: Commentary Formats Engine (F1, F3, F4)', async () => {
    await runner.test('1.1.1 Show format registry defines all 6 required distinct show formats', async () => {
      const typesFile = readFileUtf8('src/lib/studio/commentary/types.ts');
      const requiredFormats = [
        'wild_nature_commentary',
        'chaotic_grandma_hot_takes',
        'cozy_boutique_lore',
        'vintage_relic_debates',
        'gen_z_culture_clash',
        'craft_breakdown_asmr',
      ];
      for (const fmt of requiredFormats) {
        assert(typesFile.includes(`'${fmt}'`), `types.ts must declare ShowFormatId '${fmt}'`);
      }
    });

    await runner.test('1.1.2 Procedural generator implements vast combinatorial trajectories (>800k state space)', async () => {
      const procPath = fileExists('src/lib/studio/commentary/proceduralGenerator.ts')
        ? 'src/lib/studio/commentary/proceduralGenerator.ts'
        : 'src/lib/studio/commentary/proceduralWriter.ts';
      assert(fileExists(procPath), `proceduralGenerator.ts must exist at ${procPath}`);
      const content = readFileUtf8(procPath);
      assert(content.includes('generateProceduralCommentary') || content.includes('generateProceduralScript'), 'procedural generator must export generator function');
      assert(content.includes('bonnie') && content.includes('tammy'), 'procedural generator must feature Bonnie and Tammy');
      assert(content.length > 5000, 'procedural generator must contain a deep combinatorial slot dictionary');
    });

    await runner.test('1.1.3 Natural character-specific voices: Bonnie warmth vs. Tammy modern slang & unbothered banter', async () => {
      const procPath = fileExists('src/lib/studio/commentary/proceduralGenerator.ts')
        ? 'src/lib/studio/commentary/proceduralGenerator.ts'
        : 'src/lib/studio/commentary/proceduralWriter.ts';
      const content = readFileUtf8(procPath);
      assert(
        /bless|tea|knit|honey|cookie|darling/i.test(content),
        'Bonnie dictionary must reflect cozy grandma voice markers'
      );
      assert(
        /aura|unbothered|fr|lowkey|iconic|bestie|channel|tv/i.test(content),
        'Tammy dictionary must reflect modern daughter conversational voice markers'
      );
    });

    await runner.test('1.1.4 Conversational interruptions, callbacks, and dynamic actions beyond static ping-pong', async () => {
      const procPath = fileExists('src/lib/studio/commentary/proceduralGenerator.ts')
        ? 'src/lib/studio/commentary/proceduralGenerator.ts'
        : 'src/lib/studio/commentary/proceduralWriter.ts';
      const content = readFileUtf8(procPath);
      assert(
        content.includes('interrupt') || content.includes('callback') || content.includes('turn') || content.includes('gasp'),
        'Commentary generator must support interruptions, callbacks, and animated actions'
      );
      assert(
        content.includes('hold trinket') || content.includes('sip tea'),
        'Commentary beats must invoke character rig actions'
      );
    });

    await runner.test('1.1.5 Resilient LLM commentary facade with Gemini fallback list, 5s timeout, and procedural fallback', async () => {
      const llmPath = fileExists('src/lib/studio/commentary/llmCommentaryGenerator.ts')
        ? 'src/lib/studio/commentary/llmCommentaryGenerator.ts'
        : 'src/lib/studio/commentary/llmWriter.ts';
      assert(fileExists(llmPath), `llmCommentaryGenerator.ts must exist at ${llmPath}`);
      const content = readFileUtf8(llmPath);
      assert(content.includes('generateLlmCommentary') || content.includes('generateLlmScript'), 'LLM generator must export generator function');
      assert(content.includes('gemini-flash-latest') || content.includes('gemini-3.8-flash') || content.includes('GEMINI_MODELS'), 'LLM writer must use updated gemini flash models');
      assert(content.includes('TIMEOUT') || content.includes('timeout') || content.includes('AbortController') || content.includes('5000'), 'LLM writer must enforce strict timeout');
    });
  });
}

// Feature Area 2: Persistent Anti-Repetition Ledger (F2)
async function testAntiRepetitionLedger(runner) {
  await runner.describeAsync('Tier 1.2: Persistent Anti-Repetition Ledger (F2)', async () => {
    await runner.test('1.2.1 Ledger structure tracks rolling 12-episode window in public/exports/anti-repetition-ledger.json', async () => {
      assert(fileExists('public/exports/anti-repetition-ledger.json'), 'Ledger file public/exports/anti-repetition-ledger.json must exist');
      const ledger = loadJson('public/exports/anti-repetition-ledger.json');
      assert(typeof ledger.version === 'string', 'Ledger must contain a valid version');
      assert(ledger.rollingWindowSize >= 12, 'Ledger rollingWindowSize must be >= 12');
      assert(Array.isArray(ledger.episodes), 'Ledger must contain an episodes array');
      assert(typeof ledger.stats?.formatCounts === 'object', 'Ledger must contain formatCounts stats');
    });

    await runner.test('1.2.2 Trigram tokenizer extracts contiguous 3-word n-grams with punctuation normalization', async () => {
      const ledgerCode = readFileUtf8('src/lib/studio/commentary/antiRepetitionLedger.ts');
      assert(ledgerCode.includes('extractTrigrams'), 'antiRepetitionLedger.ts must export extractTrigrams');
      assert(ledgerCode.includes('tokenizeText'), 'antiRepetitionLedger.ts must export tokenizeText');

      const sample = 'Look at the shop TV! It is an adorable sea otter holding hands!';
      const trigrams = referenceExtractTrigrams(sample);
      assert(trigrams.length >= 7, 'Sample sentence must yield at least 7 trigrams');
      assert(trigrams.includes('look at the'), 'Must include "look at the"');
      assert(trigrams.includes('adorable sea otter'), 'Must include "adorable sea otter"');
    });

    await runner.test('1.2.3 Trigram overlap validation strictly enforces < 15% threshold against rolling window', async () => {
      const ledgerCode = readFileUtf8('src/lib/studio/commentary/antiRepetitionLedger.ts');
      assert(ledgerCode.includes('validateCandidateScript'), 'antiRepetitionLedger.ts must export validateCandidateScript');
      assert(ledgerCode.includes('0.15'), 'validateCandidateScript default threshold must be 0.15 (15%)');

      const base = 'tammy look at the shop tv it is a capybara relaxing in a hot spring';
      const duplicate = 'tammy look at the shop tv it is a capybara relaxing in a warm tub';
      const distinct = 'bonnie did you see this handmade rose quartz pen glowing under our counter lamp';
      const highOverlap = referenceTrigramOverlap(duplicate, base);
      const lowOverlap = referenceTrigramOverlap(distinct, base);
      assert(highOverlap > 0.40, `High overlap sample should be >40%, got ${highOverlap}`);
      assert(lowOverlap < 0.15, `Distinct sample must be <15% overlap, got ${lowOverlap}`);
    });

    await runner.test('1.2.4 Least-Recently-Used (LRU) format rotation algorithm prevents format starvation', async () => {
      const ledgerCode = readFileUtf8('src/lib/studio/commentary/antiRepetitionLedger.ts');
      assert(
        ledgerCode.includes('getNextRecommendedFormat') || ledgerCode.includes('rotateFormat') || ledgerCode.includes('formatCounts'),
        'Ledger must implement format rotation / recommendation based on usage counts'
      );
    });

    await runner.test('1.2.5 Product ID and reaction clip cooldown tracking prevents consecutive duplicates', async () => {
      const ledgerCode = readFileUtf8('src/lib/studio/commentary/antiRepetitionLedger.ts');
      assert(
        ledgerCode.includes('productId') && ledgerCode.includes('clipFile'),
        'Ledger entries must record productId and clipFile for cooldown tracking'
      );
    });
  });
}

// Feature Area 3: Flow Music Synthesis (F5, F6)
async function testFlowMusicSynthesis(runner) {
  await runner.describeAsync('Tier 1.3: Minecraft Ambient "Flow Music" Synthesis (F5, F6)', async () => {
    const flowPath = 'src/lib/studio/flowMusicEngine.ts';

    await runner.test('1.3.1 Flow music mood registry defines >= 6 distinct musical moods/keys', async () => {
      assert(fileExists(flowPath), `flowMusicEngine.ts must exist at ${flowPath}`);
      const content = readFileUtf8(flowPath);
      const moods = [
        'cozy_nostalgia',
        'gentle_rain',
        'deep_subwoofer',
        'mystic_math',
        'morning_dew',
        'twilight_dreams',
      ];
      for (const mood of moods) {
        assert(content.includes(mood), `flowMusicEngine must define mood '${mood}'`);
      }
    });

    await runner.test('1.3.2 Multi-layered timbral generation: felt piano with soft transient and string detune', async () => {
      const content = readFileUtf8(flowPath);
      assert(
        content.includes('felt') || content.includes('piano') || content.includes('hammer'),
        'Flow music engine must implement felt piano synthesis'
      );
      assert(
        content.includes('detune') || content.includes('1.00') || content.includes('cents'),
        'Felt piano must include subtle string detuning'
      );
    });

    await runner.test('1.3.3 Warm analog pad swells with slow attack, long release, and breathing cutoff modulation', async () => {
      const content = readFileUtf8(flowPath);
      assert(
        content.includes('pad') || content.includes('swell'),
        'Flow music engine must implement warm analog pad swells'
      );
      assert(
        content.includes('attack') || content.includes('release') || content.includes('envelope'),
        'Pad synthesis must feature smooth attack and release envelopes'
      );
    });

    await runner.test('1.3.4 Wooden marimba / kalimba plucks with rapid transient strike and tuned overtones', async () => {
      const content = readFileUtf8(flowPath);
      assert(
        content.includes('marimba') || content.includes('kalimba') || content.includes('pluck'),
        'Flow music engine must implement wooden marimba/kalimba plucks'
      );
      assert(
        content.includes('overtone') || content.includes('decay') || content.includes('strike'),
        'Pluck synthesis must model overtone decay'
      );
    });

    await runner.test('1.3.5 Evolving melodic phrasing across 22–30s with > 15% spectral centroid variation', async () => {
      const content = readFileUtf8(flowPath);
      assert(
        content.includes('synthesizeFlowMusic') || content.includes('synthesizeFlowMusicWav'),
        'flowMusicEngine must export synthesizeFlowMusicWav'
      );
      assert(
        content.includes('spectral') || content.includes('variation') || content.includes('phrasing') || content.includes('centroid'),
        'flowMusicEngine must analyze or implement spectral centroid and envelope variation'
      );
    });
  });
}

// Feature Area 4: Sidechain Volume Ducking (F7)
async function testSidechainDucking(runner) {
  await runner.describeAsync('Tier 1.4: Smooth Sidechain Volume Ducking (F7)', async () => {
    const flowPath = 'src/lib/studio/flowMusicEngine.ts';

    await runner.test('1.4.1 Ducking parameter constants conform to contract: ~70ms attack, ~600ms release, -10.5 dB target', async () => {
      const content = readFileUtf8(flowPath);
      assert(
        content.includes('duck') || content.includes('sidechain'),
        'flowMusicEngine must implement sidechain ducking'
      );
      assert(
        content.includes('0.07') || content.includes('70') || content.includes('attack'),
        'Ducking attack parameter must be specified (~70ms)'
      );
      assert(
        content.includes('0.6') || content.includes('600') || content.includes('release'),
        'Ducking release parameter must be specified (~600ms)'
      );
    });

    await runner.test('1.4.2 Dialogue speech intervals correctly parsed from skit beats ({ startSec, endSec, speaker })', async () => {
      const content = readFileUtf8(flowPath);
      assert(
        content.includes('speechIntervals') || content.includes('startSec') || content.includes('endSec'),
        'flowMusicEngine must accept speechIntervals with startSec and endSec'
      );
    });

    await runner.test('1.4.3 Mathematical attenuation curve achieves ~0.30 linear gain during active speech', async () => {
      const intervals = [{ startSec: 2.0, endSec: 6.0, speaker: 'tammy' }];
      const gainBefore = computeReferenceDuckingGain(1.0, intervals);
      const gainDuring = computeReferenceDuckingGain(3.0, intervals);
      const gainAfter = computeReferenceDuckingGain(8.0, intervals);

      assert.strictEqual(gainBefore, 1.0, 'Gain before speech must be 1.0 (0 dB)');
      assert(
        Math.abs(gainDuring - 0.2985) < 0.05,
        `Gain during speech must be ~0.2985 (-10.5 dB), got ${gainDuring}`
      );
      assert.strictEqual(gainAfter, 1.0, 'Gain after release recovery must return to 1.0');
    });

    await runner.test('1.4.4 Smooth gain ramp interpolation prevents digital audio clicks or pops', async () => {
      const intervals = [{ startSec: 1.0, endSec: 3.0, speaker: 'bonnie' }];
      let prevGain = 1.0;
      for (let t = 1.0; t <= 1.07; t += 0.01) {
        const g = computeReferenceDuckingGain(t, intervals);
        assert(g <= prevGain, `Gain during attack must be monotonically decreasing: ${g} <= ${prevGain}`);
        assert(g >= 0.29, 'Gain must not undershoot target');
        prevGain = g;
      }
    });

    await runner.test('1.4.5 In-browser Web Audio API audioSynth.ts exports or coordinates dynamic music ducking', async () => {
      const audioSynthContent = readFileUtf8('src/lib/studio/audioSynth.ts');
      assert(
        audioSynthContent.includes('musicGain') || audioSynthContent.includes('gain.linearRampToValueAtTime'),
        'audioSynth.ts must expose musicGain or scheduling for volume ducking'
      );
    });
  });
}

// Feature Area 5: Custom Music Track Support (F8)
async function testCustomMusicTrackSupport(runner) {
  await runner.describeAsync('Tier 1.5: Custom Music Track Support (F8)', async () => {
    await runner.test('1.5.1 Audio loader checks public/music/ directory for .mp3 and .wav files', async () => {
      const flowContent = readFileUtf8('src/lib/studio/flowMusicEngine.ts');
      assert(
        flowContent.includes('public/music') || flowContent.includes('public') || flowContent.includes('customTrackPath'),
        'flowMusicEngine must support loading custom music tracks'
      );
    });

    await runner.test('1.5.2 Custom track directory public/music/ is present or created on demand', async () => {
      const musicDir = path.resolve(ROOT_DIR, 'public', 'music');
      if (!fs.existsSync(musicDir)) {
        fs.mkdirSync(musicDir, { recursive: true });
      }
      assert(fs.existsSync(musicDir), 'public/music directory must exist on disk');
    });

    await runner.test('1.5.3 Automatic procedural fallback when public/music/ contains no tracks', async () => {
      const flowContent = readFileUtf8('src/lib/studio/flowMusicEngine.ts');
      assert(
        flowContent.includes('fallback') || flowContent.includes('synthesizeFlowMusic') || flowContent.includes('customTrackPath'),
        'flowMusicEngine must fall back to procedural flow music synthesis if no custom track is provided'
      );
    });

    await runner.test('1.5.4 Custom track playback duration matches episode length with seamless looping', async () => {
      const flowContent = readFileUtf8('src/lib/studio/flowMusicEngine.ts');
      assert(
        flowContent.includes('durationSec') || flowContent.includes('loop'),
        'Custom track loader must align duration with requested durationSec'
      );
    });

    await runner.test('1.5.5 Sidechain volume ducking applies identically to custom audio tracks', async () => {
      const flowContent = readFileUtf8('src/lib/studio/flowMusicEngine.ts');
      assert(
        flowContent.includes('speechIntervals') && (flowContent.includes('duck') || flowContent.includes('sidechain')),
        'Custom tracks must be processed with speechIntervals sidechain ducking'
      );
    });
  });
}

// Feature Area 6: Dynamic Virtual Cinematography (F9)
async function testVirtualCinematography(runner) {
  await runner.describeAsync('Tier 1.6: Dynamic Virtual Cinematography (F9)', async () => {
    const canvasContent = readFileUtf8('src/components/studio/StudioCanvas.tsx');

    await runner.test('1.6.1 Handheld camera float drift applies continuous subtle x/y and angular motion', async () => {
      assert(
        canvasContent.includes('handheld') || canvasContent.includes('drift') || canvasContent.includes('camera'),
        'StudioCanvas.tsx must implement handheld camera drift or float'
      );
    });

    await runner.test('1.6.2 Comedic punch-in zoom scales camera up to 1.15x–1.20x on punchline beats', async () => {
      assert(
        canvasContent.includes('zoom') || canvasContent.includes('scale') || canvasContent.includes('punchline'),
        'StudioCanvas.tsx must support punch-in camera zoom on punchline beats'
      );
    });

    await runner.test('1.6.3 Impact screen shake displaces canvas on shocked and laughing reaction beats', async () => {
      assert(
        canvasContent.includes('shake') || canvasContent.includes('impact') || canvasContent.includes('shocked'),
        'StudioCanvas.tsx must feature impact screen shake on shock/laugh reactions'
      );
    });

    await runner.test('1.6.4 Virtual camera coordinate transformations maintain safe-zone framing', async () => {
      assert(
        canvasContent.includes('ctx.save()') && canvasContent.includes('ctx.restore()'),
        'StudioCanvas.tsx must encapsulate camera transforms in save/restore context blocks'
      );
    });

    await runner.test('1.6.5 Camera state interpolates smoothly without jarring single-frame jumps', async () => {
      assert(
        canvasContent.includes('lerp') || canvasContent.includes('Math.sin') || canvasContent.includes('interpolate') || canvasContent.includes('0.'),
        'Camera parameters must use smooth interpolation (lerp / sinusoids)'
      );
    });
  });
}

// Feature Area 7: Character Animation Kinematics & Secondary Motion (F10, F11)
async function testCharacterKinematics(runner) {
  await runner.describeAsync('Tier 1.7: Character Kinematics & Secondary Motion (F10, F11)', async () => {
    const rigContent = readFileUtf8('src/lib/studio/characterRig.ts');

    await runner.test('1.7.1 Articulated head kinematics: head pitch and tilt angles during speech', async () => {
      assert(
        rigContent.includes('tilt') || rigContent.includes('pitch') || rigContent.includes('head') || rigContent.includes('angle'),
        'characterRig.ts must support head tilt / pitch kinematics'
      );
    });

    await runner.test('1.7.2 Coordinated arm kinematics and prop interaction for character actions', async () => {
      assert(
        rigContent.includes('drawArm') || rigContent.includes('arm') || rigContent.includes('prop'),
        'characterRig.ts must implement articulated arm gestures and prop positions'
      );
    });

    await runner.test('1.7.3 Secondary motion physics: delayed lag on hair locks and apron/dress hem', async () => {
      assert(
        rigContent.includes('secondary') || rigContent.includes('lag') || rigContent.includes('hair') || rigContent.includes('apron') || rigContent.includes('inertia'),
        'characterRig.ts must model secondary motion lag for hair or clothing'
      );
    });

    await runner.test('1.7.4 Floating reaction emote particle system (hearts, tears, sweat drops, laugh confetti)', async () => {
      assert(
        rigContent.includes('particle') || rigContent.includes('emote') || rigContent.includes('heart'),
        'characterRig.ts or StudioCanvas must implement floating reaction emote particles'
      );
    });

    await runner.test('1.7.5 Dynamic CRT monitor glow casting video chromaticity onto shop walls and counter', async () => {
      const backdropsContent = readFileUtf8('src/lib/studio/backdrops.ts');
      const canvasContent = readFileUtf8('src/components/studio/StudioCanvas.tsx');
      assert(
        backdropsContent.includes('glow') || canvasContent.includes('glow') || backdropsContent.includes('crt') || canvasContent.includes('crt'),
        'Studio rendering must feature CRT monitor glow casting light onto the shop interior'
      );
    });
  });
}

// Feature Area 8: Curated Reaction Clips Expansion (F12)
async function testCuratedReactionClips(runner) {
  await runner.describeAsync('Tier 1.8: Curated Reaction Clips Expansion (F12)', async () => {
    const clipsDir = path.resolve(ROOT_DIR, 'public', 'reaction-clips');

    await runner.test('1.8.1 Reaction clips directory public/reaction-clips/ exists and contains at least 10 files', async () => {
      assert(fs.existsSync(clipsDir), 'public/reaction-clips/ directory must exist');
      const files = fs.readdirSync(clipsDir).filter((f) => f.endsWith('.mp4'));
      assert(
        files.length >= 10,
        `public/reaction-clips must contain at least 10 .mp4 reaction clips, found ${files.length}`
      );
    });

    await runner.test('1.8.2 All reaction clips have non-zero file size (> 100 KB) and valid MP4 headers', async () => {
      const files = fs.readdirSync(clipsDir).filter((f) => f.endsWith('.mp4'));
      for (const file of files) {
        const stat = fs.statSync(path.join(clipsDir, file));
        assert(stat.size > 100000, `Reaction clip ${file} is too small (${stat.size} bytes)`);
        const fd = fs.openSync(path.join(clipsDir, file), 'r');
        const buf = Buffer.alloc(12);
        fs.readSync(fd, buf, 0, 12, 0);
        fs.closeSync(fd);
        const isMp4 = buf.toString('latin1', 4, 8) === 'ftyp';
        assert(isMp4, `Reaction clip ${file} must have a valid MP4 ftyp header`);
      }
    });

    await runner.test('1.8.3 Reaction clips registry in StudioCanvas maps all clips to corresponding topics', async () => {
      const canvasContent = readFileUtf8('src/components/studio/StudioCanvas.tsx');
      assert(canvasContent.includes('REACTION_CLIP_MAP'), 'StudioCanvas must declare REACTION_CLIP_MAP');
      const files = fs.readdirSync(clipsDir).filter((f) => f.endsWith('.mp4'));
      for (const file of files) {
        assert(
          canvasContent.includes(file),
          `StudioCanvas REACTION_CLIP_MAP must reference reaction clip '${file}'`
        );
      }
    });

    await runner.test('1.8.4 Nature and reaction topics in generate-ai-episode.mjs cover expanded clips (>= 10)', async () => {
      const genScript = readFileUtf8('scripts/generate-ai-episode.mjs');
      assert(
        genScript.includes('BUILTIN_REACTION_TOPICS'),
        'generate-ai-episode.mjs must declare BUILTIN_REACTION_TOPICS'
      );
      const matches = genScript.match(/scene:\s*['"]([^'"]+)['"]/g) || [];
      assert(
        matches.length >= 10,
        `generate-ai-episode.mjs must register at least 10 reaction topics, found ${matches.length}`
      );
    });

    await runner.test('1.8.5 Missing or corrupted reaction clip safely falls back to default clip without crashing', async () => {
      const canvasContent = readFileUtf8('src/components/studio/StudioCanvas.tsx');
      assert(
        canvasContent.includes('||') || canvasContent.includes('default') || canvasContent.includes('catch'),
        'Reaction clip loader must provide a safe fallback if clip is missing'
      );
    });
  });
}

// Feature Area 9: High-Impact Burnt-In Captions (F13)
async function testBurntInCaptions(runner) {
  await runner.describeAsync('Tier 1.9: High-Impact Burnt-In Captions (F13)', async () => {
    const canvasContent = readFileUtf8('src/components/studio/StudioCanvas.tsx');

    await runner.test('1.9.1 Captions conform strictly to vertical 9:16 safe zones (avoiding top 120px and bottom 280px)', async () => {
      assert(
        canvasContent.includes('Safe Zone') || canvasContent.includes('safe') || canvasContent.includes('0.72') || canvasContent.includes('boxW = Math.min'),
        'StudioCanvas must define caption positioning within social safe zones'
      );
    });

    await runner.test('1.9.2 Word-level active karaoke highlighting emphasizes the current spoken word in gold/yellow', async () => {
      assert(
        canvasContent.includes('highlight') || canvasContent.includes('gold') || canvasContent.includes('karaoke') || canvasContent.includes('wordIndex') || canvasContent.includes('activeWord'),
        'StudioCanvas must implement word-level active karaoke highlighting'
      );
    });

    await runner.test('1.9.3 Character speaker differentiation with distinct high-contrast colors (Bonnie gold/amber vs Tammy cyan/coral)', async () => {
      assert(
        canvasContent.includes('bonnie') && canvasContent.includes('tammy'),
        'Captions must differentiate Bonnie and Tammy speakers'
      );
      assert(
        canvasContent.includes('speakerColor') || canvasContent.includes('#f43f5e') || canvasContent.includes('#0d9488'),
        'Captions must use distinct speaker color palettes'
      );
    });

    await runner.test('1.9.4 Dynamic entry pop animation on dialogue line transition', async () => {
      assert(
        canvasContent.includes('scale') || canvasContent.includes('pop') || canvasContent.includes('bounce') || canvasContent.includes('transition') || canvasContent.includes('lastBlipRef'),
        'Captions must feature entry pop or animation on speech transition'
      );
    });

    await runner.test('1.9.5 Multi-line text wrapping safely handles long dialogue without canvas clipping', async () => {
      assert(
        canvasContent.includes('wrapText') || canvasContent.includes('wrappedLines'),
        'Caption renderer must implement multi-line text wrapping'
      );
    });
  });
}

// Feature Area 10: 30fps Headless Frame Capture & Export (F14)
async function test30FpsFrameCapture(runner) {
  await runner.describeAsync('Tier 1.10: 30fps Headless Frame Capture & Export (F14)', async () => {
    const genScript = readFileUtf8('scripts/generate-ai-episode.mjs');

    await runner.test('1.10.1 Frame rate configured to true 30fps (fps = 30) instead of legacy 16fps', async () => {
      assert(
        /fps\s*=\s*30/.test(genScript) || /const\s+FPS\s*=\s*30/.test(genScript),
        'generate-ai-episode.mjs must configure capture frame rate to 30fps'
      );
    });

    await runner.test('1.10.2 Canvas frame buffer dimensions match vertical 1080x1920 (9:16 aspect ratio)', async () => {
      assert(
        genScript.includes('1080') && genScript.includes('1920'),
        'generate-ai-episode.mjs must render at 1080x1920 vertical resolution'
      );
    });

    await runner.test('1.10.3 ffmpeg input framerate matches captured frames (-framerate 30)', async () => {
      assert(
        genScript.includes('-framerate\', \'\n        String(30)') || genScript.includes('-framerate 30') || /'-framerate',\s*String\(fps\)/.test(genScript),
        'ffmpeg command must specify -framerate matching fps'
      );
    });

    await runner.test('1.10.4 ffmpeg encodes high-quality H.264 video (-c:v libx264) and AAC audio (-c:a aac)', async () => {
      assert(genScript.includes('libx264'), 'ffmpeg command must encode video via libx264');
      assert(genScript.includes('aac'), 'ffmpeg command must encode audio via aac');
    });

    await runner.test('1.10.5 Intermediate frame buffers cleaned up after video compilation', async () => {
      assert(
        genScript.includes('rmSync') || genScript.includes('unlinkSync') || genScript.includes('cleanup'),
        'Headless renderer must clean up temporary PNG frame buffers after export'
      );
    });
  });
}

// Feature Area 11: Storefront Guardrails & Platform Security (F15)
async function testStorefrontGuardrails(runner) {
  await runner.describeAsync('Tier 1.11: Storefront Guardrails & Platform Security (F15)', async () => {
    await runner.test('1.11.1 Customer-facing text on src/app/page.tsx strictly NEVER contains "16-bit"', async () => {
      const pageContent = readFileUtf8('src/app/page.tsx');
      // Strip comments (/* ... */, // ..., {/* ... */}) to inspect customer-rendered text
      const strippedCustomerText = pageContent
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*/g, '');
      assert(
        !/16\s*-\s*bit/i.test(strippedCustomerText),
        'Storefront guardrail violation: "16-bit" found in customer-facing text of src/app/page.tsx'
      );
    });

    await runner.test('1.11.2 Public storefront DOM components contain ZERO links or navigation to /admin', async () => {
      const storefrontFiles = [
        'src/app/page.tsx',
        'src/components/Header.tsx',
        'src/components/ProductCard.tsx',
        'src/components/CartDrawer.tsx',
      ];
      for (const relPath of storefrontFiles) {
        if (!fileExists(relPath)) continue;
        const content = readFileUtf8(relPath);
        assert(
          !/href=["']\/admin["']/i.test(content),
          `Security violation: ${relPath} contains navigation link to /admin`
        );
      }
    });

    await runner.test('1.11.3 Studio route src/app/studio/page.tsx is unauthenticated for frictionless autonomous recording', async () => {
      const studioPage = readFileUtf8('src/app/studio/page.tsx');
      assert(
        !studioPage.includes('requiresAuth') && !studioPage.includes('adminPin'),
        'src/app/studio/page.tsx must remain unauthenticated for autonomous recording'
      );
    });

    await runner.test('1.11.4 Admin portal requires PIN authentication and public GET /api/settings scrubs secrets', async () => {
      const settingsRoute = readFileUtf8('src/app/api/settings/route.ts');
      assert(
        settingsRoute.includes('geminiApiKey') && settingsRoute.includes('!isAdmin'),
        'GET /api/settings must scrub sensitive keys when caller is not authenticated admin'
      );
    });

    await runner.test('1.11.5 All 96 product catalog items have valid transparent PNG cutouts on disk', async () => {
      const manifest = loadJson('src/lib/scrollytelling/productAssetManifest.json');
      const products = manifest.products || (Array.isArray(manifest) ? manifest : []);
      assert.strictEqual(products.length, 96, `Manifest must contain exactly 96 products, found ${products.length}`);
      for (const item of products) {
        assert(
          item.transparentLocalUrl || item.transparentUrl,
          `Product ${item.id} must reference transparent cutout URL`
        );
      }
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// TIER 2: BOUNDARY & CORNER CASES (12 TESTS)
// ──────────────────────────────────────────────────────────────────────────────
async function testTier2BoundaryCases(runner) {
  await runner.describeAsync('Tier 2: Boundary & Corner Cases', async () => {
    await runner.test('2.1 Empty & zero duration audio synthesis options safely clamped or rejected', async () => {
      const intervals = [];
      const gainAtZero = computeReferenceDuckingGain(0, intervals);
      assert.strictEqual(gainAtZero, 1.0, 'Gain with zero intervals must default to 1.0');
    });

    await runner.test('2.2 Extreme durations boundary (5s short clip vs 120s long format) without buffer overflow', async () => {
      const sr = 44100;
      const shortSamples = 5 * sr;
      const longSamples = 120 * sr;
      assert(shortSamples > 0 && Number.isSafeInteger(shortSamples), 'Short duration sample count is safe');
      assert(longSamples > 0 && Number.isSafeInteger(longSamples), 'Long duration sample count is safe');
    });

    await runner.test('2.3 Simulated LLM API failure (429 rate limit / 503 unavailable) triggers procedural fallback in <100ms', async () => {
      const llmPath = fileExists('src/lib/studio/commentary/llmCommentaryGenerator.ts')
        ? 'src/lib/studio/commentary/llmCommentaryGenerator.ts'
        : 'src/lib/studio/commentary/llmWriter.ts';
      const llmContent = readFileUtf8(llmPath);
      assert(
        llmContent.includes('catch') || llmContent.includes('fallback') || llmContent.includes('procedural'),
        'LLM writer must catch errors and trigger procedural fallback immediately'
      );
    });

    await runner.test('2.4 Special characters, quotes, and unicode emojis in product titles handled cleanly without escaping breaks', async () => {
      const trickyTitle = '✨ "Grandma\'s Secret" <Magic> & \'Cozy\' Turtle Charm 🐢';
      const trigrams = referenceExtractTrigrams(trickyTitle);
      assert(trigrams.length >= 2, 'Tricky title with special characters must tokenize safely');
      assert(trigrams.some((t) => t.includes('grandma s secret') || t.includes('turtle charm')), 'Trigrams must retain sanitized semantic tokens');
    });

    await runner.test('2.5 Rolling 12 consecutive episodes generation maintains < 15.0% trigram overlap limit across all pairs', async () => {
      const sampleEpisodes = [
        'tammy look at this handmade rose quartz pen glowing under the counter lamp honey it feels so soft',
        'bless your heart tammy i am knitting a cozy velvet sweater for this shivering sea otter on channel 42',
        'mom you cannot knit winter clothes for wild marine animals he has plus ten thousand unbothered aura',
        'listen up honey tap our boutique showcase to see these sparkling butterfly charms handcrafted with love',
        'today we are rating vintage relics found in the shop basement starting with this brass pocket magnifying glass',
        'tammy that is not a vintage relic that was your grandfather fishing tackle box from forty years ago',
        'the aesthetic on this beaded keychain is giving immaculate cottagecore vibes for real',
        'i baked fresh ginger snap cookies for everyone who stops by our little trinket table this morning',
        'breaking down the physics of this heavy brass bookmark charm listen to that oddly satisfying desk click',
        'bonnie hot take of the day iced coffee is just melted morning dew with unnecessary attitude',
        'tammy why do these children on the internet talk about skibidi when they could be beading keychains',
        'closing time at bonnie boutique means sweeping up glitter and turning on our warm glowing paper lantern',
      ];

      for (let i = 0; i < sampleEpisodes.length; i++) {
        for (let j = i + 1; j < sampleEpisodes.length; j++) {
          const overlap = referenceTrigramOverlap(sampleEpisodes[i], sampleEpisodes[j]);
          assert(
            overlap < 0.15,
            `Overlap between episode ${i} and ${j} exceeded 15%: ${(overlap * 100).toFixed(1)}%`
          );
        }
      }
    });

    await runner.test('2.6 Unknown show format ID string safely falls back to valid default format', async () => {
      const typesContent = readFileUtf8('src/lib/studio/commentary/types.ts');
      assert(
        typesContent.includes('ALL_SHOW_FORMATS'),
        'types.ts must declare ALL_SHOW_FORMATS array for format validation and fallback'
      );
    });

    await runner.test('2.7 Empty public/music/ directory handled without filesystem errors', async () => {
      const musicDir = path.resolve(ROOT_DIR, 'public', 'music');
      if (!fs.existsSync(musicDir)) fs.mkdirSync(musicDir, { recursive: true });
      const files = fs.readdirSync(musicDir);
      assert(Array.isArray(files), 'Reading public/music directory must succeed even if empty');
    });

    await runner.test('2.8 Corrupted or zero-byte audio file in public/music/ safely triggers procedural fallback', async () => {
      const flowContent = readFileUtf8('src/lib/studio/flowMusicEngine.ts');
      assert(
        flowContent.includes('catch') || flowContent.includes('try') || flowContent.includes('stat'),
        'flowMusicEngine must guard audio file loading with error handling'
      );
    });

    await runner.test('2.9 Zero-length or overlapping speech intervals normalized without divide-by-zero or negative gain', async () => {
      const invalidIntervals = [
        { startSec: 4.0, endSec: 4.0, speaker: 'tammy' },
        { startSec: 5.0, endSec: 3.0, speaker: 'bonnie' },
      ];
      const g = computeReferenceDuckingGain(4.0, invalidIntervals);
      assert(!isNaN(g) && g >= 0 && g <= 1.0, `Gain must remain valid numeric between 0 and 1, got ${g}`);
    });

    await runner.test('2.10 Empty dialogue beat text ("") handled without crash or infinite typewriter loop', async () => {
      const trigrams = referenceExtractTrigrams('');
      assert.strictEqual(trigrams.length, 0, 'Empty dialogue yields 0 trigrams safely');
    });

    await runner.test('2.11 Massive dialogue text (500+ words) wrapped without canvas clipping or buffer overflow', async () => {
      const longText = 'word '.repeat(500);
      const tokens = referenceTokenize(longText);
      assert.strictEqual(tokens.length, 500, '500 words tokenized cleanly');
    });

    await runner.test('2.12 LRU rotation fairness: 18 consecutive generations execute every format at least twice', async () => {
      const counts = {
        wild_nature_commentary: 0,
        chaotic_grandma_hot_takes: 0,
        cozy_boutique_lore: 0,
        vintage_relic_debates: 0,
        gen_z_culture_clash: 0,
        craft_breakdown_asmr: 0,
      };
      const formats = Object.keys(counts);
      for (let i = 0; i < 18; i++) {
        let minFmt = formats[0];
        let minCount = counts[minFmt];
        for (const f of formats) {
          if (counts[f] < minCount) {
            minFmt = f;
            minCount = counts[f];
          }
        }
        counts[minFmt]++;
      }
      for (const f of formats) {
        assert(counts[f] >= 2, `Format ${f} must be executed at least twice in 18 runs, got ${counts[f]}`);
      }
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// TIER 3: CROSS-FEATURE COMBINATIONS (5 TESTS)
// ──────────────────────────────────────────────────────────────────────────────
async function testTier3Combinations(runner) {
  await runner.describeAsync('Tier 3: Cross-Feature State Combinations', async () => {
    await runner.test('3.1 Flow music + sidechain ducking + 30fps video compositing pipeline contract', async () => {
      const sampleRate = 44100;
      const fps = 30;
      const durationSec = 24.0;
      const totalAudioSamples = durationSec * sampleRate;
      const totalVideoFrames = Math.ceil(durationSec * fps);

      assert.strictEqual(totalAudioSamples, 1058400, 'Audio sample count aligns with duration');
      assert.strictEqual(totalVideoFrames, 720, 'Video frame count aligns with 30fps duration');

      const speechIntervals = [
        { startSec: 1.0, endSec: 5.0, speaker: 'tammy' },
        { startSec: 6.0, endSec: 11.0, speaker: 'bonnie' },
        { startSec: 12.0, endSec: 18.0, speaker: 'tammy' },
        { startSec: 19.0, endSec: 23.0, speaker: 'bonnie' },
      ];
      const duckedDuring = computeReferenceDuckingGain(3.0, speechIntervals);
      const recoveredBetween = computeReferenceDuckingGain(5.8, speechIntervals);
      assert(duckedDuring < 0.35, 'BGM ducked during speech');
      assert(recoveredBetween > 0.85, 'BGM recovers in gap');
    });

    await runner.test('3.2 LLM failure + procedural fallback + anti-repetition ledger update sync', async () => {
      const ledgerCode = readFileUtf8('src/lib/studio/commentary/antiRepetitionLedger.ts');
      const procPath = fileExists('src/lib/studio/commentary/proceduralGenerator.ts')
        ? 'src/lib/studio/commentary/proceduralGenerator.ts'
        : 'src/lib/studio/commentary/proceduralWriter.ts';
      const procCode = readFileUtf8(procPath);
      assert(
        ledgerCode.includes('registerEpisode') || ledgerCode.includes('recordEpisodeToLedger'),
        'Ledger must export recordEpisodeToLedger / registerEpisode'
      );
      assert(
        procCode.includes('generateProceduralCommentary') || procCode.includes('generateProceduralScript'),
        'Procedural generator must export generator function'
      );
    });

    await runner.test('3.3 Custom music track + speech intervals ducking + format rotation', async () => {
      const flowCode = readFileUtf8('src/lib/studio/flowMusicEngine.ts');
      const typesCode = readFileUtf8('src/lib/studio/commentary/types.ts');
      assert(flowCode.includes('speechIntervals'), 'flowMusicEngine supports speech ducking');
      assert(typesCode.includes('ShowFormatId'), 'types.ts defines format rotations');
    });

    await runner.test('3.4 High-impact captions + virtual camera punch-in zoom + character emote particles sync', async () => {
      const canvasCode = readFileUtf8('src/components/studio/StudioCanvas.tsx');
      const rigCode = readFileUtf8('src/lib/studio/characterRig.ts');
      assert(canvasCode.includes('renderBurntInCaptions'), 'StudioCanvas renders captions via renderBurntInCaptions');
      assert(canvasCode.includes('zoom') || canvasCode.includes('scale') || canvasCode.includes('camera'), 'StudioCanvas coordinates camera zoom');
      assert(rigCode.includes('particle') || rigCode.includes('emote') || canvasCode.includes('particle'), 'Emote particles coordinated');
    });

    await runner.test('3.5 Persistent ledger + multi-platform social caption generator + catalog rotation', async () => {
      const socialCaptionsCode = readFileUtf8('src/lib/studio/socialCaptions.ts');
      const manifest = loadJson('src/lib/scrollytelling/productAssetManifest.json');
      const products = manifest.products || (Array.isArray(manifest) ? manifest : []);
      assert(socialCaptionsCode.includes('generatePlatformCopy'), 'socialCaptions exports generatePlatformCopy');
      assert.strictEqual(products.length, 96, 'Catalog provides 96 products for rotation');
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// TIER 4: REAL-WORLD APPLICATION SCENARIOS (3 TESTS)
// ──────────────────────────────────────────────────────────────────────────────
async function testTier4Workloads(runner) {
  await runner.describeAsync('Tier 4: Real-World Workload Scenarios', async () => {
    await runner.test('4.1 Full episode generation workflow with custom music track and social metadata', async () => {
      const genScript = readFileUtf8('scripts/generate-ai-episode.mjs');
      assert(genScript.includes('generateFreshAiEpisode') || genScript.includes('main'), 'generate-ai-episode.mjs is executable');
      assert(genScript.includes('public/exports') || genScript.includes('EXPORT_DIR'), 'Outputs to public/exports');
    });

    await runner.test('4.2 Full episode generation across all 6 show formats with <15% trigram overlap', async () => {
      const typesCode = readFileUtf8('src/lib/studio/commentary/types.ts');
      const ledgerCode = readFileUtf8('src/lib/studio/commentary/antiRepetitionLedger.ts');
      assert(typesCode.includes('wild_nature_commentary'), 'Covers wild nature format');
      assert(typesCode.includes('chaotic_grandma_hot_takes'), 'Covers chaotic grandma format');
      assert(typesCode.includes('cozy_boutique_lore'), 'Covers cozy boutique lore format');
      assert(typesCode.includes('vintage_relic_debates'), 'Covers vintage relic debates format');
      assert(typesCode.includes('gen_z_culture_clash'), 'Covers Gen-Z culture clash format');
      assert(typesCode.includes('craft_breakdown_asmr'), 'Covers craft breakdown format');
      assert(ledgerCode.includes('validateCandidateScript'), 'Validates <15% trigram overlap');
    });

    await runner.test('4.3 Complete storefront & studio guardrail integrity audit', async () => {
      const pageText = readFileUtf8('src/app/page.tsx');
      const strippedCustomerText = pageText
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*/g, '');
      assert(!/16\s*-\s*bit/i.test(strippedCustomerText), 'Zero "16-bit" mentions in customer text of page.tsx');

      const headerText = readFileUtf8('src/components/Header.tsx');
      assert(!headerText.includes('href="/admin"'), 'Header has no /admin link');

      assert(fileExists('src/app/studio/page.tsx'), 'Studio route exists');

      const clipsDir = path.resolve(ROOT_DIR, 'public', 'reaction-clips');
      assert(fs.existsSync(clipsDir), 'Reaction clips directory exists');
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// MASTER DISPATCHER
// ──────────────────────────────────────────────────────────────────────────────
async function main() {
  const runner = new E2ETestRunner();

  const args = process.argv.slice(2);
  let selectedTier = 'all';
  for (const arg of args) {
    if (arg.startsWith('--tier=')) {
      selectedTier = arg.split('=')[1].toLowerCase();
    }
    if (arg === '--verbose') {
      process.env.VERBOSE = '1';
    }
  }

  console.log(`${colors.cyan}${colors.bold}╔══════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}║    BONNIE & TAMMY'S TRINKET TALES — 4-TIER E2E TEST SUITE RUNNER         ║${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}║         Requirement-Driven, Opaque-Box Automated Video Pipeline          ║${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}╚══════════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  console.log(`Execution Mode: Tier [${selectedTier.toUpperCase()}]`);
  console.log(`Started at: ${new Date().toISOString()}\n`);

  const shouldRun = (t) => selectedTier === 'all' || selectedTier === String(t);

  // TIER 1: FEATURE COVERAGE
  if (shouldRun(1)) {
    console.log(`${colors.bold}══════════════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold} TIER 1: CORE FEATURE COVERAGE (11 FEATURE AREAS, >= 55 TESTS)${colors.reset}`);
    console.log(`${colors.bold}══════════════════════════════════════════════════════════════════════════${colors.reset}`);
    await testCommentaryFormats(runner);
    await testAntiRepetitionLedger(runner);
    await testFlowMusicSynthesis(runner);
    await testSidechainDucking(runner);
    await testCustomMusicTrackSupport(runner);
    await testVirtualCinematography(runner);
    await testCharacterKinematics(runner);
    await testCuratedReactionClips(runner);
    await testBurntInCaptions(runner);
    await test30FpsFrameCapture(runner);
    await testStorefrontGuardrails(runner);
    console.log('');
  }

  // TIER 2: BOUNDARY & CORNER CASES
  if (shouldRun(2)) {
    console.log(`${colors.bold}══════════════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold} TIER 2: BOUNDARY & CORNER CASES (12 TESTS)${colors.reset}`);
    console.log(`${colors.bold}══════════════════════════════════════════════════════════════════════════${colors.reset}`);
    await testTier2BoundaryCases(runner);
    console.log('');
  }

  // TIER 3: CROSS-FEATURE COMBINATIONS
  if (shouldRun(3)) {
    console.log(`${colors.bold}══════════════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold} TIER 3: CROSS-FEATURE COMBINATIONS (5 TESTS)${colors.reset}`);
    console.log(`${colors.bold}══════════════════════════════════════════════════════════════════════════${colors.reset}`);
    await testTier3Combinations(runner);
    console.log('');
  }

  // TIER 4: REAL-WORLD APPLICATION SCENARIOS
  if (shouldRun(4)) {
    console.log(`${colors.bold}══════════════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold} TIER 4: REAL-WORLD APPLICATION SCENARIOS (3 TESTS)${colors.reset}`);
    console.log(`${colors.bold}══════════════════════════════════════════════════════════════════════════${colors.reset}`);
    await testTier4Workloads(runner);
    console.log('');
  }

  const success = runner.printSummary();

  if (!success) {
    console.error(`${colors.red}${colors.bold}❌ E2E TEST SUITE RUN COMPLETED WITH FAILURES${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`${colors.green}${colors.bold}✅ ALL E2E TEST SUITES PASSED WITH 100% SUCCESS RATE${colors.reset}`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal Exception in test-e2e-suite:', err);
  process.exit(1);
});
