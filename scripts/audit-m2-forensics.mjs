import fs from 'node:fs';
import path from 'node:path';
import {
  synthesizeFlowMusic,
  synthesizeFlowMusicWav,
  analyzeSoundtrack,
  computeSidechainGainCurve,
  loadCustomAudioTrack,
  MOOD_PRESETS,
  DUCKED_LINEAR_GAIN,
  DUCKING_ATTACK_SEC,
  DUCKING_RELEASE_SEC,
} from '../src/lib/studio/flowMusicEngine.ts';

console.log('=== FORENSIC INTEGRITY AUDIT: MILESTONE 2 ===\n');

// 1. ASSET AUTHENTICITY: public/music/ambient_sample.wav
console.log('--- 1. ASSET FORENSICS: public/music/ambient_sample.wav ---');
const wavPath = path.resolve(process.cwd(), 'public/music/ambient_sample.wav');
if (!fs.existsSync(wavPath)) {
  console.error('FAIL: ambient_sample.wav does not exist!');
  process.exit(1);
}

const stats = fs.statSync(wavPath);
console.log(`File size: ${stats.size} bytes`);

const wavBuf = fs.readFileSync(wavPath);
const riff = wavBuf.toString('latin1', 0, 4);
const fileSizeMinus8 = wavBuf.readUInt32LE(4);
const wave = wavBuf.toString('latin1', 8, 12);
const fmt = wavBuf.toString('latin1', 12, 16);
const fmtSize = wavBuf.readUInt32LE(16);
const audioFormat = wavBuf.readUInt16LE(20);
const numChannels = wavBuf.readUInt16LE(22);
const sampleRate = wavBuf.readUInt32LE(24);
const byteRate = wavBuf.readUInt32LE(28);
const blockAlign = wavBuf.readUInt16LE(32);
const bitsPerSample = wavBuf.readUInt16LE(34);
const dataChunk = wavBuf.toString('latin1', 36, 40);
const dataSize = wavBuf.readUInt32LE(40);

console.log(`Header Verification:`);
console.log(`  RIFF Chunk ID: '${riff}' (expected 'RIFF')`);
console.log(`  WAVE Header: '${wave}' (expected 'WAVE')`);
console.log(`  FMT Subchunk: '${fmt}' (size: ${fmtSize})`);
console.log(`  Audio Format: ${audioFormat} (1 = PCM)`);
console.log(`  Num Channels: ${numChannels} (Stereo = 2)`);
console.log(`  Sample Rate: ${sampleRate} Hz (expected 44100)`);
console.log(`  Byte Rate: ${byteRate} (expected ${sampleRate * numChannels * (bitsPerSample / 8)})`);
console.log(`  Block Align: ${blockAlign} (expected ${numChannels * (bitsPerSample / 8)})`);
console.log(`  Bits Per Sample: ${bitsPerSample} (16-bit)`);
console.log(`  Data Chunk ID: '${dataChunk}' (expected 'data')`);
console.log(`  Data Chunk Size: ${dataSize} bytes`);

const expectedDataSize = stats.size - 44;
const isHeaderValid =
  riff === 'RIFF' &&
  wave === 'WAVE' &&
  fmt === 'fmt ' &&
  audioFormat === 1 &&
  numChannels === 2 &&
  sampleRate === 44100 &&
  bitsPerSample === 16 &&
  dataChunk === 'data' &&
  dataSize === expectedDataSize;

console.log(`Header Valid: ${isHeaderValid ? 'PASS' : 'FAIL'}`);

// Sample Level Forensics
const totalSamplesPerChannel = dataSize / (numChannels * (bitsPerSample / 8));
const durationSec = totalSamplesPerChannel / sampleRate;
console.log(`Calculated Duration: ${durationSec.toFixed(3)}s`);

let sumSqL = 0;
let sumSqR = 0;
let peakL = 0;
let peakR = 0;
let zeroCrossingsL = 0;
let zeroCrossingsR = 0;
let prevSampleL = 0;
let prevSampleR = 0;
let nonZeroCount = 0;
let dotProduct = 0;

for (let i = 0; i < totalSamplesPerChannel; i++) {
  const byteOffset = 44 + i * 4;
  const sL = wavBuf.readInt16LE(byteOffset) / 32768.0;
  const sR = wavBuf.readInt16LE(byteOffset + 2) / 32768.0;

  if (sL !== 0 || sR !== 0) nonZeroCount++;

  sumSqL += sL * sL;
  sumSqR += sR * sR;
  dotProduct += sL * sR;

  if (Math.abs(sL) > peakL) peakL = Math.abs(sL);
  if (Math.abs(sR) > peakR) peakR = Math.abs(sR);

  if (i > 0) {
    if ((sL >= 0 && prevSampleL < 0) || (sL < 0 && prevSampleL >= 0)) zeroCrossingsL++;
    if ((sR >= 0 && prevSampleR < 0) || (sR < 0 && prevSampleR >= 0)) zeroCrossingsR++;
  }
  prevSampleL = sL;
  prevSampleR = sR;
}

const rmsL = Math.sqrt(sumSqL / totalSamplesPerChannel);
const rmsR = Math.sqrt(sumSqR / totalSamplesPerChannel);
const rmsDbL = 20 * Math.log10(rmsL);
const rmsDbR = 20 * Math.log10(rmsR);
const peakDbL = 20 * Math.log10(peakL);
const peakDbR = 20 * Math.log10(peakR);
const correlation = dotProduct / (Math.sqrt(sumSqL) * Math.sqrt(sumSqR));

console.log(`Sample Analysis:`);
console.log(`  Non-zero Samples: ${nonZeroCount} / ${totalSamplesPerChannel} (${((nonZeroCount / totalSamplesPerChannel) * 100).toFixed(1)}%)`);
console.log(`  Peak Amplitude: Left=${peakL.toFixed(4)} (${peakDbL.toFixed(1)} dBFS), Right=${peakR.toFixed(4)} (${peakDbR.toFixed(1)} dBFS)`);
console.log(`  RMS Power: Left=${rmsL.toFixed(4)} (${rmsDbL.toFixed(1)} dBFS), Right=${rmsR.toFixed(4)} (${rmsDbR.toFixed(1)} dBFS)`);
console.log(`  Zero Crossings: Left=${zeroCrossingsL}, Right=${zeroCrossingsR}`);
console.log(`  Inter-channel Correlation: ${correlation.toFixed(4)} (1.0 = mono, <0.99 = true stereo spread)`);

const isAudioNonSilent = rmsL > 0.01 && rmsR > 0.01 && nonZeroCount > totalSamplesPerChannel * 0.95;
const hasStereoSpread = correlation < 0.999;
console.log(`Non-silent and Active: ${isAudioNonSilent ? 'PASS' : 'FAIL'}`);
console.log(`Authentic Stereo Spread: ${hasStereoSpread ? 'PASS' : 'FAIL'}`);

// 2. STATIC CODE ANALYSIS FOR PROHIBITED PATTERNS
console.log('\n--- 2. STATIC CODE FORENSICS ---');
const flowCode = fs.readFileSync('src/lib/studio/flowMusicEngine.ts', 'utf8');

// Check for base64 audio strings or hex payloads
const base64Matches = flowCode.match(/data:audio\/[a-zA-Z0-9;]+;base64,[a-zA-Z0-9+/=]{100,}/g);
console.log(`Hardcoded Base64 Audio Buffers: ${base64Matches ? base64Matches.length : 0} found`);

// Check for massive literal numeric arrays (potential canned audio)
const massiveArrayMatches = flowCode.match(/\[\s*(-?\d+(\.\d+)?[,\s]+){50,}\]/g);
console.log(`Massive Hardcoded Numeric Arrays: ${massiveArrayMatches ? massiveArrayMatches.length : 0} found`);

// Verify Acoustic Physics formulas in source code
const hasFeltHammer = flowCode.includes('hammerFreq = 72.0') && flowCode.includes('Math.sin(2 * Math.PI * hammerFreq * t) * Math.exp(-t / hammerDecay)');
const hasDetuneChorus = flowCode.includes('detuneChorus') && flowCode.includes('fL = k * freq * (1 - detuneChorus');
const hasKalimbaOvertones = flowCode.includes('2.76 * freq * t') && flowCode.includes('5.40 * freq * t') && flowCode.includes('Math.exp(-t / 0.14)');
const hasPadLfoFilter = flowCode.includes('0.15 * t') && flowCode.includes('dynamicCutoff') && flowCode.includes('filterStateL += alpha');
const hasShimmerFdn = flowCode.includes('0.031 * sampleRate') && flowCode.includes('0.043 * sampleRate') && flowCode.includes('shimmerOctaveL = d0 * Math.abs(d1)');
const hasTapeWarmth = flowCode.includes('Math.tanh(1.15 *') && flowCode.includes('0.0018 * Math.sin(2 * Math.PI * 0.35 * t)');

console.log(`Physics Verification:`);
console.log(`  Felt Piano 72Hz Hammer Transient: ${hasFeltHammer ? 'PASS' : 'FAIL'}`);
console.log(`  Felt Piano Detuned String Chorus: ${hasDetuneChorus ? 'PASS' : 'FAIL'}`);
console.log(`  Kalimba Inharmonic Overtones (2.76x, 5.40x): ${hasKalimbaOvertones ? 'PASS' : 'FAIL'}`);
console.log(`  Pad Swell Breathing Cutoff LFO Filter: ${hasPadLfoFilter ? 'PASS' : 'FAIL'}`);
console.log(`  Shimmer Reverb 4-Tap FDN + Octave Injection: ${hasShimmerFdn ? 'PASS' : 'FAIL'}`);
console.log(`  Tape Saturation Tanh(1.15*x) & Wow/Flutter: ${hasTapeWarmth ? 'PASS' : 'FAIL'}`);

// 3. RUNTIME EXECUTION OF ALL 6 MOODS
console.log('\n--- 3. RUNTIME SYNTHESIS FORENSICS (6 MOODS) ---');
const moods = Object.keys(MOOD_PRESETS);
const moodResults = {};

for (const mood of moods) {
  const result = await synthesizeFlowMusic({
    mood,
    durationSec: 24.0,
    sampleRate: 44100,
    includeVinyl: true,
  });

  const left = result.audioBuffer[0];
  const right = result.audioBuffer[1];

  let sumSq = 0;
  let peak = 0;
  for (let i = 0; i < left.length; i++) {
    const s = left[i];
    sumSq += s * s;
    if (Math.abs(s) > peak) peak = Math.abs(s);
  }
  const rms = Math.sqrt(sumSq / left.length);
  const rmsDb = 20 * Math.log10(rms);

  const analysis = analyzeSoundtrack(left, 44100);

  moodResults[mood] = {
    rmsDb: rmsDb.toFixed(1),
    peak: peak.toFixed(3),
    spectralVariation: analysis.spectralVariationPercent,
    spectralCentroids: analysis.spectralCentroids,
    firstSample: left[1000].toFixed(5),
    midSample: left[Math.floor(left.length / 2)].toFixed(5),
  };

  console.log(`Mood [${mood}]:`);
  console.log(`  RMS: ${rmsDb.toFixed(1)} dBFS | Peak: ${peak.toFixed(3)} | Spectral Variation: ${analysis.spectralVariationPercent.toFixed(1)}%`);
  console.log(`  Centroids (Q1->Q4): [${analysis.spectralCentroids.join(' -> ')}] Hz`);
  console.log(`  >15% Spectral Variation: ${analysis.spectralVariationPercent > 15 ? 'PASS' : 'FAIL'}`);
}

// Verify that different moods produce mathematically distinct audio
console.log('\nMood Distinction Check:');
const moodKeys = Object.keys(moodResults);
let distinct = true;
for (let i = 0; i < moodKeys.length; i++) {
  for (let j = i + 1; j < moodKeys.length; j++) {
    const m1 = moodResults[moodKeys[i]];
    const m2 = moodResults[moodKeys[j]];
    if (m1.firstSample === m2.firstSample && m1.midSample === m2.midSample && m1.spectralVariation === m2.spectralVariation) {
      console.error(`FAIL: Mood ${moodKeys[i]} and ${moodKeys[j]} have identical output!`);
      distinct = false;
    }
  }
}
console.log(`All 6 Moods Are Mutually Unique: ${distinct ? 'PASS' : 'FAIL'}`);

// 4. RUNTIME WAV BUFFER ENCODING
console.log('\n--- 4. RUNTIME WAV BUFFER ENCODING FORENSICS ---');
const wavOut = await synthesizeFlowMusicWav({
  mood: 'mystic_math',
  durationSec: 10.0,
  sampleRate: 44100,
});

console.log(`Generated WAV Buffer Length: ${wavOut.length} bytes`);
const expectedWavBytes = 44 + 10.0 * 44100 * 2 * 2;
console.log(`Expected WAV Buffer Length: ${expectedWavBytes} bytes`);
const wavOutRiff = wavOut.toString('latin1', 0, 4);
const wavOutWave = wavOut.toString('latin1', 8, 12);
const wavOutFmt = wavOut.toString('latin1', 12, 16);
const wavOutRate = wavOut.readUInt32LE(24);
const wavOutChannels = wavOut.readUInt16LE(22);
const wavOutBits = wavOut.readUInt16LE(34);
const wavOutData = wavOut.toString('latin1', 36, 40);
const wavOutDataLen = wavOut.readUInt32LE(40);

console.log(`Generated WAV Header:`);
console.log(`  RIFF: '${wavOutRiff}' | WAVE: '${wavOutWave}' | FMT: '${wavOutFmt}'`);
console.log(`  SampleRate: ${wavOutRate} | Channels: ${wavOutChannels} | Bits: ${wavOutBits}`);
console.log(`  Data Chunk: '${wavOutData}' | Size: ${wavOutDataLen}`);

const isWavEncodingValid =
  wavOut.length === expectedWavBytes &&
  wavOutRiff === 'RIFF' &&
  wavOutWave === 'WAVE' &&
  wavOutFmt === 'fmt ' &&
  wavOutRate === 44100 &&
  wavOutChannels === 2 &&
  wavOutBits === 16 &&
  wavOutData === 'data' &&
  wavOutDataLen === 10.0 * 44100 * 4;

console.log(`WAV Buffer Encoding: ${isWavEncodingValid ? 'PASS' : 'FAIL'}`);

// 5. SIDECHAIN DUCKING FORENSICS
console.log('\n--- 5. SIDECHAIN DUCKING MATHEMATICAL FORENSICS ---');
const speechIntervals = [{ startSec: 4.0, endSec: 8.0, speaker: 'bonnie' }];
const duckedResult = await synthesizeFlowMusic({
  mood: 'cozy_nostalgia',
  durationSec: 12.0,
  sampleRate: 44100,
  speechIntervals,
  includeVinyl: false,
});

const duckedLeft = duckedResult.audioBuffer[0];
const unduckedResult = await synthesizeFlowMusic({
  mood: 'cozy_nostalgia',
  durationSec: 12.0,
  sampleRate: 44100,
  speechIntervals: [],
  includeVinyl: false,
});
const unduckedLeft = unduckedResult.audioBuffer[0];

// Measure RMS in 3 windows:
// Window 1: Pre-speech (1.0s to 3.5s)
// Window 2: During speech (4.5s to 7.5s)
// Window 3: Post-speech (9.5s to 11.5s)
function measureWindowRms(buf, startSec, endSec, sr = 44100) {
  const start = Math.floor(startSec * sr);
  const end = Math.floor(endSec * sr);
  let sumSq = 0;
  for (let i = start; i < end; i++) {
    sumSq += buf[i] * buf[i];
  }
  return Math.sqrt(sumSq / (end - start));
}

const rmsPreDucked = measureWindowRms(duckedLeft, 1.0, 3.5);
const rmsDuringDucked = measureWindowRms(duckedLeft, 4.5, 7.5);
const rmsPostDucked = measureWindowRms(duckedLeft, 9.5, 11.5);

const rmsPreUnducked = measureWindowRms(unduckedLeft, 1.0, 3.5);
const rmsDuringUnducked = measureWindowRms(unduckedLeft, 4.5, 7.5);
const rmsPostUnducked = measureWindowRms(unduckedLeft, 9.5, 11.5);

const attenuationDb = 20 * Math.log10(rmsDuringDucked / rmsDuringUnducked);
const preRatio = rmsPreDucked / rmsPreUnducked;
const postRatio = rmsPostDucked / rmsPostUnducked;

console.log(`Pre-speech Gain Ratio: ${preRatio.toFixed(3)} (expected ~1.0)`);
console.log(`During-speech Attenuation: ${attenuationDb.toFixed(2)} dB (target: -10.5 dB)`);
console.log(`Post-speech Gain Recovery Ratio: ${postRatio.toFixed(3)} (expected ~1.0)`);

// Test ducking envelope mathematical curve directly
const curve = computeSidechainGainCurve(12.0, 44100, speechIntervals);
const gainAt3s = curve[Math.floor(3.0 * 44100)];
const gainAt4s = curve[Math.floor(4.0 * 44100)];
const gainAt4_07s = curve[Math.floor(4.07 * 44100)];
const gainAt6s = curve[Math.floor(6.0 * 44100)];
const gainAt8s = curve[Math.floor(8.0 * 44100)];
const gainAt8_6s = curve[Math.floor(8.6 * 44100)];
const gainAt10s = curve[Math.floor(10.0 * 44100)];

console.log(`Envelope Sample Checks:`);
console.log(`  Gain at t=3.0s (pre-speech): ${gainAt3s.toFixed(4)} (expected 1.0)`);
console.log(`  Gain at t=4.0s (speech start): ${gainAt4s.toFixed(4)} (expected 1.0)`);
console.log(`  Gain at t=4.07s (end of 70ms attack): ${gainAt4_07s.toFixed(4)} (expected ${DUCKED_LINEAR_GAIN.toFixed(4)})`);
console.log(`  Gain at t=6.0s (mid speech): ${gainAt6s.toFixed(4)} (expected ${DUCKED_LINEAR_GAIN.toFixed(4)})`);
console.log(`  Gain at t=8.0s (speech end): ${gainAt8s.toFixed(4)} (expected ${DUCKED_LINEAR_GAIN.toFixed(4)})`);
console.log(`  Gain at t=8.6s (end of 600ms release): ${gainAt8_6s.toFixed(4)} (expected 1.0)`);
console.log(`  Gain at t=10.0s (post-speech): ${gainAt10s.toFixed(4)} (expected 1.0)`);

const isDuckingMathValid =
  Math.abs(gainAt3s - 1.0) < 0.001 &&
  Math.abs(gainAt4_07s - DUCKED_LINEAR_GAIN) < 0.01 &&
  Math.abs(gainAt6s - DUCKED_LINEAR_GAIN) < 0.001 &&
  Math.abs(gainAt8_6s - 1.0) < 0.01 &&
  Math.abs(attenuationDb - -10.5) < 1.0;

console.log(`Ducking Mathematical Precision: ${isDuckingMathValid ? 'PASS' : 'FAIL'}`);

// 6. CUSTOM TRACK LOADER & FALLBACK RESILIENCE
console.log('\n--- 6. CUSTOM TRACK LOADER & RESILIENCE FORENSICS ---');
// 6a. Load valid wav
const validLoad = await loadCustomAudioTrack('public/music/ambient_sample.wav', 10.0, 44100);
const isLoadValid = validLoad && validLoad[0] && validLoad[0].length === 44100 * 10;
console.log(`Load Valid WAV (10s buffer): ${isLoadValid ? 'PASS' : 'FAIL'}`);

// 6b. Non-existent file fallback
const missingLoad = await loadCustomAudioTrack('public/music/non_existent.wav', 10.0, 44100);
console.log(`Missing Track Graceful Return Null: ${missingLoad === null ? 'PASS' : 'FAIL'}`);

// 6c. Zero-byte file fallback
const tmpZeroPath = 'public/music/test_zero.wav';
fs.writeFileSync(tmpZeroPath, Buffer.alloc(0));
const zeroLoad = await loadCustomAudioTrack(tmpZeroPath, 10.0, 44100);
fs.unlinkSync(tmpZeroPath);
console.log(`Zero-Byte Track Graceful Return Null: ${zeroLoad === null ? 'PASS' : 'FAIL'}`);

// 6d. Corrupted file fallback
const tmpCorruptPath = 'public/music/test_corrupt.wav';
fs.writeFileSync(tmpCorruptPath, Buffer.from('NOT A REAL RIFF WAVE FILE DATA PAYLOAD'));
const corruptLoad = await loadCustomAudioTrack(tmpCorruptPath, 10.0, 44100);
fs.unlinkSync(tmpCorruptPath);
console.log(`Corrupted Header Graceful Return Null: ${corruptLoad === null ? 'PASS' : 'FAIL'}`);

// 6e. Procedural synthesis fallback when customTrackPath fails
const fallbackResult = await synthesizeFlowMusic({
  customTrackPath: 'public/music/non_existent.wav',
  durationSec: 8.0,
});
const isFallbackValid = fallbackResult && fallbackResult.audioBuffer[0].length === 8 * 44100;
console.log(`Procedural Synthesis Fallback: ${isFallbackValid ? 'PASS' : 'FAIL'}`);

console.log('\n=== FORENSIC AUDIT COMPLETE ===');
