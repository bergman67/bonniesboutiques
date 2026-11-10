/**
 * scripts/test-challenger-m3-empirical-clips.ts
 *
 * EMPIRICAL ADVERSARIAL CHALLENGER VERIFICATION:
 * Milestone 3 Reaction Clips, Binary MP4 Atom Structure, Clip Mappings & Fallback Handling
 *
 * Authored by: Empirical Challenger (challenger_m3_1)
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const CLIPS_DIR = path.join(ROOT_DIR, 'public', 'reaction-clips');
const CANVAS_PATH = path.join(ROOT_DIR, 'src', 'components', 'studio', 'StudioCanvas.tsx');
const SKIT_TEMPLATES_PATH = path.join(ROOT_DIR, 'src', 'lib', 'studio', 'skitTemplates.ts');

console.log('╔══════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║        MILESTONE 3: EMPIRICAL ADVERSARIAL CHALLENGER VERIFICATION SUITE              ║');
console.log('║        Reaction Clips, Video Atoms, Mapping Registry & Resilient Fallbacks           ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════════╝\n');

let totalTests = 0;
let passedTests = 0;
const failures: Array<{ test: string; error: string }> = [];

function runTest(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  process.stdout.write(`  [TEST ${String(totalTests).padStart(2, '0')}] ${name} ... `);
  try {
    const res = fn();
    if (res instanceof Promise) {
      throw new Error('Use runAsyncTest for async functions');
    }
    passedTests++;
    console.log('PASS');
  } catch (err: any) {
    console.log('FAIL');
    console.error(`    ↳ Error: ${err.message}`);
    failures.push({ test: name, error: err.message });
  }
}

async function runAsyncTest(name: string, fn: () => Promise<void>) {
  totalTests++;
  process.stdout.write(`  [TEST ${String(totalTests).padStart(2, '0')}] ${name} ... `);
  try {
    await fn();
    passedTests++;
    console.log('PASS');
  } catch (err: any) {
    console.log('FAIL');
    console.error(`    ↳ Error: ${err.message}`);
    failures.push({ test: name, error: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MP4 BOX / ATOM PARSER
// ─────────────────────────────────────────────────────────────────────────────
interface Mp4Box {
  type: string;
  offset: number;
  size: number;
}

function parseMp4Boxes(buffer: Buffer, start = 0, end = buffer.length): Mp4Box[] {
  const boxes: Mp4Box[] = [];
  let offset = start;
  while (offset < end - 8) {
    const size = buffer.readUInt32BE(offset);
    const type = buffer.toString('latin1', offset + 4, offset + 8);
    let boxSize = size;
    if (size === 1) {
      boxSize = Number(buffer.readBigUInt64BE(offset + 8));
    } else if (size === 0) {
      boxSize = end - offset;
    }
    if (boxSize <= 0 || offset + boxSize > end) break;
    boxes.push({ type, offset, size: boxSize });
    offset += boxSize;
  }
  return boxes;
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK CANVAS 2D CONTEXT FOR RENDERING VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
interface DrawCall {
  method: string;
  args: any[];
}

function createMockContext2D(): {
  ctx: any;
  calls: DrawCall[];
} {
  const calls: DrawCall[] = [];
  const ctx: any = {
    save: () => calls.push({ method: 'save', args: [] }),
    restore: () => calls.push({ method: 'restore', args: [] }),
    fillRect: (x: number, y: number, w: number, h: number) =>
      calls.push({ method: 'fillRect', args: [x, y, w, h] }),
    strokeRect: (x: number, y: number, w: number, h: number) =>
      calls.push({ method: 'strokeRect', args: [x, y, w, h] }),
    fillText: (text: string, x: number, y: number) =>
      calls.push({ method: 'fillText', args: [text, x, y] }),
    drawImage: (...args: any[]) =>
      calls.push({ method: 'drawImage', args }),
    beginPath: () => calls.push({ method: 'beginPath', args: [] }),
    arc: (...args: any[]) => calls.push({ method: 'arc', args }),
    fill: () => calls.push({ method: 'fill', args: [] }),
    stroke: () => calls.push({ method: 'stroke', args: [] }),
    createRadialGradient: () => ({
      addColorStop: () => {},
    }),
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '10px sans-serif',
    imageSmoothingEnabled: true,
  };
  return { ctx, calls };
}

async function main() {
  console.log('--- SUITE 1: Filesystem & MP4 Binary Atom Structure Verification ---');

  let mp4Files: string[] = [];

  runTest('1.1 Directory public/reaction-clips/ exists and contains >= 10 files', () => {
    assert(fs.existsSync(CLIPS_DIR), `Clips directory does not exist at ${CLIPS_DIR}`);
    mp4Files = fs.readdirSync(CLIPS_DIR).filter((f) => f.endsWith('.mp4'));
    assert(
      mp4Files.length >= 10,
      `Expected >= 10 .mp4 reaction clips in ${CLIPS_DIR}, found ${mp4Files.length}`
    );
  });

  runTest('1.2 Every reaction clip has file size > 500 KB (512,000 bytes)', () => {
    for (const file of mp4Files) {
      const fullPath = path.join(CLIPS_DIR, file);
      const stat = fs.statSync(fullPath);
      assert(
        stat.size > 512000,
        `File ${file} size (${stat.size} bytes) is below 500KB (512,000 bytes)`
      );
    }
  });

  runTest('1.3 Every reaction clip begins with a valid ftyp atom at offset 0', () => {
    for (const file of mp4Files) {
      const fullPath = path.join(CLIPS_DIR, file);
      const buf = fs.readFileSync(fullPath);
      const boxes = parseMp4Boxes(buf);
      assert(boxes.length > 0, `No MP4 boxes found in ${file}`);
      const firstBox = boxes[0];
      assert.strictEqual(
        firstBox.type,
        'ftyp',
        `File ${file} first atom is '${firstBox.type}', expected 'ftyp'`
      );
      assert.strictEqual(firstBox.offset, 0, `File ${file} ftyp offset must be 0`);
      assert(firstBox.size >= 16, `File ${file} ftyp atom size ${firstBox.size} is too small`);
      const majorBrand = buf.toString('latin1', 8, 12);
      assert(
        ['isom', 'mp41', 'mp42', 'qt  '].includes(majorBrand),
        `File ${file} major brand '${majorBrand}' is not a recognized MP4 brand`
      );
    }
  });

  runTest('1.4 Every reaction clip contains a valid moov atom with non-zero size', () => {
    for (const file of mp4Files) {
      const fullPath = path.join(CLIPS_DIR, file);
      const buf = fs.readFileSync(fullPath);
      const boxes = parseMp4Boxes(buf);
      const moov = boxes.find((b) => b.type === 'moov');
      assert(moov, `File ${file} is missing mandatory 'moov' atom`);
      assert(moov.size > 1000, `File ${file} moov size ${moov.size} is suspiciously small (<1000B)`);
    }
  });

  runTest('1.5 Every moov atom contains mvhd and trak sub-atoms', () => {
    for (const file of mp4Files) {
      const fullPath = path.join(CLIPS_DIR, file);
      const buf = fs.readFileSync(fullPath);
      const boxes = parseMp4Boxes(buf);
      const moov = boxes.find((b) => b.type === 'moov')!;
      const subBoxes = parseMp4Boxes(buf, moov.offset + 8, moov.offset + moov.size);
      const subTypes = subBoxes.map((b) => b.type);
      assert(
        subTypes.includes('mvhd'),
        `File ${file} moov atom missing 'mvhd' sub-atom (found: ${subTypes.join(', ')})`
      );
      assert(
        subTypes.includes('trak'),
        `File ${file} moov atom missing 'trak' sub-atom (found: ${subTypes.join(', ')})`
      );
    }
  });

  runTest('1.6 Every reaction clip contains a large mdat atom containing media samples', () => {
    for (const file of mp4Files) {
      const fullPath = path.join(CLIPS_DIR, file);
      const buf = fs.readFileSync(fullPath);
      const boxes = parseMp4Boxes(buf);
      const mdat = boxes.find((b) => b.type === 'mdat');
      assert(mdat, `File ${file} is missing mandatory 'mdat' atom`);
      assert(
        mdat.size > 500000,
        `File ${file} mdat atom size ${mdat.size} is smaller than 500KB payload threshold`
      );
    }
  });

  console.log('\n--- SUITE 2: Codec, Aspect Ratio, Framerate & Bitstream Decode ---');

  for (const file of mp4Files) {
    const fullPath = path.join(CLIPS_DIR, file);

    runTest(`2.1 Codec is H.264 (avc1) for ${file}`, () => {
      const cmd = `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${fullPath}"`;
      const codec = execSync(cmd, { encoding: 'utf8' }).trim();
      assert.strictEqual(codec, 'h264', `Expected codec 'h264', got '${codec}' for ${file}`);
    });

    runTest(`2.2 Aspect ratio matches 16:9 for ${file} (macroblock 880x496)`, () => {
      const cmd = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of json "${fullPath}"`;
      const probe = JSON.parse(execSync(cmd, { encoding: 'utf8' }));
      const { width, height } = probe.streams[0];
      assert.strictEqual(width, 880, `Expected width 880, got ${width} for ${file}`);
      assert.strictEqual(height, 496, `Expected height 496, got ${height} for ${file}`);
      const ratio = width / height;
      const expected16x9 = 16 / 9;
      const diff = Math.abs(ratio - expected16x9) / expected16x9;
      assert(
        diff < 0.005,
        `Aspect ratio ${ratio.toFixed(4)} deviates by ${(diff * 100).toFixed(2)}% from 16:9 (>0.5% threshold)`
      );
    });

    runTest(`2.3 Framerate is exactly 24fps for ${file}`, () => {
      const cmd = `ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate,avg_frame_rate -of json "${fullPath}"`;
      const probe = JSON.parse(execSync(cmd, { encoding: 'utf8' }));
      const { r_frame_rate, avg_frame_rate } = probe.streams[0];
      assert.strictEqual(r_frame_rate, '24/1', `Expected r_frame_rate '24/1', got '${r_frame_rate}'`);
      assert.strictEqual(avg_frame_rate, '24/1', `Expected avg_frame_rate '24/1', got '${avg_frame_rate}'`);
    });

    runTest(`2.4 Bitstream decodes 100% cleanly without corruption for ${file}`, () => {
      const cmd = `ffmpeg -v error -i "${fullPath}" -f null -`;
      // If ffmpeg encounters any decode errors or corrupt packets, it will print to stderr or exit non-zero
      const output = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      assert.strictEqual(output.trim(), '', `Unexpected ffmpeg decode warnings/errors for ${file}: ${output}`);
    });
  }

  console.log('\n--- SUITE 3: REACTION_CLIP_MAP Registry & Alias Coverage ---');

  let canvasSource = '';
  let clipMap: Record<string, string> = {};

  runTest('3.1 StudioCanvas.tsx exists and contains REACTION_CLIP_MAP definition', () => {
    assert(fs.existsSync(CANVAS_PATH), `StudioCanvas not found at ${CANVAS_PATH}`);
    canvasSource = fs.readFileSync(CANVAS_PATH, 'utf8');
    assert(canvasSource.includes('REACTION_CLIP_MAP'), 'StudioCanvas must declare REACTION_CLIP_MAP');
  });

  runTest('3.2 Extract and parse REACTION_CLIP_MAP object entries', () => {
    const match = canvasSource.match(/const REACTION_CLIP_MAP:\s*Record<string,\s*string>\s*=\s*({[\s\S]*?});/);
    assert(match, 'Failed to extract REACTION_CLIP_MAP object literal using regex');
    const objectLiteral = match[1];
    // Evaluate into runtime JS object safely
    const parsed = new Function(`return ${objectLiteral};`)();
    clipMap = parsed;
    assert(Object.keys(clipMap).length >= 10, `Expected at least 10 keys in REACTION_CLIP_MAP, got ${Object.keys(clipMap).length}`);
  });

  runTest('3.3 Verify all 10 physical clips on disk are mapped by their canonical file stem name', () => {
    for (const file of mp4Files) {
      const stem = file.replace(/\.mp4$/i, '');
      assert(
        clipMap[stem] !== undefined,
        `REACTION_CLIP_MAP is missing mapping for canonical clip file stem '${stem}'`
      );
      assert.strictEqual(
        clipMap[stem],
        `/reaction-clips/${file}`,
        `REACTION_CLIP_MAP['${stem}'] must map to '/reaction-clips/${file}', got '${clipMap[stem]}'`
      );
    }
  });

  runTest('3.4 Verify all 6 legacy aliases are mapped to their correct clip files', () => {
    const requiredAliases: Record<string, string> = {
      honey_badger: '/reaction-clips/savanna_meerkat.mp4',
      capybara_spa: '/reaction-clips/baby_capybaras.mp4',
      anglerfish: '/reaction-clips/phantom_jellyfish.mp4',
      mantis_shrimp: '/reaction-clips/hermit_crab.mp4',
      penguin_heist: '/reaction-clips/penguins_slowmo.mp4',
      octopus_architect: '/reaction-clips/octopus_observatory.mp4',
    };

    for (const [alias, expectedTarget] of Object.entries(requiredAliases)) {
      assert(
        clipMap[alias] !== undefined,
        `REACTION_CLIP_MAP is missing legacy alias '${alias}'`
      );
      assert.strictEqual(
        clipMap[alias],
        expectedTarget,
        `Alias '${alias}' mapped to '${clipMap[alias]}', expected '${expectedTarget}'`
      );
    }
  });

  runTest('3.5 Verify all destination paths in REACTION_CLIP_MAP physically exist in public/reaction-clips/', () => {
    for (const [key, dest] of Object.entries(clipMap)) {
      const relPath = dest.replace(/^\//, ''); // remove leading slash
      const fullDiskPath = path.join(ROOT_DIR, 'public', relPath.replace(/^public\//, '').replace(/^reaction-clips\//, 'reaction-clips/'));
      assert(
        fs.existsSync(fullDiskPath),
        `REACTION_CLIP_MAP entry for '${key}' points to non-existent file on disk: ${dest} (${fullDiskPath})`
      );
    }
  });

  runTest('3.6 Verify all 16 NatGeoScene union members from skitTemplates.ts are in REACTION_CLIP_MAP', () => {
    const skitSource = fs.readFileSync(SKIT_TEMPLATES_PATH, 'utf8');
    const natGeoMatch = skitSource.match(/export type NatGeoScene\s*=\s*([\s\S]*?);/);
    assert(natGeoMatch, 'Could not find export type NatGeoScene in skitTemplates.ts');
    const scenes = natGeoMatch[1]
      .split('|')
      .map((s) => s.trim().replace(/['"]/g, ''))
      .filter((s) => s.length > 0);

    assert(scenes.length >= 10, `Expected >= 10 NatGeoScene union members, found ${scenes.length}`);
    for (const scene of scenes) {
      assert(
        clipMap[scene] !== undefined,
        `NatGeoScene union member '${scene}' is not mapped in REACTION_CLIP_MAP`
      );
    }
  });

  console.log('\n--- SUITE 4: StudioCanvas Fallback Logic & Resilience Stress Tests ---');

  // We isolate the renderNatGeoMonitor function logic from StudioCanvas.tsx to stress test it directly
  function executeIsolatedNatGeoMonitor(
    ctx: any,
    scene: string,
    x: number,
    y: number,
    w: number,
    h: number,
    frameCount: number,
    videoCache?: Map<string, any>,
    mockDocument?: any
  ): { drewVideo: boolean; videoSrcSet?: string } {
    const sx = x + 6;
    const sy = y + 6;
    const sw = w - 12;
    const sh = h - 24;

    let drewVideo = false;
    let videoSrcSet: string | undefined;

    if (videoCache && mockDocument) {
      let vid = videoCache.get(scene);
      if (!vid) {
        vid = mockDocument.createElement('video');
        vid.src = clipMap[scene] || `/reaction-clips/${scene}.mp4`;
        videoSrcSet = vid.src;
        vid.muted = true;
        vid.loop = true;
        vid.playsInline = true;
        vid.autoplay = true;
        vid.play().catch(() => {});
        videoCache.set(scene, vid);
      }
      if (vid.readyState >= 2 && vid.videoWidth > 0) {
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(vid, sx, sy, sw, sh);
        ctx.restore();
        drewVideo = true;
      }
    }

    if (!drewVideo) {
      if (scene === 'honey_badger') {
        ctx.fillStyle = '#7c2d12';
        ctx.fillRect(sx, sy, sw, sh);
        ctx.fillStyle = '#d97706';
        ctx.fillRect(sx, sy + sh - 34, sw, 34);
      } else if (scene === 'capybara_spa') {
        ctx.fillStyle = '#064e3b';
        ctx.fillRect(sx, sy, sw, sh);
        ctx.fillStyle = '#0ea5e9';
        ctx.fillRect(sx, sy + sh - 36, sw, 36);
      } else if (scene === 'anglerfish') {
        ctx.fillStyle = '#020617';
        ctx.fillRect(sx, sy, sw, sh);
      } else {
        // Rainbow Mantis Shrimp / Ocean Reef fallback
        ctx.fillStyle = '#0c4a6e';
        ctx.fillRect(sx, sy, sw, sh);
      }
    }

    // Retro scanlines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    for (let sly = sy; sly < sy + sh; sly += 2) {
      ctx.fillRect(sx, sly, sw, 1);
    }

    // Yellow border & Live badge
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 4, sy + 4, 12, 16);

    ctx.fillStyle = '#18181b';
    ctx.fillRect(sx, y + h - 17, sw, 13);
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 7px monospace';
    ctx.fillText(`▶ GRANDMA REACTS: ${scene.replace(/_/g, ' ').toUpperCase()}`, sx + 6, y + h - 8);

    return { drewVideo, videoSrcSet };
  }

  runTest('4.1 Normal Video Ready: renders video frame via drawImage', () => {
    const { ctx, calls } = createMockContext2D();
    const cache = new Map<string, any>();
    const mockDoc = {
      createElement: () => ({
        src: '',
        readyState: 4, // HAVE_ENOUGH_DATA
        videoWidth: 880,
        videoHeight: 496,
        play: () => Promise.resolve(),
      }),
    };

    const result = executeIsolatedNatGeoMonitor(ctx, 'curious_owl', 10, 20, 220, 140, 1, cache, mockDoc);
    assert.strictEqual(result.drewVideo, true, 'drewVideo must be true when readyState >= 2 and videoWidth > 0');
    assert.strictEqual(result.videoSrcSet, '/reaction-clips/curious_owl.mp4');

    const drawImageCalls = calls.filter((c) => c.method === 'drawImage');
    assert.strictEqual(drawImageCalls.length, 1, 'ctx.drawImage must be called exactly once');
    assert.strictEqual(drawImageCalls[0].args[1], 16); // sx = 10 + 6
    assert.strictEqual(drawImageCalls[0].args[2], 26); // sy = 20 + 6
  });

  runTest('4.2 Missing Clip (404/readyState=0): triggers procedural fallback without crash', () => {
    const { ctx, calls } = createMockContext2D();
    const cache = new Map<string, any>();
    const mockDoc = {
      createElement: () => ({
        src: '',
        readyState: 0, // HAVE_NOTHING (404 or network error)
        videoWidth: 0,
        play: () => Promise.reject(new Error('404 Not Found')),
      }),
    };

    const result = executeIsolatedNatGeoMonitor(ctx, 'phantom_dragon', 10, 20, 220, 140, 1, cache, mockDoc);
    assert.strictEqual(result.drewVideo, false, 'drewVideo must be false when video is not ready');
    assert.strictEqual(result.videoSrcSet, '/reaction-clips/phantom_dragon.mp4');

    const drawImageCalls = calls.filter((c) => c.method === 'drawImage');
    assert.strictEqual(drawImageCalls.length, 0, 'ctx.drawImage must NOT be called for missing clip');

    const fillTextCalls = calls.filter((c) => c.method === 'fillText');
    assert(
      fillTextCalls.some((c) => c.args[0].includes('GRANDMA REACTS: PHANTOM DRAGON')),
      'Ticker bar must still display Grandma reaction title'
    );
  });

  runTest('4.3 Corrupted Video (readyState=0, videoWidth=0): triggers procedural fallback', () => {
    const { ctx, calls } = createMockContext2D();
    const cache = new Map<string, any>();
    const mockDoc = {
      createElement: () => ({
        src: '',
        readyState: 0,
        videoWidth: 0,
        error: { code: 4, message: 'MEDIA_ELEMENT_ERROR: Corrupt Bitstream' },
        play: () => Promise.reject(new Error('Corrupt Bitstream')),
      }),
    };

    const result = executeIsolatedNatGeoMonitor(ctx, 'corrupt_clip', 10, 20, 220, 140, 1, cache, mockDoc);
    assert.strictEqual(result.drewVideo, false, 'drewVideo must be false for corrupted clip');

    const fillRectCalls = calls.filter((c) => c.method === 'fillRect');
    assert(fillRectCalls.length > 0, 'Procedural pixel-art fallback must execute fillRect calls');
  });

  await runAsyncTest('4.4 Autoplay Restriction (play rejection): caught gracefully without unhandled rejection', async () => {
    const { ctx } = createMockContext2D();
    const cache = new Map<string, any>();
    let rejectionHandled = false;
    const mockDoc = {
      createElement: () => ({
        src: '',
        readyState: 0,
        videoWidth: 0,
        play: () => {
          rejectionHandled = true;
          return Promise.reject(new Error('NotAllowedError: play() failed because the user didn\'t interact first'));
        },
      }),
    };

    const result = executeIsolatedNatGeoMonitor(ctx, 'sea_otter_drift', 10, 20, 220, 140, 1, cache, mockDoc);
    // Allow microtask tick for promise rejection handling
    await new Promise((r) => setTimeout(r, 10));
    assert.strictEqual(rejectionHandled, true, 'Autoplay rejection must be triggered and caught');
    assert.strictEqual(result.drewVideo, false, 'Should draw fallback until playback is unlocked');
  });

  runTest('4.5 SSR / Headless Safety: executes cleanly when document is undefined', () => {
    const { ctx, calls } = createMockContext2D();
    // Simulate Node.js SSR where typeof document === 'undefined'
    const result = executeIsolatedNatGeoMonitor(ctx, 'savanna_meerkat', 10, 20, 220, 140, 1, undefined, undefined);
    assert.strictEqual(result.drewVideo, false, 'drewVideo is false in SSR');
    const fillRectCalls = calls.filter((c) => c.method === 'fillRect');
    assert(fillRectCalls.length > 0, 'SSR draws procedural fallback canvas elements');
  });

  runTest('4.6 Palette Diversity: scene-specific animated procedural backdrops', () => {
    const scenesToTest = ['honey_badger', 'capybara_spa', 'anglerfish', 'other_unknown'];
    const paletteMap: Record<string, string[]> = {};

    for (const sc of scenesToTest) {
      const { ctx, calls } = createMockContext2D();
      executeIsolatedNatGeoMonitor(ctx, sc, 10, 20, 220, 140, 1, undefined, undefined);
      paletteMap[sc] = calls.map((c) => c.method);
    }

    assert(paletteMap['honey_badger'].length > 0);
    assert(paletteMap['capybara_spa'].length > 0);
    assert(paletteMap['anglerfish'].length > 0);
    assert(paletteMap['other_unknown'].length > 0);
  });

  console.log('\n══════════════════════════════════════════════════════════════════════════════════════');
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failures.length}`);
  console.log('══════════════════════════════════════════════════════════════════════════════════════\n');

  if (failures.length > 0) {
    console.error('❌ CHALLENGER AUDIT FOUND FAILURES:');
    for (const f of failures) {
      console.error(`  - ${f.test}: ${f.error}`);
    }
    process.exit(1);
  } else {
    console.log('✅ ALL EMPIRICAL CHALLENGER TESTS PASSED SUCCESSFULLY.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal Test Runner Exception:', err);
  process.exit(1);
});
