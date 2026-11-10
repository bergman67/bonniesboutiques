/**
 * src/lib/studio/audioSynth.ts
 * Web Audio API Synthesizer with Dual-Pitch Animal Crossing Voice Blips & 72 BPM Lo-Fi Chords
 * Pipes audio to BOTH live speakers (AudioContext.destination) and video recorder (MediaStreamAudioDestinationNode).
 */

import { CharacterId } from './characterRig';
import { FlowMusicMood, MOOD_PRESETS } from './flowMusicEngine';

class StudioAudioEngine {
  private ctx: AudioContext | null = null;
  private streamDestination: MediaStreamAudioDestinationNode | null = null;
  private masterGain: GainNode | null = null;
  private monitorGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicDuckGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private isMusicActive = false;
  private musicIntervalId: ReturnType<typeof setInterval> | null = null;
  private vinylNode: AudioBufferSourceNode | null = null;
  private customTrackSourceNode: AudioBufferSourceNode | null = null;
  private customAudioBuffer: AudioBuffer | null = null;
  private currentMood: FlowMusicMood = 'cozy_nostalgia';
  private isMuted = false;
  private monitorVolume = 0.5;

  // 72 BPM chord progression: Fmaj7 -> Em7 -> Dm7 -> Cmaj7
  // 72 BPM = 60 / 72 = ~0.833 seconds per beat, 4 beats per bar = ~3.33 seconds per chord
  private chordProgression = [
    // Fmaj7
    [174.61, 220.0, 261.63, 329.63],
    // Em7
    [164.81, 196.0, 246.94, 293.66],
    // Dm7
    [146.83, 174.61, 220.0, 261.63],
    // Cmaj7
    [130.81, 164.81, 196.0, 246.94],
  ];
  private currentChordIndex = 0;

  public init(): AudioContext {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    this.ctx = new AudioContextClass();

    // Create Master Audio Pipeline
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    // 1. Video Recording Stream Destination
    this.streamDestination = this.ctx.createMediaStreamDestination();
    this.masterGain.connect(this.streamDestination);

    // 2. Speaker Monitor Output (with Mute/Volume controls)
    this.monitorGain = this.ctx.createGain();
    this.monitorGain.gain.setValueAtTime(this.isMuted ? 0 : this.monitorVolume, this.ctx.currentTime);
    this.masterGain.connect(this.monitorGain);
    this.monitorGain.connect(this.ctx.destination);

    // Sub-busses
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.22, this.ctx.currentTime);

    // Sidechain Ducking Node (-10.5 dB target during speech)
    this.musicDuckGain = this.ctx.createGain();
    this.musicDuckGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    this.musicGain.connect(this.musicDuckGain);
    this.musicDuckGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    return this.ctx;
  }

  public getContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      this.init();
    }
    return this.ctx;
  }

  public getStreamDestination(): MediaStreamAudioDestinationNode | null {
    if (!this.streamDestination && typeof window !== 'undefined') {
      this.init();
    }
    return this.streamDestination;
  }

  public setVolume(volume: number): void {
    this.monitorVolume = Math.max(0, Math.min(1, volume));
    if (this.monitorGain && this.ctx && !this.isMuted) {
      this.monitorGain.gain.setTargetAtTime(this.monitorVolume, this.ctx.currentTime, 0.05);
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.monitorGain && this.ctx) {
      this.monitorGain.gain.setTargetAtTime(muted ? 0 : this.monitorVolume, this.ctx.currentTime, 0.05);
    }
  }

  public isMonitorMuted(): boolean {
    return this.isMuted;
  }

  public getVolume(): number {
    return this.monitorVolume;
  }

  /**
   * Smooth Sidechain Volume Ducking (~70ms attack, ~600ms release, -10.5 dB target)
   */
  public duckMusic(isDucked: boolean): void {
    if (!this.musicDuckGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    const targetGain = isDucked ? 0.298538 : 1.0; // -10.5 dB attenuation
    const rampSec = isDucked ? 0.07 : 0.60;
    this.musicDuckGain.gain.cancelScheduledValues(now);
    this.musicDuckGain.gain.setValueAtTime(this.musicDuckGain.gain.value, now);
    this.musicDuckGain.gain.linearRampToValueAtTime(targetGain, now + rampSec);
  }

  /**
   * Mood preset selection across all 6 distinct moods
   */
  public setMood(mood: FlowMusicMood): void {
    this.currentMood = mood;
    if (MOOD_PRESETS[mood]) {
      this.chordProgression = MOOD_PRESETS[mood].chordProgression;
      this.currentChordIndex = 0;
    }
  }

  public getMood(): FlowMusicMood {
    return this.currentMood;
  }

  /**
   * Custom Audio Track Loading via Web Audio decodeAudioData
   */
  public async loadCustomTrack(source: ArrayBuffer | string): Promise<boolean> {
    try {
      const ctx = this.init();
      if (!ctx) return false;

      let arrayBuffer: ArrayBuffer;
      if (typeof source === 'string') {
        const response = await fetch(source);
        if (!response.ok) return false;
        arrayBuffer = await response.arrayBuffer();
      } else {
        arrayBuffer = source;
      }

      const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
      this.customAudioBuffer = decoded;
      return true;
    } catch {
      return false;
    }
  }

  public playCustomTrack(loop: boolean = true): void {
    if (!this.ctx || !this.customAudioBuffer || !this.musicGain) return;
    this.stopCustomTrack();

    const srcNode = this.ctx.createBufferSource();
    srcNode.buffer = this.customAudioBuffer;
    srcNode.loop = loop;
    srcNode.connect(this.musicGain);
    srcNode.start();
    this.customTrackSourceNode = srcNode;
    this.isMusicActive = true;
  }

  public stopCustomTrack(): void {
    if (this.customTrackSourceNode) {
      try {
        this.customTrackSourceNode.stop();
        this.customTrackSourceNode.disconnect();
      } catch {
        // ignore
      }
      this.customTrackSourceNode = null;
    }
  }

  /**
   * Character Voice Blips (Animal Crossing style)
   * Bonnie: ~540 - 660 Hz (warm, maternal, sine/triangle)
   * Tammy: ~920 - 1160 Hz (youthful, bright, filtered square/sine)
   */
  public playVoiceBlip(characterId: CharacterId = 'bonnie'): void {
    try {
      const ctx = this.init();
      if (!ctx || !this.sfxGain) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (characterId === 'bonnie') {
        // Warm maternal pitch: 540 - 660 Hz with subtle triangle harmonics
        osc.type = 'triangle';
        const baseFreq = 540 + Math.random() * 120;
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.08, now + 0.035);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        osc.stop(now + 0.05);
      } else if (characterId === 'tammy') {
        // Bright youthful pitch: 920 - 1160 Hz with crisp sine
        osc.type = 'sine';
        const baseFreq = 920 + Math.random() * 240;
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.15, now + 0.03);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.065, now + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);
        osc.stop(now + 0.042);
      } else {
        // Narrator: 440 - 520 Hz
        osc.type = 'sine';
        osc.frequency.setValueAtTime(460 + Math.random() * 60, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.stop(now + 0.045);
      }

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
    } catch {
      // Graceful fallback for audio suspended policies
    }
  }

  /**
   * Sound Effects (Chime, Gasp, Laugh, Tea Sip, Box Tap)
   */
  public playSoundEffect(effect: string): void {
    try {
      const ctx = this.init();
      if (!ctx || !this.sfxGain) return;

      const now = ctx.currentTime;

      switch (effect) {
        case 'chime': {
          // Magical 4-note sparkling arpeggio
          const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const noteStart = now + idx * 0.06;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, noteStart);

            gain.gain.setValueAtTime(0, noteStart);
            gain.gain.linearRampToValueAtTime(0.08, noteStart + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.35);

            osc.connect(gain);
            gain.connect(this.sfxGain!);
            osc.start(noteStart);
            osc.stop(noteStart + 0.38);
          });
          break;
        }

        case 'gasp': {
          // Quick startled rising slide
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.exponentialRampToValueAtTime(800, now + 0.12);

          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.09, now + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.16);
          break;
        }

        case 'laugh': {
          // Staccato bouncing laugh bursts
          for (let i = 0; i < 3; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const t = now + i * 0.08;
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(620 + (i % 2) * 50, t);

            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.07, t + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

            osc.connect(gain);
            gain.connect(this.sfxGain!);
            osc.start(t);
            osc.stop(t + 0.07);
          }
          break;
        }

        case 'tea_sip': {
          // Gentle soft noise sip
          const bufferSize = ctx.sampleRate * 0.18;
          const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const output = noiseBuffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
          }

          const whiteNoise = ctx.createBufferSource();
          whiteNoise.buffer = noiseBuffer;

          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1400, now);
          filter.Q.setValueAtTime(3.0, now);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.05, now + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

          whiteNoise.connect(filter);
          filter.connect(gain);
          gain.connect(this.sfxGain);
          whiteNoise.start(now);
          whiteNoise.stop(now + 0.19);
          break;
        }

        case 'box_tap': {
          // Warm resonant cardboard tap
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(160, now);
          osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);

          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.12, now + 0.005);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.11);
          break;
        }

        case 'blip':
        default:
          this.playVoiceBlip('bonnie');
          break;
      }
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Procedural 72 BPM Lo-Fi Synth Music Progression
   * Fmaj7 -> Em7 -> Dm7 -> Cmaj7 with warm lowpass filters and subtle vibrato
   */
  public startLoFiMusic(): void {
    if (this.isMusicActive) return;
    this.isMusicActive = true;

    try {
      this.init();
      this.playLoFiChord();
      this.startVinylAmbience();

      // Bar duration at 72 BPM (4 beats = ~3.33s per chord)
      const chordDurationMs = 3333;
      this.musicIntervalId = setInterval(() => {
        if (this.isMusicActive) {
          this.currentChordIndex = (this.currentChordIndex + 1) % this.chordProgression.length;
          this.playLoFiChord();
        }
      }, chordDurationMs);
    } catch {
      // Audio autoplay policy
    }
  }

  public stopLoFiMusic(): void {
    this.isMusicActive = false;
    this.stopCustomTrack();
    if (this.musicIntervalId) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
    if (this.vinylNode) {
      try {
        this.vinylNode.stop();
        this.vinylNode.disconnect();
      } catch {
        // ignore
      }
      this.vinylNode = null;
    }
  }

  public isMusicPlaying(): boolean {
    return this.isMusicActive;
  }

  private playLoFiChord(): void {
    if (!this.ctx || !this.musicGain || !this.isMusicActive) return;

    const chord = this.chordProgression[this.currentChordIndex];
    const now = this.ctx.currentTime;
    const duration = 3.2;

    chord.forEach((freq) => {
      const osc1 = this.ctx!.createOscillator();
      const osc2 = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const chordGain = this.ctx!.createGain();

      // Dual warm detuned oscillators
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 1.002, now); // slight chorus detune

      // Warm lowpass filter to produce cozy lo-fi character
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(850, now);
      filter.frequency.exponentialRampToValueAtTime(600, now + duration);

      // Smooth attack and long decay envelope
      chordGain.gain.setValueAtTime(0, now);
      chordGain.gain.linearRampToValueAtTime(0.045, now + 0.25);
      chordGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(chordGain);
      chordGain.connect(this.musicGain!);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration + 0.1);
      osc2.stop(now + duration + 0.1);
    });
  }

  private startVinylAmbience(): void {
    if (!this.ctx || !this.musicGain) return;

    try {
      const bufferSize = this.ctx.sampleRate * 2.0;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Gentle crackle / vinyl dust simulation
      for (let i = 0; i < bufferSize; i++) {
        if (Math.random() < 0.001) {
          output[i] = (Math.random() * 2 - 1) * 0.4;
        } else {
          output[i] = (Math.random() * 2 - 1) * 0.015;
        }
      }

      this.vinylNode = this.ctx.createBufferSource();
      this.vinylNode.buffer = noiseBuffer;
      this.vinylNode.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
      filter.Q.setValueAtTime(1.0, this.ctx.currentTime);

      const vinylGain = this.ctx.createGain();
      vinylGain.gain.setValueAtTime(0.035, this.ctx.currentTime);

      this.vinylNode.connect(filter);
      filter.connect(vinylGain);
      vinylGain.connect(this.musicGain);

      this.vinylNode.start();
    } catch {
      // ignore
    }
  }
}

// Singleton audio engine instance
export const studioAudio = new StudioAudioEngine();

export function getAudioDestinationNode(): MediaStreamAudioDestinationNode | null {
  return studioAudio.getStreamDestination();
}

export function playVoiceBlip(characterId: CharacterId = 'bonnie'): void {
  studioAudio.playVoiceBlip(characterId);
}

export function playSoundEffect(effect: string): void {
  studioAudio.playSoundEffect(effect);
}

export function startLoFiMusic(): void {
  studioAudio.startLoFiMusic();
}

export function stopLoFiMusic(): void {
  studioAudio.stopLoFiMusic();
}

export function duckMusic(isDucked: boolean): void {
  studioAudio.duckMusic(isDucked);
}

export function setMusicMood(mood: FlowMusicMood): void {
  studioAudio.setMood(mood);
}

export function getMusicMood(): FlowMusicMood {
  return studioAudio.getMood();
}

export async function loadCustomMusicTrack(source: ArrayBuffer | string): Promise<boolean> {
  return studioAudio.loadCustomTrack(source);
}

export function playCustomTrack(loop?: boolean): void {
  studioAudio.playCustomTrack(loop);
}

export function stopCustomTrack(): void {
  studioAudio.stopCustomTrack();
}
