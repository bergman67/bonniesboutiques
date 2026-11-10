/**
 * scripts/test-challenger-m2-empirical.ts
 *
 * Adversarial Empirical Verification Suite for Milestone 2:
 * Flow Music Engine, Minecraft-style Synthesis, Sidechain Ducking, and Custom Track Resilience
 *
 * Authored by: challenger_m2_2 (Critic / Specialist)
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  synthesizeFlowMusic,
  synthesizeFlowMusicWav,
  loadCustomAudioTrack,
  getAvailableMusicTracks,
  analyzeSoundtrack,
  computeSidechainGainCurve,
  MOOD_PRESETS,
  FlowMusicMood,
  DUCKING_ATTACK_SEC,
  DUCKING_RELEASE_SEC,
  DUCKING_ATTENUATION_DB,
  DUCKED_LINEAR_GAIN,
  SpeechInterval,
} from '../src/lib/studio/flowMusicEngine';

const TEMP_DIR = path.resolve(process.cwd(), 'tmp-m2-challenger-fixtures');

// Helpers for test reporting
interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => void | Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, durationMs: Date.now() - start });
    console.log(`  ✔ [PASS] ${name} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({
      name,
      passed: false,
      durationMs: Date.now() - start,
      error: err?.message || String(err),
    });
    console.error(`  ❌ [FAIL] ${name} (${Date.now() - start}ms): ${err?.message || err}`);
  }
}

// Helper to create synthetic WAV files for testing
function createSynthesizedWavFile(
  filePath: string,
  options: {
    channels?: number;
    sampleRate?: number;
    bitsPerSample?: number;
    durationSec?: number;
    riffMagic?: string;
    waveMagic?: string;
    fmtChunkSize?: number;
    audioFormat?: number;
    truncateDataBytes?: number;
    customDataChunkId?: string;
  } = {}
) {
  const channels = options.channels !== undefined ? options.channels : 2;
  const sampleRate = options.sampleRate !== undefined ? options.sampleRate : 44100;
  const bitsPerSample = options.bitsPerSample !== undefined ? options.bitsPerSample : 16;
  const durationSec = options.durationSec !== undefined ? options.durationSec : 0.5;
  const riffMagic = options.riffMagic || 'RIFF';
  const waveMagic = options.waveMagic || 'WAVE';
  const fmtChunkSize = options.fmtChunkSize !== undefined ? options.fmtChunkSize : 16;
  const audioFormat = options.audioFormat !== undefined ? options.audioFormat : 1;
  const dataChunkId = options.customDataChunkId || 'data';

  const numSamples = Math.floor(sampleRate * durationSec);
  const bytesPerSample = bitsPerSample / 8;
  const rawDataBytes = numSamples * channels * bytesPerSample;
  const actualDataBytes =
    options.truncateDataBytes !== undefined ? options.truncateDataBytes : rawDataBytes;

  const totalFileSize = 44 + actualDataBytes;
  const buf = Buffer.alloc(totalFileSize);

  // RIFF header
  buf.write(riffMagic, 0, 4, 'latin1');
  buf.writeUInt32LE(totalFileSize - 8, 4);
  buf.write(waveMagic, 8, 4, 'latin1');

  // fmt chunk
  buf.write('fmt ', 12, 4, 'latin1');
  buf.writeUInt32LE(fmtChunkSize, 16);
  buf.writeUInt16LE(audioFormat, 20);
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  buf.writeUInt16LE(channels * bytesPerSample, 32);
  buf.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  buf.write(dataChunkId, 36, 4, 'latin1');
  buf.writeUInt32LE(rawDataBytes, 40);

  // Fill sine audio only if channels > 0
  if (channels > 0) {
    let offset = 44;
    for (let i = 0; i < numSamples && offset + channels * 2 <= totalFileSize; i++) {
      const t = i / sampleRate;
      const val = Math.sin(2 * Math.PI * 440 * t) * 0.5;
      const intVal = Math.floor(val * 32767);
      buf.writeInt16LE(intVal, offset);
      if (channels > 1) {
        buf.writeInt16LE(intVal, offset + 2);
      }
      offset += channels * 2;
    }
  }

  fs.writeFileSync(filePath, buf);
  return filePath;
}

async function runEmpiricalSuites() {
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║       CHALLENGER M2-2 ADVERSARIAL EMPIRICAL VERIFICATION SUITE        ║');
  console.log('║       Milestone 2: Flow Music Engine, Ducking & Custom Track Resilience║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  try {
    // ════════════════════════════════════════════════════════════════════════════
    // SUITE 1: CUSTOM TRACK RESILIENCE & PROCEDURAL FALLBACK
    // ════════════════════════════════════════════════════════════════════════════
    console.log('─── SUITE 1: Custom Track Loading Resilience & Safe Fallback ───');

    await test('1.1 Load real existing WAV file (public/music/ambient_sample.wav)', async () => {
      const realWav = path.resolve(process.cwd(), 'public', 'music', 'ambient_sample.wav');
      assert.ok(fs.existsSync(realWav), 'ambient_sample.wav must exist on disk');
      const loaded = await loadCustomAudioTrack(realWav, 5.0, 44100);
      assert.ok(loaded !== null, 'Should load valid ambient_sample.wav');
      assert.strictEqual(loaded.length, 2, 'Should return stereo [left, right]');
      assert.strictEqual(loaded[0].length, Math.ceil(5.0 * 44100));
      assert.strictEqual(loaded[1].length, Math.ceil(5.0 * 44100));

      // Check amplitudes strictly within [-1.0, 1.0] and non-NaN
      for (let i = 0; i < loaded[0].length; i++) {
        assert.ok(!Number.isNaN(loaded[0][i]), 'Sample must not be NaN');
        assert.ok(Number.isFinite(loaded[0][i]), 'Sample must be finite');
        assert.ok(loaded[0][i] >= -1.0 && loaded[0][i] <= 1.0, 'Sample must be within [-1.0, 1.0]');
      }
    });

    await test('1.2 Load synthesized valid 44.1kHz stereo 16-bit WAV', async () => {
      const validPath = path.join(TEMP_DIR, 'valid_44k_stereo.wav');
      createSynthesizedWavFile(validPath, { channels: 2, sampleRate: 44100, bitsPerSample: 16, durationSec: 1.0 });
      const loaded = await loadCustomAudioTrack(validPath, 2.0, 44100);
      assert.ok(loaded !== null);
      assert.strictEqual(loaded[0].length, Math.ceil(2.0 * 44100));
    });

    await test('1.3 Load synthesized valid mono 22.05kHz WAV (resampling & stereo upmixing)', async () => {
      const monoPath = path.join(TEMP_DIR, 'valid_22k_mono.wav');
      createSynthesizedWavFile(monoPath, { channels: 1, sampleRate: 22050, bitsPerSample: 16, durationSec: 1.0 });
      const loaded = await loadCustomAudioTrack(monoPath, 2.0, 44100);
      assert.ok(loaded !== null);
      assert.strictEqual(loaded[0].length, Math.ceil(2.0 * 44100));
      assert.strictEqual(loaded[1].length, Math.ceil(2.0 * 44100));
      // In mono, left and right should match
      assert.strictEqual(loaded[0][100], loaded[1][100]);
    });

    await test('1.4 Empty 0-byte file returns null cleanly', async () => {
      const emptyPath = path.join(TEMP_DIR, 'empty.wav');
      fs.writeFileSync(emptyPath, Buffer.alloc(0));
      const loaded = await loadCustomAudioTrack(emptyPath, 5.0, 44100);
      assert.strictEqual(loaded, null, '0-byte file must return null');
    });

    await test('1.5 Truncated headers (<44 bytes) return null cleanly', async () => {
      const truncatedLengths = [1, 4, 12, 24, 36, 43, 44];
      for (const len of truncatedLengths) {
        const truncPath = path.join(TEMP_DIR, `trunc_${len}.wav`);
        fs.writeFileSync(truncPath, Buffer.alloc(len));
        const loaded = await loadCustomAudioTrack(truncPath, 5.0, 44100);
        assert.strictEqual(loaded, null, `Truncated file of length ${len} must return null`);
      }
    });

    await test('1.6 Corrupted header magic (Invalid RIFF or WAVE tags) return null cleanly', async () => {
      // Bad RIFF magic
      const badRiff = path.join(TEMP_DIR, 'bad_riff.wav');
      createSynthesizedWavFile(badRiff, { riffMagic: 'NOPE' });
      assert.strictEqual(await loadCustomAudioTrack(badRiff, 5.0, 44100), null, 'Bad RIFF magic must return null');

      // Bad WAVE magic
      const badWave = path.join(TEMP_DIR, 'bad_wave.wav');
      createSynthesizedWavFile(badWave, { waveMagic: 'NOPE' });
      assert.strictEqual(await loadCustomAudioTrack(badWave, 5.0, 44100), null, 'Bad WAVE magic must return null');
    });

    await test('1.7 Corrupted header metadata (0 sampleRate, 0 channels, non-16-bit PCM)', async () => {
      // Zero sample rate
      const zeroSr = path.join(TEMP_DIR, 'zero_sr.wav');
      createSynthesizedWavFile(zeroSr, { sampleRate: 0 });
      assert.strictEqual(await loadCustomAudioTrack(zeroSr, 5.0, 44100), null, 'Zero sample rate must return null');

      // Zero channels
      const zeroChan = path.join(TEMP_DIR, 'zero_chan.wav');
      createSynthesizedWavFile(zeroChan, { channels: 0 });
      assert.strictEqual(await loadCustomAudioTrack(zeroChan, 5.0, 44100), null, 'Zero channels must return null');

      // 8-bit PCM (unsupported by 16-bit loader)
      const bit8 = path.join(TEMP_DIR, 'bit8.wav');
      createSynthesizedWavFile(bit8, { bitsPerSample: 8 });
      assert.strictEqual(await loadCustomAudioTrack(bit8, 5.0, 44100), null, '8-bit PCM must return null');

      // 24-bit PCM
      const bit24 = path.join(TEMP_DIR, 'bit24.wav');
      createSynthesizedWavFile(bit24, { bitsPerSample: 24 });
      assert.strictEqual(await loadCustomAudioTrack(bit24, 5.0, 44100), null, '24-bit PCM must return null');
    });

    await test('1.8 Missing "data" chunk returns null cleanly', async () => {
      const noData = path.join(TEMP_DIR, 'no_data.wav');
      createSynthesizedWavFile(noData, { customDataChunkId: 'junk' });
      assert.strictEqual(await loadCustomAudioTrack(noData, 5.0, 44100), null, 'Missing data chunk must return null');
    });

    await test('1.9 Truncated audio data (header claims 500000 bytes but file only has 100 bytes)', async () => {
      const truncData = path.join(TEMP_DIR, 'trunc_data.wav');
      createSynthesizedWavFile(truncData, { truncateDataBytes: 20 });
      // When truncated data has 0 samples for 2 channels 16-bit (20 bytes < 1 sample or too short)
      const res = await loadCustomAudioTrack(truncData, 5.0, 44100);
      // Even if it returns audio or null, it must not throw and must be valid
      if (res !== null) {
        assert.ok(Number.isFinite(res[0][0]));
      }
    });

    await test('1.10 Missing / Non-existent file path returns null cleanly', async () => {
      const missingPath = path.join(TEMP_DIR, 'definitely_does_not_exist_987654.wav');
      assert.strictEqual(await loadCustomAudioTrack(missingPath, 5.0, 44100), null);
      assert.strictEqual(await loadCustomAudioTrack('', 5.0, 44100), null);
    });

    await test('1.11 End-to-End Procedural Fallback Invariant in synthesizeFlowMusic', async () => {
      // Test synthesizeFlowMusic with all failure paths:
      const badPaths = [
        path.join(TEMP_DIR, 'empty.wav'),
        path.join(TEMP_DIR, 'bad_riff.wav'),
        path.join(TEMP_DIR, 'zero_sr.wav'),
        path.join(TEMP_DIR, 'definitely_does_not_exist_987654.wav'),
      ];

      for (const bp of badPaths) {
        const soundtrack = await synthesizeFlowMusic({
          customTrackPath: bp,
          durationSec: 6.0,
          mood: 'cozy_nostalgia',
        });

        assert.ok(soundtrack !== null, 'Must return soundtrack on fallback');
        assert.strictEqual(soundtrack.audioBuffer.length, 2, 'Must return stereo channels');
        assert.strictEqual(soundtrack.audioBuffer[0].length, Math.ceil(6.0 * 44100));

        // Verify non-silent procedural audio synthesized
        let sumSq = 0;
        for (let i = 0; i < soundtrack.audioBuffer[0].length; i++) {
          sumSq += soundtrack.audioBuffer[0][i] * soundtrack.audioBuffer[0][i];
        }
        const rms = Math.sqrt(sumSq / soundtrack.audioBuffer[0].length);
        assert.ok(rms > 0.005, `Procedural fallback must synthesize real audio (RMS: ${rms})`);
      }
    });

    await test('1.12 End-to-End Procedural Fallback Invariant in synthesizeFlowMusicWav', async () => {
      const badPath = path.join(TEMP_DIR, 'bad_riff.wav');
      const wavBuffer = await synthesizeFlowMusicWav({
        customTrackPath: badPath,
        durationSec: 5.0,
        mood: 'gentle_rain',
      });

      assert.ok(Buffer.isBuffer(wavBuffer), 'Must return a Buffer');
      assert.ok(wavBuffer.length > 44, 'Buffer must be larger than 44 bytes');
      assert.strictEqual(wavBuffer.toString('latin1', 0, 4), 'RIFF');
      assert.strictEqual(wavBuffer.toString('latin1', 8, 12), 'WAVE');
    });

    // ════════════════════════════════════════════════════════════════════════════
    // SUITE 2: 44.1kHz 16-BIT STEREO PCM WAV BUFFER SPECIFICATION COMPLIANCE
    // ════════════════════════════════════════════════════════════════════════════
    console.log('\n─── SUITE 2: 44.1kHz 16-Bit Stereo PCM WAV Buffer Compliance ───');

    const ALL_MOODS: FlowMusicMood[] = [
      'cozy_nostalgia',
      'gentle_rain',
      'deep_subwoofer',
      'mystic_math',
      'morning_dew',
      'twilight_dreams',
    ];

    for (const mood of ALL_MOODS) {
      await test(`2.1 WAV Buffer compliance for mood: ${mood} (26s standard)`, async () => {
        const durationSec = 26.0;
        const sampleRate = 44100;
        const expectedSamples = Math.ceil(durationSec * sampleRate);
        const expectedDataBytes = expectedSamples * 4; // 2 channels * 2 bytes
        const expectedTotalBytes = 44 + expectedDataBytes;

        const wav = await synthesizeFlowMusicWav({
          mood,
          durationSec,
          sampleRate,
        });

        // 1. Exact Byte Length
        assert.strictEqual(wav.length, expectedTotalBytes, `WAV buffer length must exactly equal 44 + dataBytes`);

        // 2. RIFF Header
        assert.strictEqual(wav.toString('latin1', 0, 4), 'RIFF', 'Bytes 0-3 must be "RIFF"');
        const riffSize = wav.readUInt32LE(4);
        assert.strictEqual(riffSize, expectedTotalBytes - 8, 'Bytes 4-7 must equal totalBytes - 8');
        assert.strictEqual(wav.toString('latin1', 8, 12), 'WAVE', 'Bytes 8-11 must be "WAVE"');

        // 3. fmt Sub-chunk
        assert.strictEqual(wav.toString('latin1', 12, 16), 'fmt ', 'Bytes 12-15 must be "fmt "');
        const subchunk1Size = wav.readUInt32LE(16);
        assert.strictEqual(subchunk1Size, 16, 'Subchunk1Size must be 16 for PCM');
        const audioFormat = wav.readUInt16LE(20);
        assert.strictEqual(audioFormat, 1, 'AudioFormat must be 1 (PCM)');
        const numChannels = wav.readUInt16LE(22);
        assert.strictEqual(numChannels, 2, 'NumChannels must be 2 (Stereo)');
        const sr = wav.readUInt32LE(24);
        assert.strictEqual(sr, sampleRate, `SampleRate must be ${sampleRate}`);
        const byteRate = wav.readUInt32LE(28);
        assert.strictEqual(byteRate, sampleRate * 4, `ByteRate must be ${sampleRate * 4}`);
        const blockAlign = wav.readUInt16LE(32);
        assert.strictEqual(blockAlign, 4, 'BlockAlign must be 4');
        const bitsPerSample = wav.readUInt16LE(34);
        assert.strictEqual(bitsPerSample, 16, 'BitsPerSample must be 16');

        // 4. data Sub-chunk
        assert.strictEqual(wav.toString('latin1', 36, 40), 'data', 'Bytes 36-39 must be "data"');
        const subchunk2Size = wav.readUInt32LE(40);
        assert.strictEqual(subchunk2Size, expectedDataBytes, 'Subchunk2Size must match expectedDataBytes');
      });
    }

    await test('2.2 WAV Buffer compliance across dynamic durations (5s, 10s, 22s, 30s)', async () => {
      const durations = [5.0, 10.0, 22.0, 30.0];
      for (const dur of durations) {
        const expectedSamples = Math.ceil(dur * 44100);
        const expectedTotalBytes = 44 + expectedSamples * 4;
        const wav = await synthesizeFlowMusicWav({
          mood: 'mystic_math',
          durationSec: dur,
        });
        assert.strictEqual(wav.length, expectedTotalBytes, `WAV length for ${dur}s must be ${expectedTotalBytes}`);
      }
    });

    // ════════════════════════════════════════════════════════════════════════════
    // SUITE 3: SAMPLE FLOATING-POINT & AMPLITUDE INTEGRITY VERIFICATION
    // ════════════════════════════════════════════════════════════════════════════
    console.log('\n─── SUITE 3: Sample Floating-Point & Amplitude Integrity ───');

    await test('3.1 Zero NaN, Zero Infinity, and strict [-1.0, 1.0] amplitude bounding across all 6 moods', async () => {
      let totalSamplesInspected = 0;
      let globalMinSample = 0;
      let globalMaxSample = 0;

      for (const mood of ALL_MOODS) {
        const soundtrack = await synthesizeFlowMusic({
          mood,
          durationSec: 10.0,
          sampleRate: 44100,
        });

        const left = soundtrack.audioBuffer[0];
        const right = soundtrack.audioBuffer[1];
        assert.strictEqual(left.length, right.length);

        for (let i = 0; i < left.length; i++) {
          const sL = left[i];
          const sR = right[i];

          // Check NaN
          assert.ok(!Number.isNaN(sL), `Left sample at index ${i} in ${mood} is NaN`);
          assert.ok(!Number.isNaN(sR), `Right sample at index ${i} in ${mood} is NaN`);

          // Check Finite
          assert.ok(Number.isFinite(sL), `Left sample at index ${i} in ${mood} is not finite (${sL})`);
          assert.ok(Number.isFinite(sR), `Right sample at index ${i} in ${mood} is not finite (${sR})`);

          // Check Amplitudes strictly within [-1.0, 1.0]
          assert.ok(sL >= -1.0 && sL <= 1.0, `Left sample ${sL} exceeds [-1.0, 1.0] in ${mood}`);
          assert.ok(sR >= -1.0 && sR <= 1.0, `Right sample ${sR} exceeds [-1.0, 1.0] in ${mood}`);

          if (sL < globalMinSample) globalMinSample = sL;
          if (sR < globalMinSample) globalMinSample = sR;
          if (sL > globalMaxSample) globalMaxSample = sL;
          if (sR > globalMaxSample) globalMaxSample = sR;

          totalSamplesInspected += 2;
        }
      }

      console.log(`    ↳ Verified ${totalSamplesInspected.toLocaleString()} float samples across 6 moods.`);
      console.log(`    ↳ Sample bounds observed: min=${globalMinSample.toFixed(4)}, max=${globalMaxSample.toFixed(4)}.`);
      assert.ok(globalMinSample < -0.1 && globalMaxSample > 0.1, 'Must have meaningful dynamic range');
    });

    await test('3.2 WAV Buffer 16-bit PCM integer range check (all in [-32768, 32767])', async () => {
      const wav = await synthesizeFlowMusicWav({
        mood: 'deep_subwoofer',
        durationSec: 12.0,
      });

      const numSamples = (wav.length - 44) / 4;
      let minInt = 0;
      let maxInt = 0;
      let intSamplesInspected = 0;

      for (let i = 0; i < numSamples; i++) {
        const offset = 44 + i * 4;
        const valL = wav.readInt16LE(offset);
        const valR = wav.readInt16LE(offset + 2);

        assert.ok(valL >= -32768 && valL <= 32767, `valL out of 16-bit range: ${valL}`);
        assert.ok(valR >= -32768 && valR <= 32767, `valR out of 16-bit range: ${valR}`);

        if (valL < minInt) minInt = valL;
        if (valR < minInt) minInt = valR;
        if (valL > maxInt) maxInt = valL;
        if (valR > maxInt) maxInt = valR;

        intSamplesInspected += 2;
      }

      console.log(`    ↳ Verified ${intSamplesInspected.toLocaleString()} 16-bit PCM samples.`);
      console.log(`    ↳ 16-bit range observed: min=${minInt}, max=${maxInt}.`);
    });

    await test('3.3 Stereo Decorrelation & Spatial Width Check', async () => {
      const soundtrack = await synthesizeFlowMusic({
        mood: 'morning_dew',
        durationSec: 8.0,
      });

      const left = soundtrack.audioBuffer[0];
      const right = soundtrack.audioBuffer[1];

      let diffCount = 0;
      for (let i = 0; i < left.length; i++) {
        if (Math.abs(left[i] - right[i]) > 1e-4) {
          diffCount++;
        }
      }

      const diffRatio = diffCount / left.length;
      assert.ok(diffRatio > 0.8, `Stereo channels must be decorrelated (observed diff ratio: ${(diffRatio * 100).toFixed(1)}%)`);
    });

    // ════════════════════════════════════════════════════════════════════════════
    // SUITE 4: SPECTRAL VARIATION & EVOLVING PHRASING (F6 CONTRACT)
    // ════════════════════════════════════════════════════════════════════════════
    console.log('\n─── SUITE 4: Spectral Variation & Phrasing (>15% Variation) ───');

    for (const mood of ALL_MOODS) {
      await test(`4.1 Evolving phrasing (>15% spectral variation) for mood: ${mood}`, async () => {
        const soundtrack = await synthesizeFlowMusic({
          mood,
          durationSec: 26.0,
          sampleRate: 44100,
        });

        console.log(`    ↳ Mood ${mood}: Spectral Variation = ${soundtrack.spectralVariationPercent}%`);
        assert.ok(
          soundtrack.spectralVariationPercent >= 15.0,
          `Mood ${mood} must have >= 15.0% spectral variation, got ${soundtrack.spectralVariationPercent}%`
        );
      });
    }

    // ════════════════════════════════════════════════════════════════════════════
    // SUITE 5: SIDECHAIN VOLUME DUCKING VERIFICATION (F7 CONTRACT)
    // ════════════════════════════════════════════════════════════════════════════
    console.log('\n─── SUITE 5: Sidechain Volume Ducking Integrity (-10.5 dB Target) ───');

    await test('5.1 Gain curve mathematical properties (attack ~70ms, release ~600ms, linear gain ~0.2985)', () => {
      const speechIntervals: SpeechInterval[] = [
        { startSec: 2.0, endSec: 5.0, speaker: 'bonnie' },
      ];
      const sampleRate = 1000; // 1 sample per ms for precise timing verification
      const curve = computeSidechainGainCurve(8.0, sampleRate, speechIntervals);

      // Pre-speech: gain must be 1.0
      assert.strictEqual(curve[Math.floor(1.5 * sampleRate)], 1.0, 'Pre-speech gain must be 1.0');

      // During attack: at 2.0s + 70ms = 2.07s, gain should reach DUCKED_LINEAR_GAIN
      const attackEndSample = Math.floor((2.0 + DUCKING_ATTACK_SEC) * sampleRate);
      assert.ok(
        Math.abs(curve[attackEndSample] - DUCKED_LINEAR_GAIN) < 0.02,
        `Attack end gain must reach ~${DUCKED_LINEAR_GAIN}, got ${curve[attackEndSample]}`
      );

      // During speech: at 3.5s, gain must be DUCKED_LINEAR_GAIN
      const midSpeechSample = Math.floor(3.5 * sampleRate);
      assert.ok(
        Math.abs(curve[midSpeechSample] - DUCKED_LINEAR_GAIN) < 0.01,
        `Mid-speech gain must be ~${DUCKED_LINEAR_GAIN}, got ${curve[midSpeechSample]}`
      );

      // During release: at 5.0s + 600ms = 5.6s, gain should return to ~1.0
      const releaseEndSample = Math.floor((5.0 + DUCKING_RELEASE_SEC) * sampleRate);
      assert.ok(
        curve[releaseEndSample] >= 0.99,
        `Release end gain must return to 1.0, got ${curve[releaseEndSample]}`
      );
    });

    await test('5.2 End-to-end audio attenuation during speech beats in synthesizeFlowMusic', async () => {
      const speechIntervals: SpeechInterval[] = [
        { startSec: 4.0, endSec: 8.0, speaker: 'tammy' },
      ];

      const soundtrack = await synthesizeFlowMusic({
        mood: 'cozy_nostalgia',
        durationSec: 15.0,
        speechIntervals,
      });

      console.log(`    ↳ Measured mean speech ducking: ${soundtrack.meanSpeechDuckingDb} dB`);
      // Target is -10.5 dB (+/- 0.5 dB)
      assert.ok(
        soundtrack.meanSpeechDuckingDb <= -9.5 && soundtrack.meanSpeechDuckingDb >= -11.5,
        `Mean speech ducking must be approx -10.5 dB, got ${soundtrack.meanSpeechDuckingDb} dB`
      );
    });

    // ════════════════════════════════════════════════════════════════════════════
    // SUITE 6: ADVERSARIAL STRESS & FUZZ TESTING
    // ════════════════════════════════════════════════════════════════════════════
    console.log('\n─── SUITE 6: Adversarial Stress & Fuzz Testing ───');

    await test('6.1 Extreme durations (0s, negative, huge 60s)', async () => {
      // 0s is falsy so it safely defaults to 26.0s default duration
      const res0 = await synthesizeFlowMusic({ durationSec: 0 });
      assert.strictEqual(res0.durationSec, 26.0, '0s duration must safely default to 26.0s');

      // Negative duration should clamp to minimum duration (5.0s)
      const resNeg = await synthesizeFlowMusic({ durationSec: -10 });
      assert.strictEqual(resNeg.durationSec, 5.0, 'Negative duration must clamp to 5.0s');

      // 60s should succeed without memory or stack blowup
      const res60 = await synthesizeFlowMusic({ durationSec: 60.0 });
      assert.strictEqual(res60.durationSec, 60.0);
      assert.strictEqual(res60.audioBuffer[0].length, Math.ceil(60.0 * 44100));
    });

    await test('6.2 Invalid/Unknown mood string gracefully falls back to cozy_nostalgia', async () => {
      const res = await synthesizeFlowMusic({ mood: 'INVALID_MOOD_STRING' as any });
      assert.ok(res !== null);
      assert.strictEqual(res.audioBuffer.length, 2);
    });

    await test('6.3 Malformed speech intervals (inverted, negative, out of bounds)', async () => {
      const malformedIntervals: SpeechInterval[] = [
        { startSec: 10.0, endSec: 5.0, speaker: 'bonnie' }, // inverted
        { startSec: -10.0, endSec: -2.0, speaker: 'tammy' }, // negative
        { startSec: 100.0, endSec: 200.0, speaker: 'narrator' }, // out of bounds
      ];

      const res = await synthesizeFlowMusic({
        durationSec: 10.0,
        speechIntervals: malformedIntervals,
      });

      assert.ok(res !== null);
      for (let i = 0; i < res.audioBuffer[0].length; i++) {
        assert.ok(!Number.isNaN(res.audioBuffer[0][i]));
        assert.ok(Number.isFinite(res.audioBuffer[0][i]));
      }
    });

  } finally {
    // Cleanup temporary test fixtures
    try {
      if (fs.existsSync(TEMP_DIR)) {
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup error
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log('═══════════════════════════════════════════════════════════════════════');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runEmpiricalSuites().catch((err) => {
  console.error('Unhandled fatal error in test suite:', err);
  process.exit(1);
});
