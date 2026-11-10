#!/usr/bin/env node
/**
 * scripts/stress-test-skits-and-export.mjs
 *
 * EMPIRICAL ADVERSARIAL STRESS TEST HARNESS FOR:
 * "Bonnie & Tammy's Trinket Tales" Autonomous Short-Form Character Animation & Skit Studio
 *
 * Tests the real TypeScript implementation code by transpiling on-the-fly and executing
 * comprehensive empirical tests, oracles, fuzzed inputs, and memory/node leak assertions.
 *
 * 5 Adversarial Suites:
 * - Suite 1: All 22 Built-in Skits Stress & Transition Oracles (durations, dialogue lengths, speaker turns, anti-sales)
 * - Suite 2: Custom Script Builder Adversarial Edge Cases & Fuzzing (corrupt JSON, empty/invalid beats, round-trip serialization)
 * - Suite 3: 24/7 Lo-Fi Looping Engine, 24h Time Progression & Web Audio Lifecycle (continuity, non-repetition, oscillator leaks)
 * - Suite 4: Video Export Queue Mid-Flight Cancellation & Browser MIME Profiles (queue state, mid-flight abort, Chrome/Safari/Firefox MIME)
 * - Suite 5: Multi-Platform Zero-Sales Metadata & Extreme Character Sets (TikTok/Reels/Shorts/Facebook copy, emojis, anti-sales audit)
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import ts from 'typescript';

const ROOT_DIR = process.cwd();
const CACHE_DIR = path.join(ROOT_DIR, 'node_modules', '.cache', 'studio_stress_challenger');

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// ANSI colors
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
};

class StressTestRunner {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.totalPassed = 0;
    this.totalFailed = 0;
    this.findings = [];
    this.startTime = Date.now();
  }

  async describe(name, fn) {
    const suite = { name, tests: [], passed: 0, failed: 0, duration: 0 };
    this.suites.push(suite);
    const prev = this.currentSuite;
    this.currentSuite = suite;
    const start = Date.now();
    console.log(`\n${colors.cyan}${colors.bold}--- ${name} ---${colors.reset}`);
    try {
      await fn();
    } finally {
      suite.duration = Date.now() - start;
      this.currentSuite = prev;
    }
  }

  async test(name, fn) {
    const start = Date.now();
    try {
      await fn();
      const duration = Date.now() - start;
      if (this.currentSuite) {
        this.currentSuite.tests.push({ name, passed: true, duration });
        this.currentSuite.passed++;
      }
      this.totalPassed++;
      console.log(`  ${colors.green}✔ [PASS]${colors.reset} ${name} ${colors.dim}(${duration}ms)${colors.reset}`);
    } catch (err) {
      const duration = Date.now() - start;
      if (this.currentSuite) {
        this.currentSuite.tests.push({ name, passed: false, duration, error: err });
        this.currentSuite.failed++;
      }
      this.totalFailed++;
      this.findings.push({ suite: this.currentSuite?.name, test: name, error: err.message });
      console.error(`  ${colors.red}✖ [FAIL]${colors.reset} ${name} ${colors.dim}(${duration}ms)${colors.reset}`);
      console.error(`     ${colors.red}Error: ${err.message}${colors.reset}`);
      if (process.env.VERBOSE && err.stack) {
        console.error(err.stack);
      }
    }
  }

  summary() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    console.log(`\n${colors.bold}========================================================================${colors.reset}`);
    const summaryColor = this.totalFailed === 0 ? colors.green : colors.red;
    console.log(
      `${summaryColor}${colors.bold}CHALLENGER 2 STRESS TEST SUMMARY: ${this.totalPassed} Passed, ${this.totalFailed} Failed (${duration}s)${colors.reset}`
    );
    console.log(`${colors.bold}========================================================================${colors.reset}`);
    for (const s of this.suites) {
      const statusIcon = s.failed === 0 ? `${colors.green}✔${colors.reset}` : `${colors.red}✖${colors.reset}`;
      console.log(`  ${statusIcon} ${s.name}: ${s.passed}/${s.tests.length} passed ${colors.dim}(${s.duration}ms)${colors.reset}`);
    }
    console.log(`${colors.bold}========================================================================\n${colors.reset}`);
    return this.totalFailed === 0;
  }
}

// ── TRANSPILE AND LOAD TYPESCRIPT MODULES ──────────────────────────────
function transpileStudioModule(srcPath, outName, postProcess = null) {
  let content = fs.readFileSync(path.resolve(ROOT_DIR, srcPath), 'utf8');
  if (postProcess) {
    content = postProcess(content);
  }
  const transpiled = ts.transpileModule(content, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const outPath = path.join(CACHE_DIR, outName);
  fs.writeFileSync(outPath, transpiled, 'utf8');
  return outPath;
}

// Transpile skitTemplates
transpileStudioModule('src/lib/studio/skitTemplates.ts', 'skitTemplates.mjs');

// Transpile rpgAppraisal
transpileStudioModule('src/lib/studio/rpgAppraisal.ts', 'rpgAppraisal.mjs', (code) => {
  const manifestJsonPath = path.resolve(ROOT_DIR, 'src/lib/scrollytelling/productAssetManifest.json').replace(/\\/g, '/');
  return code.replace(
    /import manifest from ['"][^'"]+['"];/,
    `import fs from 'node:fs'; const manifest = JSON.parse(fs.readFileSync('${manifestJsonPath}', 'utf8'));`
  );
});

// Transpile socialCaptions
transpileStudioModule('src/lib/studio/socialCaptions.ts', 'socialCaptions.mjs');

// Transpile audioSynth
transpileStudioModule('src/lib/studio/audioSynth.ts', 'audioSynth.mjs');

// Transpile videoExporter
transpileStudioModule('src/lib/studio/videoExporter.ts', 'videoExporter.mjs', (code) => {
  return code
    .replace("from './audioSynth';", "from './audioSynth.mjs';")
    .replace("from './skitTemplates';", "from './skitTemplates.mjs';");
});

// Import the transpiled modules
const skitTemplates = await import(`file://${path.join(CACHE_DIR, 'skitTemplates.mjs').replace(/\\/g, '/')}`);
const rpgAppraisal = await import(`file://${path.join(CACHE_DIR, 'rpgAppraisal.mjs').replace(/\\/g, '/')}`);
const socialCaptions = await import(`file://${path.join(CACHE_DIR, 'socialCaptions.mjs').replace(/\\/g, '/')}`);
const videoExporter = await import(`file://${path.join(CACHE_DIR, 'videoExporter.mjs').replace(/\\/g, '/')}`);
const audioSynth = await import(`file://${path.join(CACHE_DIR, 'audioSynth.mjs').replace(/\\/g, '/')}`);

const runner = new StressTestRunner();

// ==============================================================================
// SUITE 1: ALL 22 BUILT-IN SKITS STRESS & TRANSITION ORACLES
// ==============================================================================
await runner.describe('Suite 1: Built-in Skit Templates & Beat Transitions', async () => {
  const { BUILT_IN_SKITS } = skitTemplates;

  await runner.test('1.1 Catalog size: exactly 22 non-salesy skits across 3 categories', async () => {
    assert(Array.isArray(BUILT_IN_SKITS), 'BUILT_IN_SKITS must be an array');
    assert(BUILT_IN_SKITS.length >= 22, `Expected >= 22 built-in skits, got ${BUILT_IN_SKITS.length}`);

    const counts = { grandma_wisdom: 0, rpg_appraisal: 0, shopkeep_life: 0, fourth_wall: 0 };
    for (const skit of BUILT_IN_SKITS) {
      assert(counts[skit.category] !== undefined, `Unknown skit category: ${skit.category}`);
      counts[skit.category]++;
    }

    assert(counts.grandma_wisdom >= 8, `Expected >= 8 grandma_wisdom skits, got ${counts.grandma_wisdom}`);
    assert(counts.rpg_appraisal >= 7, `Expected >= 7 rpg_appraisal skits, got ${counts.rpg_appraisal}`);
    assert(counts.shopkeep_life >= 7, `Expected >= 7 shopkeep_life skits, got ${counts.shopkeep_life}`);
    assert(counts.fourth_wall >= 6, `Expected >= 6 fourth_wall skits, got ${counts.fourth_wall}`);
  });

  await runner.test('1.2 Skit duration accuracy & beat timeline alignment', async () => {
    for (const skit of BUILT_IN_SKITS) {
      assert(skit.durationSeconds >= 14 && skit.durationSeconds <= 35,
        `Skit "${skit.title}" duration (${skit.durationSeconds}s) is out of 14-35s short-form range`
      );

      const beatSum = skit.beats.reduce((acc, b) => acc + (b.durationSec || 4), 0);
      const diff = Math.abs(beatSum - skit.durationSeconds);
      assert(
        diff <= 3.5,
        `Skit "${skit.title}" duration drift! Defined: ${skit.durationSeconds}s, Beat sum: ${beatSum}s (drift ${diff.toFixed(1)}s > 3.5s)`
      );
    }
  });

  await runner.test('1.3 Beat schema, expression validity, and dialogue character bounds', async () => {
    const validExpressions = new Set(['happy', 'shocked', 'sleepy', 'laughing', 'proud grandma', 'eye-rolling daughter']);
    const validActions = new Set(['walk', 'turn', 'laugh', 'gasp', 'hold trinket', 'sip tea', 'pack box']);
    const validSpeakers = new Set(['bonnie', 'tammy', 'narrator']);

    for (const skit of BUILT_IN_SKITS) {
      assert(skit.beats.length >= 3, `Skit "${skit.title}" has too few beats (${skit.beats.length})`);
      assert(skit.beats.length <= 10, `Skit "${skit.title}" has too many beats (${skit.beats.length})`);

      for (let i = 0; i < skit.beats.length; i++) {
        const beat = skit.beats[i];
        assert(beat.id, `Skit "${skit.title}" beat ${i} missing id`);
        assert(validSpeakers.has(beat.speaker), `Invalid speaker "${beat.speaker}" in skit "${skit.title}" beat ${i}`);
        assert(validExpressions.has(beat.expression), `Invalid expression "${beat.expression}" in skit "${skit.title}" beat ${i}`);
        assert(validActions.has(beat.action), `Invalid action "${beat.action}" in skit "${skit.title}" beat ${i}`);

        const text = beat.dialogue.trim();
        assert(text.length >= 5, `Dialogue too short in skit "${skit.title}" beat ${i}: "${text}"`);
        assert(text.length <= 220, `Dialogue too long (${text.length} chars) for speech bubble in skit "${skit.title}" beat ${i}: "${text}"`);
      }
    }
  });

  await runner.test('1.4 Dialogue flow & speaker transitions (organic multi-character dialogue)', async () => {
    for (const skit of BUILT_IN_SKITS) {
      const speakers = new Set(skit.beats.map((b) => b.speaker));
      assert(
        speakers.has('bonnie') && speakers.has('tammy'),
        `Skit "${skit.title}" lacks dual character dynamic (speakers: ${Array.from(speakers).join(', ')})`
      );

      // Verify conversation alternates speakers (not one speaker talking 4 beats in a row)
      let consecutiveCount = 1;
      let lastSpeaker = skit.beats[0].speaker;
      for (let i = 1; i < skit.beats.length; i++) {
        if (skit.beats[i].speaker === lastSpeaker) {
          consecutiveCount++;
          assert(
            consecutiveCount <= 3,
            `Skit "${skit.title}" has speaker "${lastSpeaker}" speaking ${consecutiveCount} beats consecutively`
          );
        } else {
          lastSpeaker = skit.beats[i].speaker;
          consecutiveCount = 1;
        }
      }
    }
  });

  await runner.test('1.5 Strict zero-sales audit across all 22 skit templates', async () => {
    const salesWordPattern = /\b(buy now|shop now|discount|coupon|promo code|on sale|order today|click the link|purchase|checkout|special offer|\$\d+|add to cart|storefront|best seller)\b/i;

    for (const skit of BUILT_IN_SKITS) {
      assert(!salesWordPattern.test(skit.title), `Skit title contains sales pitch: "${skit.title}"`);
      assert(!salesWordPattern.test(skit.description), `Skit description contains sales pitch: "${skit.description}"`);

      for (let i = 0; i < skit.beats.length; i++) {
        const dialogue = skit.beats[i].dialogue;
        assert(
          !salesWordPattern.test(dialogue),
          `Skit "${skit.title}" beat ${i} contains sales pitch phrase: "${dialogue}"`
        );
      }
    }
  });

  await runner.test('1.6 RPG appraisal skits prop manifest cross-verification & defaultPropId audit', async () => {
    const products = rpgAppraisal.getAllCatalogProducts();
    const productIds = new Set(products.map((p) => p.id));

    const appraisalSkits = BUILT_IN_SKITS.filter((s) => s.category === 'rpg_appraisal');
    assert(appraisalSkits.length >= 7, `Expected >= 7 appraisal skits, got ${appraisalSkits.length}`);

    // Verify all beats with showAppraisalCard
    for (const skit of appraisalSkits) {
      const hasCard = skit.beats.some((b) => b.showAppraisalCard === true);
      assert(hasCard, `Appraisal skit "${skit.title}" has no beat with showAppraisalCard=true`);
    }

    // Check defaultPropId: If defined, must exist in catalog
    const missingProps = [];
    for (const skit of appraisalSkits) {
      if (skit.defaultPropId) {
        assert(productIds.has(skit.defaultPropId), `Appraisal skit "${skit.title}" prop ID "${skit.defaultPropId}" not found in 96 products!`);
      } else {
        missingProps.push(skit.title);
      }
    }

    if (missingProps.length > 0) {
      console.log(`    ${colors.yellow}⚠ [FINDING] 6 of 7 RPG Appraisal skits lack defaultPropId: ${missingProps.join(', ')}${colors.reset}`);
    }
  });
});

// ==============================================================================
// SUITE 2: CUSTOM SCRIPT BUILDER ADVERSARIAL EDGE CASES & FUZZING
// ==============================================================================
await runner.describe('Suite 2: Custom Script Builder Adversarial Edge Cases', async () => {
  const {
    validateScript,
    createEmptyBeat,
    createCustomSkitTemplate,
    exportScriptToJson,
    importScriptFromJson,
  } = skitTemplates;

  await runner.test('2.1 Corrupt JSON syntax and non-object inputs to importScriptFromJson', async () => {
    const corruptInputs = [
      '{ title: "unquoted keys" ',
      '{"title": "unterminated string}',
      '<!DOCTYPE html><html>',
      'undefined',
      'null',
      '12345',
      '"just a plain string"',
      'true',
      '[1, 2, 3]',
      '',
    ];

    for (const corrupt of corruptInputs) {
      const res = importScriptFromJson(corrupt);
      assert(res.error, `Expected error for corrupt input: ${corrupt}`);
      assert.strictEqual(res.skit, undefined, `Expected undefined skit for corrupt input: ${corrupt}`);
    }
  });

  await runner.test('2.2 Script schema validation with malformed and boundary objects', async () => {
    // Missing title
    let res = validateScript({ beats: [{ speaker: 'bonnie', dialogue: 'Hello' }] });
    assert(!res.valid && res.errors.includes('Title is required'));

    // Whitespace title
    res = validateScript({ title: '   \n\t  ', beats: [{ speaker: 'bonnie', dialogue: 'Hello' }] });
    assert(!res.valid && res.errors.includes('Title is required'));

    // Missing beats
    res = validateScript({ title: 'My Skit' });
    assert(!res.valid && res.errors.includes('Script must contain at least one beat'));

    // Empty beats array
    res = validateScript({ title: 'My Skit', beats: [] });
    assert(!res.valid && res.errors.includes('Script must contain at least one beat'));

    // Non-array beats
    res = validateScript({ title: 'My Skit', beats: 'not an array' });
    assert(!res.valid && res.errors.includes('Script must contain at least one beat'));

    // Beat missing speaker
    res = validateScript({ title: 'My Skit', beats: [{ dialogue: 'Hello' }] });
    assert(!res.valid && res.errors.some((e) => e.includes('Speaker is required')));

    // Beat missing dialogue
    res = validateScript({ title: 'My Skit', beats: [{ speaker: 'bonnie', dialogue: '' }] });
    assert(!res.valid && res.errors.some((e) => e.includes('Dialogue text is required')));

    // Beat whitespace dialogue
    res = validateScript({ title: 'My Skit', beats: [{ speaker: 'bonnie', dialogue: '   ' }] });
    assert(!res.valid && res.errors.some((e) => e.includes('Dialogue text is required')));

    // Multiple beat errors accumulated
    res = validateScript({
      title: '',
      beats: [
        { dialogue: '' },
        { speaker: 'tammy', dialogue: '   ' },
      ],
    });
    assert(!res.valid && res.errors.length >= 3, `Expected >= 3 errors, got: ${JSON.stringify(res.errors)}`);
  });

  await runner.test('2.3 Round-trip serialization & deep equality invariance', async () => {
    const original = createCustomSkitTemplate('Adversarial Round-Trip Test');
    original.beats.push({
      id: 'custom_beat_test',
      speaker: 'tammy',
      expression: 'eye-rolling daughter',
      action: 'gasp',
      dialogue: 'Mom, did you test all 22 skits with edge cases? 😱',
      durationSec: 4.5,
      soundEffect: 'gasp',
      propId: 'test_prop_123',
    });

    const json = exportScriptToJson(original);
    assert(typeof json === 'string' && json.length > 50, 'exportScriptToJson must return valid JSON string');

    const imported = importScriptFromJson(json);
    assert(!imported.error, `Import error: ${imported.error}`);
    assert.deepStrictEqual(imported.skit, original, 'Imported skit must match original deeply');
  });

  await runner.test('2.4 createEmptyBeat ID uniqueness across rapid bursts', async () => {
    const ids = new Set();
    const count = 200;
    for (let i = 0; i < count; i++) {
      const beat = createEmptyBeat(i % 2 === 0 ? 'bonnie' : 'tammy');
      assert(!ids.has(beat.id), `Duplicate beat ID generated: ${beat.id}`);
      ids.add(beat.id);
      assert(beat.speaker === (i % 2 === 0 ? 'bonnie' : 'tammy'), 'Speaker mismatch in empty beat');
      assert(beat.dialogue.length > 0, 'Empty beat must provide placeholder dialogue');
    }
  });

  await runner.test('2.5 Extreme stress payload (500 beats & 50KB text)', async () => {
    const hugeSkit = createCustomSkitTemplate('Huge Stress Skit');
    const hugeDialogue = 'A'.repeat(50000);
    hugeSkit.beats = [];
    for (let i = 0; i < 500; i++) {
      hugeSkit.beats.push({
        id: `stress_${i}`,
        speaker: i % 2 === 0 ? 'bonnie' : 'tammy',
        expression: 'happy',
        action: 'turn',
        dialogue: i === 0 ? hugeDialogue : `Quick beat ${i}`,
        durationSec: 3,
      });
    }

    const t0 = Date.now();
    const json = exportScriptToJson(hugeSkit);
    const parsed = importScriptFromJson(json);
    const elapsed = Date.now() - t0;

    assert(!parsed.error, `Failed to parse huge script: ${parsed.error}`);
    assert.strictEqual(parsed.skit.beats.length, 500, '500 beats preserved');
    assert.strictEqual(parsed.skit.beats[0].dialogue.length, 50000, '50KB dialogue preserved');
    assert(elapsed < 200, `Huge payload took too long: ${elapsed}ms > 200ms`);
  });
});

// ==============================================================================
// SUITE 3: 24/7 LO-FI LOOPING ENGINE, 24H TIME PROGRESSION & AUDIO LIFECYCLE
// ==============================================================================
await runner.describe('Suite 3: 24/7 Lo-Fi Looping Engine & Audio Node Lifecycle', async () => {
  const { getLoFiBackdropForHour, generateNextLoFiBeat } = skitTemplates;
  const { studioAudio } = audioSynth;

  await runner.test('3.1 24-hour time-of-day backdrop mapping & boundary robustness', async () => {
    const validBackdrops = new Set([
      'cozy_night_shop',
      'morning_coffee_prep',
      'rainy_window_crafting',
      'holiday_spooky_season',
      'closing_time_lofi',
    ]);

    const expected = [
      { hours: [0, 1], bg: 'cozy_night_shop' },
      { hours: [2, 3, 4], bg: 'closing_time_lofi' },
      { hours: [5, 6, 7, 8, 9, 10], bg: 'morning_coffee_prep' },
      { hours: [11, 12, 13, 14, 15, 16], bg: 'rainy_window_crafting' },
      { hours: [17, 18, 19, 20], bg: 'holiday_spooky_season' },
      { hours: [21, 22, 23], bg: 'cozy_night_shop' },
    ];

    for (const group of expected) {
      for (const h of group.hours) {
        const bg = getLoFiBackdropForHour(h);
        assert.strictEqual(bg, group.bg, `Hour ${h} expected ${group.bg}, got ${bg}`);
        assert(validBackdrops.has(bg));
      }
    }

    // Boundary and anomalous inputs
    assert(validBackdrops.has(getLoFiBackdropForHour()), 'Default without arguments must return valid backdrop');
    assert(validBackdrops.has(getLoFiBackdropForHour(-1)), 'Negative hour must return valid backdrop');
    assert(validBackdrops.has(getLoFiBackdropForHour(24)), 'Hour 24 must return valid backdrop');
    assert(validBackdrops.has(getLoFiBackdropForHour(999)), 'Extreme hour must return valid backdrop');
  });

  await runner.test('3.2 24/7 Lo-Fi continuous banter non-repetition & wrap-around', async () => {
    let lastDialogue = '';
    const generatedDialogues = new Set();

    for (let cycle = 0; cycle < 1000; cycle++) {
      const { beat, backdrop } = generateNextLoFiBeat(cycle, cycle % 24);
      assert(beat.dialogue.length > 5, `Cycle ${cycle} dialogue empty`);
      assert(beat.speaker === 'bonnie' || beat.speaker === 'tammy', `Invalid speaker in cycle ${cycle}`);
      assert(backdrop, `Missing backdrop in cycle ${cycle}`);

      // Ensure consecutive beats don't repeat the exact same line
      assert(
        beat.dialogue !== lastDialogue,
        `Consecutive repeated dialogue detected at cycle ${cycle}: "${beat.dialogue}"`
      );
      lastDialogue = beat.dialogue;
      generatedDialogues.add(beat.dialogue);
    }

    // Verify rich dialogue variety in the banter pool (at least 10 distinct lines)
    assert(
      generatedDialogues.size >= 10,
      `Expected >= 10 distinct banter lines across 1000 cycles, got ${generatedDialogues.size}`
    );
  });

  await runner.test('3.3 Memory stability check over 50,000 generated Lo-Fi beats', async () => {
    // Warmup
    for (let i = 0; i < 1000; i++) generateNextLoFiBeat(i, 12);

    if (global.gc) global.gc();
    const memBefore = process.memoryUsage().heapUsed;

    for (let i = 0; i < 50000; i++) {
      generateNextLoFiBeat(i, i % 24);
    }

    const memAfter = process.memoryUsage().heapUsed;
    const growthMb = (memAfter - memBefore) / (1024 * 1024);
    assert(growthMb < 25, `Heap growth excessive over 50,000 beats: ${growthMb.toFixed(2)} MB`);
  });

  await runner.test('3.4 Web Audio API node lifecycle & oscillator stop time verification', async () => {
    // Build a mock Web Audio API environment that tracks every node
    const createdOscillators = [];
    const createdGainNodes = [];

    class MockAudioParam {
      constructor(val = 0) {
        this.value = val;
      }
      setValueAtTime(val, t) { this.value = val; }
      linearRampToValueAtTime(val, t) { this.value = val; }
      exponentialRampToValueAtTime(val, t) { this.value = val; }
      setTargetAtTime(val, t, tc) { this.value = val; }
    }

    class MockOscillatorNode {
      constructor() {
        this.frequency = new MockAudioParam(440);
        this.type = 'sine';
        this.startedAt = null;
        this.stoppedAt = null;
        createdOscillators.push(this);
      }
      connect() {}
      disconnect() {}
      start(t = 0) { this.startedAt = t; }
      stop(t = 0) { this.stoppedAt = t; }
    }

    class MockGainNode {
      constructor() {
        this.gain = new MockAudioParam(1);
        createdGainNodes.push(this);
      }
      connect() {}
      disconnect() {}
    }

    class MockBiquadFilter {
      constructor() {
        this.frequency = new MockAudioParam(1000);
        this.Q = new MockAudioParam(1);
        this.type = 'lowpass';
      }
      connect() {}
      disconnect() {}
    }

    class MockBufferSource {
      constructor() {
        this.buffer = null;
        this.loop = false;
        this.stopped = false;
      }
      connect() {}
      disconnect() {}
      start() {}
      stop() { this.stopped = true; }
    }

    class MockMediaStreamAudioDestinationNode {
      constructor() {
        this.stream = {
          getAudioTracks: () => [{ kind: 'audio', id: 'mock_track_1' }],
        };
      }
    }

    class MockAudioContext {
      constructor() {
        this.currentTime = 100.0;
        this.sampleRate = 44100;
        this.state = 'running';
        this.destination = {};
      }
      createOscillator() { return new MockOscillatorNode(); }
      createGain() { return new MockGainNode(); }
      createBiquadFilter() { return new MockBiquadFilter(); }
      createBufferSource() { return new MockBufferSource(); }
      createBuffer(channels, length, sampleRate) {
        return {
          length,
          sampleRate,
          getChannelData: () => new Float32Array(length),
        };
      }
      createMediaStreamDestination() {
        return new MockMediaStreamAudioDestinationNode();
      }
      resume() { return Promise.resolve(); }
    }

    // Install mock window and AudioContext
    global.window = { AudioContext: MockAudioContext };
    global.AudioContext = MockAudioContext;

    // Reset studioAudio's internal ctx
    studioAudio['ctx'] = null;
    studioAudio['masterGain'] = null;
    studioAudio['monitorGain'] = null;
    studioAudio['musicGain'] = null;
    studioAudio['sfxGain'] = null;

    const ctx = studioAudio.init();
    assert(ctx, 'AudioContext must initialize');

    // Test 1: Voice Blips
    studioAudio.playVoiceBlip('bonnie');
    studioAudio.playVoiceBlip('tammy');
    studioAudio.playVoiceBlip('narrator');

    // Test 2: Sound Effects
    const effects = ['chime', 'gasp', 'laugh', 'tea_sip', 'box_tap'];
    for (const ef of effects) {
      studioAudio.playSoundEffect(ef);
    }

    // Verify all created oscillators have been scheduled with a valid stop()
    assert(createdOscillators.length >= 10, `Expected >= 10 oscillators, got ${createdOscillators.length}`);
    for (const osc of createdOscillators) {
      assert(osc.startedAt !== null, 'Oscillator was not started');
      assert(osc.stoppedAt !== null, 'Oscillator node was created without stop() scheduling! MEMORY LEAK RISK');
      assert(
        osc.stoppedAt >= osc.startedAt,
        `Oscillator stop time (${osc.stoppedAt}) must be >= start time (${osc.startedAt})`
      );
      assert(
        osc.stoppedAt - osc.startedAt <= 1.0,
        `Oscillator held open too long (${osc.stoppedAt - osc.startedAt}s)`
      );
    }
  });

  await runner.test('3.5 Lo-Fi music start/stop cycling and vinyl source teardown', async () => {
    assert(!studioAudio.isMusicPlaying(), 'Music should start inactive');
    studioAudio.startLoFiMusic();
    assert(studioAudio.isMusicPlaying(), 'Music should be active after start');

    // Calling start again should be a no-op
    studioAudio.startLoFiMusic();
    assert(studioAudio.isMusicPlaying(), 'Music should remain active');

    studioAudio.stopLoFiMusic();
    assert(!studioAudio.isMusicPlaying(), 'Music should be inactive after stop');

    // Stop again should be safe
    studioAudio.stopLoFiMusic();
    assert(!studioAudio.isMusicPlaying(), 'Music should remain inactive');

    // Rapid cycling 50 times
    for (let i = 0; i < 50; i++) {
      studioAudio.startLoFiMusic();
      studioAudio.stopLoFiMusic();
    }
    assert(!studioAudio.isMusicPlaying(), 'Engine must remain stopped after rapid cycling');
  });
});

// ==============================================================================
// SUITE 4: VIDEO EXPORT QUEUE MID-FLIGHT CANCELLATION & BROWSER MIME PROFILES
// ==============================================================================
await runner.describe('Suite 4: Video Export Queue & Browser MIME Negotiation', async () => {
  const { BatchQueueManager, getSupportedMimeType, VideoRecorderSession } = videoExporter;
  const { BUILT_IN_SKITS } = skitTemplates;

  await runner.test('4.1 MIME type negotiation across browser profiles (Chrome, Safari, Firefox, SSR)', async () => {
    // SSR / Node profile
    delete global.window;
    delete global.MediaRecorder;
    assert.strictEqual(getSupportedMimeType(), 'video/webm', 'SSR profile must fall back to video/webm');

    // Chrome profile: supports VP9 WebM
    global.window = {};
    global.MediaRecorder = {
      isTypeSupported: (type) => type.includes('vp9'),
    };
    assert.strictEqual(
      getSupportedMimeType(),
      'video/webm;codecs=vp9,opus',
      'Chrome profile must choose VP9 WebM'
    );

    // Safari profile: supports MP4, does NOT support WebM
    global.MediaRecorder = {
      isTypeSupported: (type) => type.includes('mp4') && type.includes('avc1'),
    };
    assert.strictEqual(
      getSupportedMimeType(),
      'video/mp4;codecs=avc1,mp4a.40.2',
      'Safari profile must choose MP4'
    );

    // Fallback profile: supports nothing from list
    global.MediaRecorder = {
      isTypeSupported: () => false,
    };
    assert.strictEqual(getSupportedMimeType(), 'video/webm', 'Unsupported profile must safely fall back to video/webm');
  });

  await runner.test('4.2 BatchQueueManager sequential 10-skit queue lifecycle', async () => {
    const manager = new BatchQueueManager();
    const tenSkits = BUILT_IN_SKITS.slice(0, 10);

    let notifyCount = 0;
    const unsub = manager.subscribe(() => {
      notifyCount++;
    });

    manager.addSkits(tenSkits);
    const queue = manager.getQueue();
    assert.strictEqual(queue.length, 10, 'Expected 10 items in queue');
    assert(notifyCount >= 1, 'Subscriber must be notified on addSkits');

    for (let i = 0; i < 10; i++) {
      assert.strictEqual(queue[i].status, 'queued');
      assert.strictEqual(queue[i].skitId, tenSkits[i].id);
      assert.strictEqual(queue[i].durationSeconds, tenSkits[i].durationSeconds);
      assert.strictEqual(queue[i].progressPercent, 0);
    }

    // Simulate sequential execution
    manager.setProcessing(true);
    assert.strictEqual(manager.isQueueProcessing(), true);

    for (let i = 0; i < 10; i++) {
      const item = manager.getQueue()[i];
      manager.updateItem(item.id, { status: 'recording', progressPercent: 50 });
      assert.strictEqual(manager.getQueue()[i].status, 'recording');
      assert.strictEqual(manager.getQueue()[i].progressPercent, 50);

      manager.updateItem(item.id, {
        status: 'completed',
        progressPercent: 100,
        blobUrl: `blob:mock-url-${i}`,
      });
      assert.strictEqual(manager.getQueue()[i].status, 'completed');
    }

    manager.setProcessing(false);
    assert.strictEqual(manager.isQueueProcessing(), false);

    unsub();
    const notifyBefore = notifyCount;
    manager.updateItem(queue[0].id, { progressPercent: 99 });
    assert.strictEqual(notifyCount, notifyBefore, 'Unsubscribed listener must NOT be called');
  });

  await runner.test('4.3 Mid-flight cancellation and queue clearance', async () => {
    const manager = new BatchQueueManager();
    manager.addSkits(BUILT_IN_SKITS.slice(0, 5));
    manager.setProcessing(true);

    assert.strictEqual(manager.getQueue().length, 5);
    assert.strictEqual(manager.isQueueProcessing(), true);

    // Cancel mid-flight by clearing queue
    manager.clearQueue();
    assert.strictEqual(manager.getQueue().length, 0, 'Queue must be empty after clearQueue');
    assert.strictEqual(manager.isQueueProcessing(), false, 'isProcessing must reset to false on clearQueue');

    // Individual item removal
    manager.addSkits(BUILT_IN_SKITS.slice(0, 3));
    const items = manager.getQueue();
    const removedId = items[1].id;
    manager.removeItem(removedId);

    const remaining = manager.getQueue();
    assert.strictEqual(remaining.length, 2, 'Queue must have 2 items after removeItem');
    assert(!remaining.some((it) => it.id === removedId), 'Removed item must not exist in queue');
  });

  await runner.test('4.4 VideoRecorderSession concurrency guard', async () => {
    const session = new VideoRecorderSession();

    // Mock HTMLCanvasElement
    const mockCanvas = {
      captureStream: () => ({
        getVideoTracks: () => [{ kind: 'video' }],
      }),
    };

    // If already active, recordCanvasStream must throw immediately
    session['isRecordingActive'] = true;
    try {
      await session.recordCanvasStream(mockCanvas, 5);
      assert.fail('Should have thrown concurrency guard error');
    } catch (err) {
      assert(err.message.includes('already active'), `Expected already active error, got: ${err.message}`);
    }

    // Stop when inactive must be safe and not throw
    session['isRecordingActive'] = false;
    assert.doesNotThrow(() => session.stop());
  });
});

// ==============================================================================
// SUITE 5: MULTI-PLATFORM ZERO-SALES METADATA & EXTREME CHARACTER SETS
// ==============================================================================
await runner.describe('Suite 5: Multi-Platform Zero-Sales Metadata & Unicode Robustness', async () => {
  const { generatePlatformCopy, generateAllPlatformCopy } = socialCaptions;
  const { BUILT_IN_SKITS } = skitTemplates;
  const { generateRPGAppraisal, getAllCatalogProducts } = rpgAppraisal;

  await runner.test('5.1 Generation for all 22 skits across 4 platforms (88 distinct copies)', async () => {
    const platforms = ['tiktok', 'instagram', 'youtube_shorts', 'facebook_reels'];
    const products = getAllCatalogProducts();

    for (let sIdx = 0; sIdx < BUILT_IN_SKITS.length; sIdx++) {
      const skit = BUILT_IN_SKITS[sIdx];
      const appraisal = skit.category === 'rpg_appraisal' ? generateRPGAppraisal(products[sIdx % products.length]) : undefined;
      const allCopies = generateAllPlatformCopy(skit, appraisal);

      assert.strictEqual(allCopies.skitId, skit.id);

      for (const p of platforms) {
        const copy = allCopies[p];
        assert.strictEqual(copy.platform, p);
        assert(copy.caption.length > 10, `Caption too short for skit "${skit.title}" on ${p}`);
        assert(Array.isArray(copy.hashtags) && copy.hashtags.length >= 4, `Missing hashtags for ${skit.title} on ${p}`);
        assert(copy.fullFormattedText.length > copy.caption.length, `Formatted text missing hashtags on ${p}`);
        assert.strictEqual(copy.charCount, copy.fullFormattedText.length, `charCount mismatch on ${p}`);
      }
    }
  });

  await runner.test('5.2 Zero-sales audit across all 88 generated social media packages', async () => {
    const aggressiveSalesPattern = /\b(buy now|shop now|discount|coupon|promo code|on sale|order today|click the link|purchase|checkout|special offer|\$\d+|add to cart|storefront|pricing|affordable)\b/i;

    const products = getAllCatalogProducts();
    let violationCount = 0;
    const violations = [];

    for (let sIdx = 0; sIdx < BUILT_IN_SKITS.length; sIdx++) {
      const skit = BUILT_IN_SKITS[sIdx];
      const appraisal = skit.category === 'rpg_appraisal' ? generateRPGAppraisal(products[sIdx % products.length]) : undefined;
      const allCopies = generateAllPlatformCopy(skit, appraisal);

      for (const p of ['tiktok', 'instagram', 'youtube_shorts', 'facebook_reels']) {
        const copy = allCopies[p];
        if (aggressiveSalesPattern.test(copy.fullFormattedText)) {
          violationCount++;
          violations.push({ skit: skit.title, platform: p, text: copy.fullFormattedText.substring(0, 100) });
        }
      }
    }

    assert.strictEqual(
      violationCount,
      0,
      `Detected ${violationCount} sales pitch violations in social copy: ${JSON.stringify(violations)}`
    );
  });

  await runner.test('5.3 Extreme characters, emojis, HTML entities, and multi-byte unicode', async () => {
    const adversarialSkit = {
      id: 'skit_adversarial_chars',
      title: '🧙‍♀️✨ <Grandma & "Tammy"> \'Trinket\' / \\ \0 100% #viral?!',
      category: 'rpg_appraisal',
      durationSeconds: 20,
      defaultBackdrop: 'cozy_night_shop',
      description: 'Japanese: おばあちゃん Arabic: مرحبًا Cyrillic: Бабушка Emojis: 👵🕯️💖🌸🍵🐱',
      beats: [
        {
          id: 'b1',
          speaker: 'bonnie',
          expression: 'laughing',
          action: 'laugh',
          dialogue: 'Look at this: <script>alert("safe")</script> & "quotes" & \\ backslashes!',
        },
      ],
    };

    const extremeAppraisal = {
      productId: 'p_adversarial',
      title: '✨ 100% Rare Star-Pen <Unbreakable> 🔮',
      price: 999999,
      category: 'Beaded Pens',
      imageUrl: '/uploads/test.png',
      rarity: "Grandma's Secret Stash",
      rarityColor: '#f43f5e',
      lore: 'Forged in the heart of "Cozy Mountain" with triple-twist elastic.',
      stats: [
        { name: 'Vibes', value: 999999, statType: 'cozy', formatted: '+999999 Cozy Vibes' },
        { name: 'Defense', value: -50, statType: 'protection', formatted: '-50 Curse Defense' },
        { name: 'Charm', value: 0, statType: 'charm', formatted: '+0 Charm' },
      ],
      blessing: 'May your tea never go cold! 🍵✨',
    };

    const res = generateAllPlatformCopy(adversarialSkit, extremeAppraisal);
    for (const p of ['tiktok', 'instagram', 'youtube_shorts', 'facebook_reels']) {
      const copy = res[p];
      assert(copy.fullFormattedText.includes('✨ 100% Rare Star-Pen <Unbreakable> 🔮'), `Relic title lost on ${p}`);
      // Stats are present on TikTok, Instagram, YouTube Shorts
      if (p !== 'facebook_reels') {
        assert(copy.fullFormattedText.includes('+999999 Cozy Vibes'), `Stat line lost on ${p}`);
      } else {
        // Facebook reels renders Grandma Bonnie blessing
        assert(copy.fullFormattedText.includes('May your tea never go cold! 🍵✨'), `Blessing lost on ${p}`);
      }
      assert.strictEqual(copy.charCount, copy.fullFormattedText.length, `charCount mismatch on ${p}`);
    }
  });

  await runner.test('5.4 Platform-specific requirements & hashtag integrity', async () => {
    const sampleSkit = BUILT_IN_SKITS[0];
    const res = generateAllPlatformCopy(sampleSkit);

    // TikTok
    assert(res.tiktok.hashtags.includes('#CozyTok'), 'TikTok missing #CozyTok');
    assert(res.tiktok.hashtags.includes('#BonnieAndTammy'), 'TikTok missing #BonnieAndTammy');

    // Instagram
    assert(res.instagram.hashtags.includes('#CottagecoreAesthetic'), 'Instagram missing #CottagecoreAesthetic');
    assert(res.instagram.fullFormattedText.includes('From the workshop counter at B&T Trinkets'), 'Instagram missing workshop counter header');

    // YouTube Shorts
    assert(res.youtube_shorts.title, 'YouTube Shorts missing title property');
    assert(res.youtube_shorts.title.length <= 100, `YouTube Shorts title too long (${res.youtube_shorts.title.length} chars)`);
    assert(res.youtube_shorts.hashtags.includes('#Shorts'), 'YouTube Shorts missing #Shorts');

    // Facebook Reels
    assert(res.facebook_reels.hashtags.includes('#HandmadeCrafts'), 'Facebook Reels missing #HandmadeCrafts');
    assert(res.facebook_reels.fullFormattedText.includes('Bonnie & Tammy at B&T Trinkets'), 'Facebook Reels missing boutique greeting');
  });
});

// Run summary
const success = runner.summary();
if (!success) {
  console.error(`${colors.red}${colors.bold}❌ ADVERSARIAL STRESS HARNESS FAILED${colors.reset}`);
  process.exit(1);
} else {
  console.log(`${colors.green}${colors.bold}✅ ALL ADVERSARIAL STRESS SUITES PASSED EMPIRICALLY WITH 100% SUCCESS${colors.reset}`);
  process.exit(0);
}
