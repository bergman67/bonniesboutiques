/**
 * scripts/challenger-m1-deep-audit.ts
 *
 * Deep Empirical Audit of Scenario Pools, Collision Rates, and Trigram Overlap
 * Across Multiple 30-Episode Runs.
 */

import fs from 'fs';
import path from 'path';
import {
  generateCommentaryEpisode,
  validateCandidateScript,
  loadLedger,
  resetLedger,
  extractTrigrams,
  calculateTrigramOverlap,
  ALL_SHOW_FORMATS,
  ShowFormatId,
} from '../src/lib/studio/commentary';

async function runDeepAudit() {
  console.log('=== CHALLENGER DEEP SCENARIO & COLLISION AUDIT ===\n');

  const ledgerPath = path.join(process.cwd(), 'public', 'exports', 'anti-repetition-ledger.json');

  // Multi-run empirical evaluation: 5 independent runs of 30 episodes
  const totalRuns = 5;
  const runResults: Array<{
    run: number;
    maxRollingOverlap: number;
    violatingPairsCount: number;
    violations: Array<{ ep1: number; ep2: number; format: string; overlap: number; common: string[] }>;
  }> = [];

  for (let r = 1; r <= totalRuns; r++) {
    resetLedger(ledgerPath);
    const episodes: any[] = [];

    for (let i = 0; i < 30; i++) {
      const res = await generateCommentaryEpisode({ forceProcedural: true });
      const fullText = res.skit.beats.map((b) => b.dialogue).join(' ');
      const trigrams = extractTrigrams(fullText);
      episodes.push({
        index: i + 1,
        format: res.format,
        title: res.skit.title,
        beats: res.skit.beats,
        fullText,
        trigrams,
        trigramSet: new Set(trigrams),
        reportedMaxOverlap: res.trigramOverlapMax,
      });
    }

    // Check rolling 12-episode windows
    let maxRolling = 0;
    const runViolations: any[] = [];

    for (let w = 0; w <= 30 - 12; w++) {
      const windowEpisodes = episodes.slice(w, w + 12);
      for (let i = 0; i < 12; i++) {
        for (let j = i + 1; j < 12; j++) {
          const epA = windowEpisodes[i];
          const epB = windowEpisodes[j];
          const { overlapRatio: rAB, commonTrigrams: cAB } = calculateTrigramOverlap(epA.trigramSet, epB.trigramSet);
          const { overlapRatio: rBA, commonTrigrams: cBA } = calculateTrigramOverlap(epB.trigramSet, epA.trigramSet);
          const maxD = Math.max(rAB, rBA);
          const common = rAB >= rBA ? cAB : cBA;

          if (maxD > maxRolling) {
            maxRolling = maxD;
          }

          if (maxD >= 0.15) {
            // Check if already recorded
            const exists = runViolations.some((v) => v.ep1 === epA.index && v.ep2 === epB.index);
            if (!exists) {
              runViolations.push({
                ep1: epA.index,
                ep2: epB.index,
                format: epA.format,
                overlap: maxD,
                common,
              });
            }
          }
        }
      }
    }

    runResults.push({
      run: r,
      maxRollingOverlap: maxRolling,
      violatingPairsCount: runViolations.length,
      violations: runViolations,
    });

    console.log(`Run ${r}/5: Max rolling overlap = ${(maxRolling * 100).toFixed(2)}%, Violations >= 15%: ${runViolations.length}`);
    for (const v of runViolations) {
      console.log(`  -> Violation between Ep ${v.ep1} and Ep ${v.ep2} [${v.format}]: ${(v.overlap * 100).toFixed(2)}%`);
      console.log(`     Common: ${v.common.slice(0, 3).join(' | ')}`);
    }
  }

  console.log('\n=== MULTI-RUN SUMMARY ===');
  let runsWithViolations = 0;
  for (const res of runResults) {
    if (res.violatingPairsCount > 0) runsWithViolations++;
  }
  console.log(`Runs with >=15% trigram overlap violations: ${runsWithViolations} / ${totalRuns} (${(runsWithViolations / totalRuns * 100).toFixed(0)}%)`);

  // Analyze proceduralGenerator scenario pools
  console.log('\n=== PROCEDURAL SCENARIO POOL INVENTORY ===');
  const code = fs.readFileSync(path.join(process.cwd(), 'src/lib/studio/commentary/proceduralGenerator.ts'), 'utf-8');

  const scenarioArrays = [
    { name: 'WILDLIFE_SCENARIOS', format: 'wild_nature_commentary' },
    { name: 'HOT_TAKE_SCENARIOS', format: 'chaotic_grandma_hot_takes' },
    { name: 'LORE_SCENARIOS', format: 'cozy_boutique_lore' },
    { name: 'RELIC_SCENARIOS', format: 'vintage_relic_debates' },
    { name: 'CULTURE_CLASH_SCENARIOS', format: 'gen_z_culture_clash' },
    { name: 'CRAFT_SCENARIOS', format: 'craft_breakdown_asmr' },
  ];

  for (const s of scenarioArrays) {
    const regex = new RegExp(`const\\s+${s.name}\\s*:[^=]+=\\s*\\[([\\s\\S]*?)\\];\\s*\\/\\/`);
    const match = code.match(regex);
    if (match) {
      // count elements
      const count = (match[1].match(/\{\s*(scene|topic|legend|testType):/g) || []).length;
      console.log(`  Format: ${s.format.padEnd(28)} | Pool: ${s.name.padEnd(24)} | Scenarios: ${count}`);
    } else {
      console.log(`  Format: ${s.format.padEnd(28)} | Pool: ${s.name.padEnd(24)} | Scenarios: could not parse`);
    }
  }
}

runDeepAudit().catch(console.error);
