/**
 * scripts/challenge-m4-production-mp4.mjs
 *
 * Empirical Challenger Verification Harness for M4 Production MP4 Video
 * Adversarially tests video parameters, audio specs, container faststart,
 * frame-by-frame luma distribution, audio dynamics, publisher dry-run, and studio verification.
 */

import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT_DIR = process.cwd();
const PRIMARY_PATH = path.join(ROOT_DIR, 'public', 'exports', 'videos', 'skit_proc_gen_z_culture_clash_1793084802191_9963-9x16.mp4');
const MIRROR_PATH = path.join(ROOT_DIR, 'public', 'exports', 'skit_proc_gen_z_culture_clash_1793084802191_9963-9x16.mp4');

let totalChecks = 0;
let passedChecks = 0;
const failures = [];

function assertCheck(name, condition, details = '') {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  [PASS] ${name}${details ? ` -> ${details}` : ''}`);
  } else {
    failures.push({ name, details });
    console.error(`  [FAIL] ${name}${details ? ` -> ${details}` : ''}`);
  }
}

console.log('================================================================');
console.log('   M4 PRODUCTION MP4 EMPIRICAL ADVERSARIAL CHALLENGER SUITE     ');
console.log('================================================================\n');

// 1. File existence & mirroring check
console.log('--- 1. File Integrity & Mirror Parity ---');
const primaryExists = fs.existsSync(PRIMARY_PATH);
const mirrorExists = fs.existsSync(MIRROR_PATH);
assertCheck('Primary MP4 exists in public/exports/videos/', primaryExists, PRIMARY_PATH);
assertCheck('Mirror MP4 exists in public/exports/', mirrorExists, MIRROR_PATH);

if (!primaryExists || !mirrorExists) {
  console.error('FATAL: Target MP4 file missing. Aborting further checks.');
  process.exit(1);
}

const primaryStats = fs.statSync(PRIMARY_PATH);
const mirrorStats = fs.statSync(MIRROR_PATH);
assertCheck('Primary file size > 3 MB', primaryStats.size > 3 * 1024 * 1024, `${(primaryStats.size / 1024 / 1024).toFixed(2)} MB`);
assertCheck('Mirror file size matches primary exactly', primaryStats.size === mirrorStats.size, `${mirrorStats.size} bytes`);

const primaryHash = crypto.createHash('sha256').update(fs.readFileSync(PRIMARY_PATH)).digest('hex');
const mirrorHash = crypto.createHash('sha256').update(fs.readFileSync(MIRROR_PATH)).digest('hex');
assertCheck('SHA-256 byte-for-byte mirror equality', primaryHash === mirrorHash, primaryHash);

// 2. FFprobe Deep Inspection
console.log('\n--- 2. Stream & Container Inspection (FFprobe) ---');
const probeRaw = execSync(
  `ffprobe -v error -show_format -show_streams -print_format json "${PRIMARY_PATH}"`,
  { encoding: 'utf8' }
);
const probeData = JSON.parse(probeRaw);

const videoStream = probeData.streams.find(s => s.codec_type === 'video');
const audioStream = probeData.streams.find(s => s.codec_type === 'audio');
const format = probeData.format;

assertCheck('Video stream present', !!videoStream);
assertCheck('Audio stream present', !!audioStream);

if (videoStream) {
  assertCheck('Video codec is h264', videoStream.codec_name === 'h264', videoStream.codec_name);
  assertCheck('Video profile is High', videoStream.profile === 'High', videoStream.profile);
  assertCheck('Video width is 1080', videoStream.width === 1080, `${videoStream.width}px`);
  assertCheck('Video height is 1920', videoStream.height === 1920, `${videoStream.height}px`);
  assertCheck('Framerate r_frame_rate is 30/1', videoStream.r_frame_rate === '30/1', videoStream.r_frame_rate);
  assertCheck('Framerate avg_frame_rate is 30/1', videoStream.avg_frame_rate === '30/1', videoStream.avg_frame_rate);
  assertCheck('Pixel format is yuv420p', videoStream.pix_fmt === 'yuv420p', videoStream.pix_fmt);
  assertCheck('Progressive scan field order', videoStream.field_order === 'progressive', videoStream.field_order);
  const vDuration = parseFloat(videoStream.duration || '0');
  assertCheck('Video duration within 22.0s - 30.0s', vDuration >= 22.0 && vDuration <= 30.0, `${vDuration}s`);
}

if (audioStream) {
  assertCheck('Audio codec is aac', audioStream.codec_name === 'aac', audioStream.codec_name);
  assertCheck('Audio channels == 2 (stereo)', audioStream.channels === 2, `${audioStream.channels} channels`);
  assertCheck('Audio sample rate is 44100 Hz', audioStream.sample_rate === '44100' || audioStream.sample_rate === 44100, `${audioStream.sample_rate} Hz`);
  const aDuration = parseFloat(audioStream.duration || '0');
  assertCheck('Audio duration within 22.0s - 30.0s', aDuration >= 22.0 && aDuration <= 30.0, `${aDuration}s`);
  if (videoStream) {
    const vDuration = parseFloat(videoStream.duration || '0');
    const syncDiff = Math.abs(vDuration - aDuration);
    assertCheck('Audio/video duration sync difference < 0.1s', syncDiff < 0.1, `${syncDiff.toFixed(4)}s`);
  }
}

if (format) {
  const containerDuration = parseFloat(format.duration || '0');
  const bitrateKbps = Math.round(parseInt(format.bit_rate || '0', 10) / 1000);
  assertCheck('Container duration within 22.0s - 30.0s', containerDuration >= 22.0 && containerDuration <= 30.0, `${containerDuration}s`);
  assertCheck('Container bitrate > 1500 kbps (1.5 Mbps)', bitrateKbps > 1500, `${bitrateKbps} kbps (${(bitrateKbps / 1000).toFixed(2)} Mbps)`);
}

// 3. Decoding Integrity (Zero Corruption / Missing Packets)
console.log('\n--- 3. Decoding Integrity (Full FFmpeg Null Decode) ---');
const decodeResult = spawnSync('ffmpeg', ['-v', 'error', '-i', PRIMARY_PATH, '-f', 'null', '-'], { encoding: 'utf8' });
assertCheck('FFmpeg null-decode exits with code 0', decodeResult.status === 0, `exit code: ${decodeResult.status}`);
assertCheck('FFmpeg null-decode stderr has zero decode errors', decodeResult.stderr.trim().length === 0, decodeResult.stderr.trim() || 'clean');

// 4. Luma & Visual Content Analysis (Frame-by-Frame Signalstats)
console.log('\n--- 4. Visual Content & Luma (YAVG) Analysis ---');
const signalstatsRaw = execSync(
  `ffmpeg -i "${PRIMARY_PATH}" -vf "signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-" -f null -`,
  { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
);

const yavgMatches = [...signalstatsRaw.matchAll(/lavfi\.signalstats\.YAVG=([\d\.]+)/g)].map(m => parseFloat(m[1]));
assertCheck('Signalstats extracted all video frames', yavgMatches.length === 672, `${yavgMatches.length} frames`);

if (yavgMatches.length > 0) {
  const minY = Math.min(...yavgMatches);
  const maxY = Math.max(...yavgMatches);
  const sumY = yavgMatches.reduce((acc, v) => acc + v, 0);
  const avgY = sumY / yavgMatches.length;
  const blackFrames = yavgMatches.filter(v => v < 16.0).length; // Y < 16 is digital black in limited range
  const lowLumaFrames = yavgMatches.filter(v => v < 30.0).length;

  assertCheck('Overall average luma YAVG > 40.0', avgY > 40.0, `avg Y = ${avgY.toFixed(2)}`);
  assertCheck('Zero digital black frames (Y < 16)', blackFrames === 0, `black frames count = ${blackFrames}`);
  assertCheck('Zero underexposed blank frames (Y < 30)', lowLumaFrames === 0, `low luma count = ${lowLumaFrames}`);
  assertCheck('Minimum frame luma > 35.0', minY > 35.0, `min Y = ${minY.toFixed(2)}`);
  assertCheck('Maximum frame luma healthy (< 220)', maxY < 220.0, `max Y = ${maxY.toFixed(2)}`);
}

// 5. Audio Waveform & Dynamics (Volume Detect & EBU R128)
console.log('\n--- 5. Audio Dynamics & Loudness Analysis ---');
const volumeDetectRaw = spawnSync(
  'ffmpeg',
  ['-i', PRIMARY_PATH, '-af', 'volumedetect', '-f', 'null', '-'],
  { encoding: 'utf8' }
);
const volStderr = volumeDetectRaw.stderr || '';
const meanVolMatch = volStderr.match(/mean_volume:\s*([-\d\.]+)\s*dB/);
const maxVolMatch = volStderr.match(/max_volume:\s*([-\d\.]+)\s*dB/);
const meanVolumeDb = meanVolMatch ? parseFloat(meanVolMatch[1]) : -999;
const maxVolumeDb = maxVolMatch ? parseFloat(maxVolMatch[1]) : -999;

assertCheck('Audio is not silent (mean volume > -50 dB)', meanVolumeDb > -50.0, `mean = ${meanVolumeDb} dB`);
assertCheck('Audio mean volume in audible range (-35 dB to -10 dB)', meanVolumeDb >= -35.0 && meanVolumeDb <= -10.0, `mean = ${meanVolumeDb} dB`);
assertCheck('Audio max volume does not hard clip (<= 0.0 dB)', maxVolumeDb <= 0.0, `max = ${maxVolumeDb} dB`);

const ebuRaw = spawnSync(
  'ffmpeg',
  ['-i', PRIMARY_PATH, '-af', 'ebur128', '-f', 'null', '-'],
  { encoding: 'utf8' }
);
const ebuStderr = ebuRaw.stderr || '';
const integratedMatch = ebuStderr.match(/Integrated loudness:\s+I:\s+([-\d\.]+)\s+LUFS/);
const integratedLufs = integratedMatch ? parseFloat(integratedMatch[1]) : -999;
assertCheck('Audio EBU R128 integrated loudness near broadcast target (-26 to -16 LUFS)', 
  integratedLufs >= -26.0 && integratedLufs <= -16.0, 
  `integrated = ${integratedLufs} LUFS`
);

// 6. FastStart / MOOV Atom Position Check
console.log('\n--- 6. FastStart / MP4 Atom Layout ---');
// In MP4 faststart (+faststart), 'moov' atom appears before 'mdat' atom
const mp4Buffer = fs.readFileSync(PRIMARY_PATH);
const moovOffset = mp4Buffer.indexOf(Buffer.from('moov'));
const mdatOffset = mp4Buffer.indexOf(Buffer.from('mdat'));
assertCheck('moov atom present', moovOffset !== -1, `offset: ${moovOffset}`);
assertCheck('mdat atom present', mdatOffset !== -1, `offset: ${mdatOffset}`);
assertCheck('moov atom precedes mdat atom (FastStart enabled)', moovOffset < mdatOffset, `moov: ${moovOffset} < mdat: ${mdatOffset}`);

// 7. Storefront Guardrail Audit
console.log('\n--- 7. Storefront Guardrail Audit ---');
const pageContent = fs.readFileSync(path.join(ROOT_DIR, 'src', 'app', 'page.tsx'), 'utf8');
assertCheck('src/app/page.tsx has 0 occurrences of "16-bit"', !pageContent.includes('16-bit') && !pageContent.includes('16bit'));

// 8. Studio Master Verification Suite
console.log('\n--- 8. Studio Master Verification Suite (verify-studio.mjs) ---');
const studioResult = spawnSync('node', ['scripts/verify-studio.mjs'], { encoding: 'utf8' });
assertCheck('node scripts/verify-studio.mjs exits with code 0', studioResult.status === 0, `code: ${studioResult.status}`);
assertCheck('node scripts/verify-studio.mjs 44/44 checks pass', studioResult.stdout.includes('44 Passed, 0 Failed'), studioResult.stdout.match(/\d+ Passed, \d+ Failed/)?.[0] || 'see logs');

// 9. Publisher Dry-Run
console.log('\n--- 9. Autopilot Publisher Dry-Run (publish-socials.mjs) ---');
const pubResult = spawnSync('node', ['scripts/publish-socials.mjs', '--dry-run'], { encoding: 'utf8' });
assertCheck('node scripts/publish-socials.mjs --dry-run exits with code 0', pubResult.status === 0, `code: ${pubResult.status}`);
assertCheck('Publisher verifies 4 social platforms in dry-run', 
  pubResult.stdout.includes('YouTube Shorts') && 
  pubResult.stdout.includes('Facebook Reels') && 
  pubResult.stdout.includes('Instagram Reels') && 
  pubResult.stdout.includes('TikTok'),
  'all 4 platforms verified'
);

console.log('\n================================================================');
console.log(`SUMMARY: ${passedChecks}/${totalChecks} CHECKS PASSED (${failures.length} FAILURES)`);
if (failures.length === 0) {
  console.log('VERDICT: >>> APPROVE <<<');
} else {
  console.log('VERDICT: >>> REQUEST_CHANGES <<<');
  console.log('Failures:', JSON.stringify(failures, null, 2));
}
console.log('================================================================\n');

process.exit(failures.length === 0 ? 0 : 1);
