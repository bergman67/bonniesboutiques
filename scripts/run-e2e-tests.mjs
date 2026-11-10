#!/usr/bin/env node
/**
 * scripts/run-e2e-tests.mjs
 *
 * Master E2E Test Runner for Bonnie's Boutique (B&T Trinkets).
 * Executes the 4-Tier Test Methodology covering Requirements R1 through R4:
 *
 * Tier 1: Core Feature Coverage (>=5 test cases per feature covering R1-R4)
 * Tier 2: Boundary & Corner Cases (empty search, case insensitivity, $0 threshold, exact threshold, fallback hierarchy, invalid PINs)
 * Tier 3: Cross-Feature Combinations (search + category pills, quick-view + free shipping bar, inline price edit + cart sync)
 * Tier 4: Real-World Workload Scenarios (Shopper discovery & checkout flow; Grandma Bonnie morning fulfillment flow)
 *
 * Usage:
 *   node scripts/run-e2e-tests.mjs
 *   node scripts/run-e2e-tests.mjs --tier=1
 *   node scripts/run-e2e-tests.mjs --tier=2
 *   node scripts/run-e2e-tests.mjs --tier=3
 *   node scripts/run-e2e-tests.mjs --tier=4
 *   node scripts/run-e2e-tests.mjs --verbose
 */

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

try {
  register('./scripts/test-loader.mjs', pathToFileURL('./'));
} catch {}

import { TestRunner } from '../tests/e2e/harness/test-utils.mjs';
import { runTier1R1 } from '../tests/e2e/tier1-features/tier1-r1-storefront.mjs';
import { runTier1R2 } from '../tests/e2e/tier1-features/tier1-r2-admin.mjs';
import { runTier1R3 } from '../tests/e2e/tier1-features/tier1-r3-settings-privacy.mjs';
import { runTier1R4 } from '../tests/e2e/tier1-features/tier1-r4-catalog-integrity.mjs';
import { runTier1R5 } from '../tests/e2e/tier1-features/tier1-r5-photo-ai-pipeline.mjs';
import { runTier2Boundary } from '../tests/e2e/tier2-boundary/tier2-boundary-cases.mjs';
import { runTier3Combinations } from '../tests/e2e/tier3-cross-feature/tier3-combinations.mjs';
import { runTier4Workloads } from '../tests/e2e/tier4-workloads/tier4-real-world-scenarios.mjs';

const runner = new TestRunner();

// Parse CLI flags
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

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║       BONNIE\'S BOUTIQUE (B&T TRINKETS) — 4-TIER E2E TEST RUNNER          ║');
console.log('║            Comprehensive Opaque-Box Requirement Verification             ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');
console.log(`Execution Mode: Tier [${selectedTier.toUpperCase()}]`);
console.log(`Started at: ${new Date().toISOString()}\n`);

async function run() {
  const shouldRun = (t) => selectedTier === 'all' || selectedTier === String(t);

  // ────────────────────────────────────────────────────────────────────────────
  // TIER 1: FEATURE COVERAGE (R1 - R4)
  // ────────────────────────────────────────────────────────────────────────────
  if (shouldRun(1)) {
    console.log('══════════════════════════════════════════════════════════════════════════');
    console.log(' TIER 1: FEATURE COVERAGE (R1, R2, R3, R4, R5)');
    console.log('══════════════════════════════════════════════════════════════════════════');
    await runTier1R1(runner);
    await runTier1R2(runner);
    await runTier1R3(runner);
    await runTier1R4(runner);
    await runTier1R5(runner);
    console.log('');
  }

  // ────────────────────────────────────────────────────────────────────────────
  // TIER 2: BOUNDARY & CORNER CASES
  // ────────────────────────────────────────────────────────────────────────────
  if (shouldRun(2)) {
    console.log('══════════════════════════════════════════════════════════════════════════');
    console.log(' TIER 2: BOUNDARY & CORNER CASES');
    console.log('══════════════════════════════════════════════════════════════════════════');
    await runTier2Boundary(runner);
    console.log('');
  }

  // ────────────────────────────────────────────────────────────────────────────
  // TIER 3: CROSS-FEATURE COMBINATIONS
  // ────────────────────────────────────────────────────────────────────────────
  if (shouldRun(3)) {
    console.log('══════════════════════════════════════════════════════════════════════════');
    console.log(' TIER 3: CROSS-FEATURE STATE COMBINATIONS');
    console.log('══════════════════════════════════════════════════════════════════════════');
    await runTier3Combinations(runner);
    console.log('');
  }

  // ────────────────────────────────────────────────────────────────────────────
  // TIER 4: REAL-WORLD WORKLOAD SCENARIOS
  // ────────────────────────────────────────────────────────────────────────────
  if (shouldRun(4)) {
    console.log('══════════════════════════════════════════════════════════════════════════');
    console.log(' TIER 4: REAL-WORLD WORKLOAD SCENARIOS');
    console.log('══════════════════════════════════════════════════════════════════════════');
    await runTier4Workloads(runner);
    console.log('');
  }

  const success = runner.printSummary();

  if (!success) {
    console.error('❌ E2E TEST SUITE EXECUTION FAILED');
    process.exit(1);
  } else {
    console.log('✅ ALL E2E TEST TIERS PASSED WITH 100% SUCCESS RATE');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal Test Runner Exception:', err);
  process.exit(1);
});
