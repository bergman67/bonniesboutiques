'use client';

/**
 * src/components/studio/TrinketTalesStudio.tsx
 * Master Studio Workbench & Director Console for "Bonnie & Tammy's Trinket Tales"
 * Integrates procedural canvas, skit engine, 24/7 Lo-Fi mode, audio synth,
 * 1-click & batch video exporter, and multi-platform social caption generator.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { StudioCanvas, StudioCanvasHandle, AspectRatio } from './StudioCanvas';
import { BackdropId, BACKDROPS } from '@/lib/studio/backdrops';
import {
  BUILT_IN_SKITS,
  SkitTemplate,
  generateNextLoFiBeat,
  validateScript,
  createEmptyBeat,
  createCustomSkitTemplate,
} from '@/lib/studio/skitTemplates';
import {
  CHARACTER_ACTIONS,
  CHARACTER_EXPRESSIONS,
  CharacterAction,
  CharacterExpression,
  CharacterId,
} from '@/lib/studio/characterRig';
import { getAllCatalogProducts, CatalogProduct, generateRPGAppraisal, RPGProductAppraisal } from '@/lib/studio/rpgAppraisal';
import { studioAudio } from '@/lib/studio/audioSynth';
import {
  VideoRecorderSession,
  triggerFileDownload,
  batchQueueManager,
  BatchQueueItem,
} from '@/lib/studio/videoExporter';
import {
  PlatformId,
  generateAllPlatformCopy,
  copyToClipboard,
  SkitSocialMetadata,
} from '@/lib/studio/socialCaptions';
import { BatchQueueModal } from './BatchQueueModal';
import { SocialMetricsTracker } from './SocialMetricsTracker';

export default function TrinketTalesStudio() {
  const canvasHandleRef = useRef<StudioCanvasHandle | null>(null);

  // Studio Configuration State
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [backdropId, setBackdropId] = useState<BackdropId>('cozy_night_shop');
  const [activeSkit, setActiveSkit] = useState<SkitTemplate>(BUILT_IN_SKITS[0]);
  const [activePropId, setActivePropId] = useState<string | undefined>(BUILT_IN_SKITS[0].defaultPropId);

  // Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentBeatIndex, setCurrentBeatIndex] = useState<number>(0);
  const [beatProgress, setBeatProgress] = useState<number>(0); // 0.0 to 1.0

  // 24/7 Lo-Fi Mode
  const [is247LoFiMode, setIs247LoFiMode] = useState<boolean>(false);
  const loFiCycleRef = useRef<number>(0);

  // Audio State
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [audioVolume, setAudioVolume] = useState<number>(0.5);
  const [isMusicEnabled, setIsMusicEnabled] = useState<boolean>(true);

  // Video Export & Batch State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingProgress, setRecordingProgress] = useState<number>(0);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(batchQueueManager.isQueueProcessing());

  useEffect(() => {
    const unsubscribe = batchQueueManager.subscribe(() => {
      setIsBatchProcessing(batchQueueManager.isQueueProcessing());
    });
    return unsubscribe;
  }, []);

  // Active Director Console Tab
  const [activeTab, setActiveTab] = useState<'skits' | 'builder' | 'backdrops' | 'social' | 'metrics'>('skits');
  const [customSkit, setCustomSkit] = useState<SkitTemplate>(createCustomSkitTemplate());

  // Social Copy State
  const [activePlatform, setActivePlatform] = useState<PlatformId>('tiktok');
  const [copiedStatus, setCopiedStatus] = useState<boolean>(false);

  // Catalog Props for Picker
  const [catalogProducts] = useState<CatalogProduct[]>(getAllCatalogProducts());
  const [propSearchQuery, setPropSearchQuery] = useState<string>('');
  const [propCategoryFilter, setPropCategoryFilter] = useState<string>('All');

  // Compute Active Appraisal
  const featuredPropId = activePropId || activeSkit.defaultPropId;
  const currentAppraisal: RPGProductAppraisal | undefined = featuredPropId
    ? generateRPGAppraisal(featuredPropId)
    : undefined;

  // Social Metadata
  const socialMetadata: SkitSocialMetadata = generateAllPlatformCopy(activeSkit, currentAppraisal);

  // ── PLAYBACK TIMING ENGINE ──────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;

    const currentBeat = activeSkit.beats[currentBeatIndex];
    if (!currentBeat) return;

    const beatDurationMs = (currentBeat.durationSec || 4) * 1000;
    const intervalStepMs = 50;

    const timer = setInterval(() => {
      setBeatProgress((prev) => {
        const next = prev + intervalStepMs / beatDurationMs;
        if (next >= 1.0) {
          // Beat Complete: Advance to next beat
          if (currentBeatIndex < activeSkit.beats.length - 1) {
            setCurrentBeatIndex((idx) => idx + 1);
            return 0;
          } else {
            // Skit Finished
            if (is247LoFiMode) {
              // 24/7 Lo-Fi Looping Engine: Generate next beat
              loFiCycleRef.current += 1;
              const { beat, backdrop } = generateNextLoFiBeat(loFiCycleRef.current);
              setBackdropId(backdrop);
              setActiveSkit({
                id: `lofi_stream_${loFiCycleRef.current}`,
                title: '24/7 Lo-Fi Cozy Shopkeep',
                category: 'custom',
                durationSeconds: 5,
                defaultBackdrop: backdrop,
                description: 'Autonomous endless cozy shopkeep loop.',
                beats: [beat],
              });
              setCurrentBeatIndex(0);
              return 0;
            } else {
              setIsPlaying(false);
              return 1.0;
            }
          }
        }
        return next;
      });
    }, intervalStepMs);

    return () => clearInterval(timer);
  }, [isPlaying, currentBeatIndex, activeSkit, is247LoFiMode]);

  // ── AUDIO CONTROLS SYNCHRONIZATION ──────────────────────────────────
  useEffect(() => {
    studioAudio.setMuted(isAudioMuted);
    studioAudio.setVolume(audioVolume);
  }, [isAudioMuted, audioVolume]);

  useEffect(() => {
    if (isPlaying && isMusicEnabled) {
      studioAudio.startLoFiMusic();
    } else {
      studioAudio.stopLoFiMusic();
    }
  }, [isPlaying, isMusicEnabled]);

  // Handle Play / Pause Toggle
  const handleTogglePlay = () => {
    if (!isPlaying) {
      if (currentBeatIndex >= activeSkit.beats.length - 1 && beatProgress >= 1.0) {
        setCurrentBeatIndex(0);
        setBeatProgress(0);
      }
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  const handleResetPlayback = () => {
    setIsPlaying(false);
    setCurrentBeatIndex(0);
    setBeatProgress(0);
  };

  // Select Built-in Skit
  const handleSelectSkit = (skit: SkitTemplate) => {
    setIsPlaying(false);
    setActiveSkit(skit);
    setBackdropId(skit.defaultBackdrop);
    if (skit.defaultPropId) {
      setActivePropId(skit.defaultPropId);
    }
    setCurrentBeatIndex(0);
    setBeatProgress(0);
  };

  // Toggle 24/7 Lo-Fi Mode
  const handleToggle247LoFi = () => {
    if (!is247LoFiMode) {
      setIs247LoFiMode(true);
      loFiCycleRef.current = 0;
      const { beat, backdrop } = generateNextLoFiBeat(0);
      setBackdropId(backdrop);
      setActiveSkit({
        id: 'lofi_stream_0',
        title: '24/7 Lo-Fi Cozy Shopkeep',
        category: 'custom',
        durationSeconds: 5,
        defaultBackdrop: backdrop,
        description: 'Autonomous endless cozy shopkeep loop.',
        beats: [beat],
      });
      setCurrentBeatIndex(0);
      setBeatProgress(0);
      setIsPlaying(true);
    } else {
      setIs247LoFiMode(false);
      handleSelectSkit(BUILT_IN_SKITS[0]);
    }
  };

  // ── 1-CLICK VIDEO EXPORTER ──────────────────────────────────────────
  const handleRecordVideo = async () => {
    const canvas = canvasHandleRef.current?.getCanvas();
    if (!canvas) {
      alert('Canvas is not ready for recording');
      return;
    }

    try {
      setIsRecording(true);
      setRecordingProgress(0);
      setCurrentBeatIndex(0);
      setBeatProgress(0);
      setIsPlaying(true);

      const session = new VideoRecorderSession();
      const result = await session.recordCanvasStream(
        canvas,
        activeSkit.durationSeconds,
        {
          fps: 60,
          filename: `${activeSkit.id}-${aspectRatio.replace(':', 'x')}.webm`,
        },
        (progress) => {
          setRecordingProgress(progress);
        }
      );

      triggerFileDownload(result.url, result.filename);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`Recording failed: ${message}`);
    } finally {
      setIsRecording(false);
      setRecordingProgress(0);
      setIsPlaying(false);
    }
  };

  // ── BATCH QUEUE SEQUENTIAL RECORDER ─────────────────────────────────
  const activeBatchSessionRef = useRef<VideoRecorderSession | null>(null);

  const handleAbortBatchProcessing = useCallback(() => {
    batchQueueManager.setProcessing(false);
    if (activeBatchSessionRef.current) {
      activeBatchSessionRef.current.stop();
      activeBatchSessionRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const handleStartBatchProcessing = useCallback(async (items: BatchQueueItem[]) => {
    const canvas = canvasHandleRef.current?.getCanvas();
    if (!canvas) return;

    batchQueueManager.setProcessing(true);

    for (let i = 0; i < items.length; i++) {
      if (!batchQueueManager.isQueueProcessing()) break;
      const item = items[i];
      if (item.status === 'completed') continue;

      const skit = BUILT_IN_SKITS.find((s) => s.id === item.skitId);
      if (!skit) continue;

      // Prepare Skit on Canvas
      setActiveSkit(skit);
      setBackdropId(skit.defaultBackdrop);
      if (skit.defaultPropId) setActivePropId(skit.defaultPropId);
      setCurrentBeatIndex(0);
      setBeatProgress(0);
      setIsPlaying(true);

      batchQueueManager.updateItem(item.id, { status: 'recording', progressPercent: 0 });

      try {
        const session = new VideoRecorderSession();
        activeBatchSessionRef.current = session;

        const result = await session.recordCanvasStream(
          canvas,
          skit.durationSeconds,
          {
            fps: 60,
            filename: `${skit.id}.webm`,
          },
          (progress) => {
            if (!batchQueueManager.isQueueProcessing()) {
              session.stop();
              return;
            }
            batchQueueManager.updateItem(item.id, { progressPercent: progress });
          }
        );

        activeBatchSessionRef.current = null;

        if (!batchQueueManager.isQueueProcessing()) {
          batchQueueManager.updateItem(item.id, {
            status: 'queued',
            progressPercent: 0,
          });
          break;
        }

        batchQueueManager.updateItem(item.id, {
          status: 'completed',
          progressPercent: 100,
          blobUrl: result.url,
          downloadFilename: result.filename,
        });

        // Trigger automatic download
        triggerFileDownload(result.url, result.filename);
      } catch (err: unknown) {
        activeBatchSessionRef.current = null;
        if (!batchQueueManager.isQueueProcessing()) {
          batchQueueManager.updateItem(item.id, {
            status: 'queued',
            progressPercent: 0,
          });
          break;
        }
        batchQueueManager.updateItem(item.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Export failed',
        });
      }
    }

    batchQueueManager.setProcessing(false);
    activeBatchSessionRef.current = null;
    setIsPlaying(false);
  }, []);

  // 1-Click Clipboard Copy with Feedback
  const handleCopyPlatformText = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedStatus(true);
      setTimeout(() => setCopiedStatus(false), 2000);
    }
  };

  // Filtered Catalog Props
  const filteredProducts = catalogProducts.filter((p) => {
    const matchesCategory = propCategoryFilter === 'All' || p.category === propCategoryFilter;
    const matchesSearch =
      propSearchQuery.trim() === '' ||
      p.title.toLowerCase().includes(propSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div
      className="min-h-screen flex flex-col select-none"
      style={{
        background: 'linear-gradient(135deg, #120919 0%, #1a0f24 50%, #251235 100%)',
        color: '#f5efe6',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* ── TOP HEADER ─────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 border-b border-rose-500/25"
        style={{
          background: 'rgba(26, 15, 36, 0.95)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl sm:text-3xl">🎬</span>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
              <span>Bonnie &amp; Tammy&apos;s Trinket Tales Studio</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold uppercase tracking-wider">
                16-Bit Engine
              </span>
            </h1>
            <p className="text-[11px] text-rose-200">
              Autonomous Short-Form Character Animation, Skits &amp; 24/7 Lo-Fi Studio
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Aspect Ratio Switcher (9:16, 16:9, 1:1) */}
          <div className="flex items-center bg-black/40 p-1 rounded-xl border border-rose-500/30">
            {(['9:16', '16:9', '1:1'] as AspectRatio[]).map((ratio) => (
              <button
                key={ratio}
                onClick={() => setAspectRatio(ratio)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  aspectRatio === ratio
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                {ratio === '9:16' ? '📱 9:16' : ratio === '16:9' ? '🖥️ 16:9' : '⏹️ 1:1'}
              </button>
            ))}
          </div>

          {/* 24/7 Lo-Fi Mode Toggle */}
          <button
            onClick={handleToggle247LoFi}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              is247LoFiMode
                ? 'bg-rose-500/30 border-rose-400 text-rose-200 animate-pulse'
                : 'bg-white/5 border-white/20 text-stone-300 hover:bg-white/10'
            }`}
          >
            <span>{is247LoFiMode ? '🔴' : '☕'}</span>
            <span>{is247LoFiMode ? '24/7 Lo-Fi Active' : 'Start 24/7 Mode'}</span>
          </button>

          {/* Nav Links */}
          <Link
            href="/admin"
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white/5 border border-white/20 hover:bg-white/10 text-stone-200 transition-all"
          >
            ← Admin
          </Link>
          <Link
            href="/"
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white/5 border border-white/20 hover:bg-white/10 text-stone-200 transition-all"
          >
            Storefront
          </Link>
        </div>
      </header>

      {/* ── MAIN WORKBENCH ─────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-6 max-w-[1720px] mx-auto w-full">
        {/* LEFT / CENTER: CANVAS VIEWPORT & PLAYBACK CONTROLS (Cols 1-7) */}
        <div className="lg:col-span-7 flex flex-col items-center justify-between gap-4">
          {/* Canvas Wrapper */}
          <div className="w-full flex-1 min-h-[460px] flex items-center justify-center">
            <StudioCanvas
              ref={canvasHandleRef}
              aspectRatio={aspectRatio}
              backdropId={backdropId}
              activeSkit={activeSkit}
              currentBeatIndex={currentBeatIndex}
              beatProgress={beatProgress}
              isPlaying={isPlaying}
              activePropId={featuredPropId}
            />
          </div>

          {/* Director Playback & Export Console Bar */}
          <div
            className="w-full p-4 rounded-2xl border border-rose-500/25 flex flex-col gap-3 shadow-xl"
            style={{ background: 'rgba(26, 15, 36, 0.85)' }}
          >
            {/* Beat Step Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-bold text-rose-200">
                <span className="truncate">
                  Beat {currentBeatIndex + 1} of {activeSkit.beats.length}: &ldquo;{activeSkit.beats[currentBeatIndex]?.dialogue.substring(0, 40)}...&rdquo;
                </span>
                <span className="text-[11px] text-stone-400">
                  {Math.round(beatProgress * 100)}%
                </span>
              </div>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${activeSkit.beats.length}, minmax(0, 1fr))` }}>
                {activeSkit.beats.map((_, idx) => (
                  <div
                    key={idx}
                    className="h-2 rounded-full overflow-hidden bg-black/40 cursor-pointer"
                    onClick={() => {
                      setCurrentBeatIndex(idx);
                      setBeatProgress(0);
                    }}
                  >
                    <div
                      className={`h-full transition-all duration-100 ${
                        idx < currentBeatIndex
                          ? 'bg-rose-500'
                          : idx === currentBeatIndex
                          ? 'bg-amber-400'
                          : 'bg-transparent'
                      }`}
                      style={{
                        width: idx === currentBeatIndex ? `${beatProgress * 100}%` : idx < currentBeatIndex ? '100%' : '0%',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Playback Controls & Audio Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTogglePlay}
                  className="px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md"
                  style={{
                    background: isPlaying ? '#e11d48' : 'linear-gradient(135deg, #e8748a, #c44b63)',
                    color: 'white',
                  }}
                >
                  <span>{isPlaying ? '⏸ Pause' : '▶ Play'}</span>
                </button>
                <button
                  onClick={handleResetPlayback}
                  className="px-3 py-2 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/15 text-stone-200 transition-all"
                  title="Reset to beginning"
                >
                  ↺ Reset
                </button>

                {/* Audio Monitor Controls */}
                <div className="flex items-center gap-2 ml-2 pl-3 border-l border-white/20">
                  <button
                    onClick={() => setIsAudioMuted(!isAudioMuted)}
                    className="text-base text-stone-300 hover:text-white transition-all"
                    title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
                  >
                    {isAudioMuted ? '🔇' : '🔊'}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isAudioMuted ? 0 : audioVolume}
                    onChange={(e) => {
                      setIsAudioMuted(false);
                      setAudioVolume(parseFloat(e.target.value));
                    }}
                    className="w-16 accent-rose-400 h-1.5 cursor-pointer"
                  />
                  <button
                    onClick={() => setIsMusicEnabled(!isMusicEnabled)}
                    className={`text-[10px] px-2 py-1 rounded-md font-bold transition-all ${
                      isMusicEnabled ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/5 text-stone-400'
                    }`}
                  >
                    Lo-Fi Chords
                  </button>
                </div>
              </div>

              {/* 1-Click Export & Batch Trigger */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setIsBatchModalOpen(true)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    isBatchProcessing
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                      : 'bg-white/10 hover:bg-white/15 text-stone-200 border-white/20'
                  }`}
                >
                  <span>🎞️</span>
                  <span>{isBatchProcessing ? 'Batch Running (Abort...)' : 'Batch Queue'}</span>
                </button>
                <button
                  onClick={handleRecordVideo}
                  disabled={isRecording}
                  className="px-4 py-2 rounded-xl font-extrabold text-xs text-white shadow-lg flex items-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                  }}
                >
                  <span>🎥</span>
                  <span>{isRecording ? `Recording (${recordingProgress}%)` : '1-Click Video Export'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: DIRECTOR CONTROL CONSOLE TABS (Cols 8-12) */}
        <div
          className="lg:col-span-5 rounded-3xl border border-rose-500/25 p-5 flex flex-col gap-4 shadow-2xl overflow-hidden"
          style={{ background: 'rgba(26, 15, 36, 0.92)' }}
        >
          {/* Tab Navigation Buttons */}
          <div className="flex flex-wrap gap-2 border-b border-rose-500/20 pb-3">
            {[
              { id: 'skits', label: `📜 ${BUILT_IN_SKITS.length} Skits` },
              { id: 'builder', label: '✍️ Script Builder' },
              { id: 'backdrops', label: '🎨 Set & Props' },
              { id: 'social', label: '📱 Social Copy' },
              { id: 'metrics', label: '🎯 100K Views' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'skits' | 'builder' | 'backdrops' | 'social' | 'metrics')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'bg-white/5 text-stone-300 hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: BUILT-IN SKITS */}
          {activeTab === 'skits' && (
            <div className="space-y-4 overflow-y-auto max-h-[68vh] pr-1">
              {(['fourth_wall', 'grandma_wisdom', 'rpg_appraisal', 'shopkeep_life'] as const).map((cat) => {
                const skitsInCat = BUILT_IN_SKITS.filter((s) => s.category === cat);
                const catTitle =
                  cat === 'fourth_wall'
                    ? `👀 4th-Wall Breaks & Meta Humor (${skitsInCat.length})`
                    : cat === 'grandma_wisdom'
                    ? `👵 Cozy Grandma Wisdom & Humor (${skitsInCat.length})`
                    : cat === 'rpg_appraisal'
                    ? `🔮 RPG Item Appraisal Skits (${skitsInCat.length})`
                    : `📦 Wholesome Shopkeep Day-in-the-Life (${skitsInCat.length})`;

                return (
                  <div key={cat} className="space-y-2">
                    <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                      {catTitle}
                    </h3>
                    <div className="space-y-2">
                      {skitsInCat.map((skit) => {
                        const isSelected = activeSkit.id === skit.id;
                        return (
                          <div
                            key={skit.id}
                            onClick={() => handleSelectSkit(skit)}
                            className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-rose-500/25 border-rose-400 text-white shadow-md'
                                : 'bg-white/5 border-rose-500/10 hover:bg-white/10 text-stone-300'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span>{skit.title}</span>
                              <span className="text-[10px] text-amber-300">~{skit.durationSeconds}s</span>
                            </div>
                            <p className="text-[11px] text-stone-400 mt-1 line-clamp-2">
                              {skit.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: CUSTOM SCRIPT BUILDER */}
          {activeTab === 'builder' && (
            <div className="space-y-4 overflow-y-auto max-h-[68vh] pr-1 text-xs">
              {/* Script Title */}
              <div>
                <label className="block text-[11px] font-bold text-rose-300 uppercase mb-1">
                  Custom Script Title
                </label>
                <input
                  type="text"
                  value={customSkit.title}
                  onChange={(e) => setCustomSkit({ ...customSkit, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-rose-500/30 text-white font-bold"
                />
              </div>

              {/* Beats Editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-300">Dialogue Beats ({customSkit.beats.length})</span>
                  <button
                    onClick={() => {
                      const newBeat = createEmptyBeat(customSkit.beats.length % 2 === 0 ? 'bonnie' : 'tammy');
                      setCustomSkit({ ...customSkit, beats: [...customSkit.beats, newBeat] });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-500 text-white font-bold text-[11px]"
                  >
                    + Add Beat
                  </button>
                </div>

                {customSkit.beats.map((beat, bIdx) => (
                  <div
                    key={beat.id}
                    className="p-3 rounded-2xl bg-white/5 border border-rose-500/15 space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-rose-200">
                      <span>Beat {bIdx + 1}</span>
                      {customSkit.beats.length > 1 && (
                        <button
                          onClick={() => {
                            setCustomSkit({
                              ...customSkit,
                              beats: customSkit.beats.filter((_, idx) => idx !== bIdx),
                            });
                          }}
                          className="text-stone-400 hover:text-rose-400"
                        >
                          Delete
                        </button>
                      )}
                    </div>

                    {/* Speaker, Action, Expression Selectors */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[9px] text-stone-400 uppercase">Speaker</label>
                        <select
                          value={beat.speaker}
                          onChange={(e) => {
                            const updated = [...customSkit.beats];
                            updated[bIdx] = { ...beat, speaker: e.target.value as CharacterId };
                            setCustomSkit({ ...customSkit, beats: updated });
                          }}
                          className="w-full px-2 py-1.5 rounded-lg bg-black/40 border border-rose-500/30 text-white text-[11px]"
                        >
                          <option value="bonnie">Bonnie</option>
                          <option value="tammy">Tammy</option>
                          <option value="narrator">Narrator</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] text-stone-400 uppercase">Action</label>
                        <select
                          value={beat.action}
                          onChange={(e) => {
                            const updated = [...customSkit.beats];
                            updated[bIdx] = { ...beat, action: e.target.value as CharacterAction };
                            setCustomSkit({ ...customSkit, beats: updated });
                          }}
                          className="w-full px-2 py-1.5 rounded-lg bg-black/40 border border-rose-500/30 text-white text-[11px] capitalize"
                        >
                          {CHARACTER_ACTIONS.map((act) => (
                            <option key={act} value={act}>
                              {act}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] text-stone-400 uppercase">Expression</label>
                        <select
                          value={beat.expression}
                          onChange={(e) => {
                            const updated = [...customSkit.beats];
                            updated[bIdx] = { ...beat, expression: e.target.value as CharacterExpression };
                            setCustomSkit({ ...customSkit, beats: updated });
                          }}
                          className="w-full px-2 py-1.5 rounded-lg bg-black/40 border border-rose-500/30 text-white text-[11px] capitalize"
                        >
                          {CHARACTER_EXPRESSIONS.map((expr) => (
                            <option key={expr} value={expr}>
                              {expr}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Dialogue Line Input */}
                    <div>
                      <label className="block text-[9px] text-stone-400 uppercase">Dialogue</label>
                      <textarea
                        rows={2}
                        value={beat.dialogue}
                        onChange={(e) => {
                          const updated = [...customSkit.beats];
                          updated[bIdx] = { ...beat, dialogue: e.target.value };
                          setCustomSkit({ ...customSkit, beats: updated });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-rose-500/30 text-white text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons: Test Play & Load into Studio */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => {
                    const validation = validateScript(customSkit);
                    if (!validation.valid) {
                      alert(`Script errors: ${validation.errors.join(', ')}`);
                      return;
                    }
                    setActiveSkit(customSkit);
                    setCurrentBeatIndex(0);
                    setBeatProgress(0);
                    setIsPlaying(true);
                  }}
                  className="w-full py-2.5 rounded-xl font-bold bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md text-xs"
                >
                  ▶ Test Play Custom Script on Canvas
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SET & PROPS PICKER */}
          {activeTab === 'backdrops' && (
            <div className="space-y-4 overflow-y-auto max-h-[68vh] pr-1 text-xs">
              {/* 5 Cozy Backdrops */}
              <div className="space-y-2">
                <h3 className="font-bold text-rose-300 uppercase tracking-wider">
                  5 Cozy Scene Backdrops
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {BACKDROPS.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => setBackdropId(b.id)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        backdropId === b.id
                          ? 'bg-rose-500/25 border-rose-400 text-white'
                          : 'bg-white/5 border-rose-500/10 hover:bg-white/10 text-stone-300'
                      }`}
                    >
                      <div className="font-bold">{b.name}</div>
                      <div className="text-[10px] text-stone-400 mt-0.5">{b.tagline}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 96 Product Props Catalog */}
              <div className="space-y-3 pt-3 border-t border-rose-500/20">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-rose-300 uppercase tracking-wider">
                    96 Real Catalog Product Props
                  </h3>
                  <span className="text-[11px] text-stone-400">{filteredProducts.length} items</span>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {['All', 'Beaded Pens', 'Keychains', 'Charms & Bookmarks'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setPropCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        propCategoryFilter === cat
                          ? 'bg-rose-500 text-white'
                          : 'bg-white/5 text-stone-300 hover:bg-white/10'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Search Input */}
                <input
                  type="text"
                  placeholder="Search products by keyword..."
                  value={propSearchQuery}
                  onChange={(e) => setPropSearchQuery(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-rose-500/30 text-white text-xs"
                />

                {/* Products Grid */}
                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {filteredProducts.map((p) => {
                    const isSelected = activePropId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setActivePropId(p.id)}
                        className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-rose-500/25 border-rose-400 text-white'
                            : 'bg-white/5 border-rose-500/10 hover:bg-white/10 text-stone-300'
                        }`}
                      >
                        <img
                          src={p.transparentLocalUrl}
                          alt={p.title}
                          className="w-8 h-8 object-contain rounded-md bg-black/20"
                        />
                        <div className="truncate">
                          <div className="font-bold text-[11px] truncate">{p.title}</div>
                          <div className="text-[9px] text-amber-300">${p.price}.00</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MULTI-PLATFORM SOCIAL METADATA (R4) */}
          {activeTab === 'social' && (
            <div className="space-y-4 overflow-y-auto max-h-[68vh] pr-1 text-xs">
              {/* Platform Selector Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(['tiktok', 'instagram', 'youtube_shorts', 'facebook_reels'] as PlatformId[]).map((plat) => (
                  <button
                    key={plat}
                    onClick={() => setActivePlatform(plat)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold text-center capitalize transition-all ${
                      activePlatform === plat
                        ? 'bg-rose-500 text-white shadow-md'
                        : 'bg-white/5 text-stone-300 hover:bg-white/10'
                    }`}
                  >
                    {plat === 'tiktok'
                      ? '🎵 TikTok'
                      : plat === 'instagram'
                      ? '📸 IG Reels'
                      : plat === 'youtube_shorts'
                      ? '▶️ Shorts'
                      : '👥 Facebook'}
                  </button>
                ))}
              </div>

              {/* Active Platform Card */}
              {(() => {
                const currentCopy = socialMetadata[activePlatform];
                return (
                  <div className="p-4 rounded-2xl bg-white/5 border border-rose-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-300 flex items-center gap-2">
                        <span>{currentCopy.icon}</span>
                        <span>{currentCopy.platformLabel} Copy</span>
                      </span>
                      <span className="text-[10px] text-stone-400">{currentCopy.charCount} characters</span>
                    </div>

                    {currentCopy.title && (
                      <div>
                        <div className="text-[10px] font-bold text-stone-400 uppercase">Video Title</div>
                        <div className="font-bold text-white text-xs mt-0.5">{currentCopy.title}</div>
                      </div>
                    )}

                    <div>
                      <div className="text-[10px] font-bold text-stone-400 uppercase">Caption Text</div>
                      <div className="text-stone-200 text-xs mt-1 whitespace-pre-line bg-black/30 p-2.5 rounded-xl border border-white/10 font-mono">
                        {currentCopy.caption}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-stone-400 uppercase">Hashtag Set</div>
                      <div className="text-rose-300 text-[11px] mt-1 flex flex-wrap gap-1.5">
                        {currentCopy.hashtags.map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-rose-500/15">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 1-Click Copy Button */}
                    <button
                      onClick={() => handleCopyPlatformText(currentCopy.fullFormattedText)}
                      className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                      style={{
                        background: copiedStatus
                          ? '#10b981'
                          : 'linear-gradient(135deg, #e8748a, #c44b63)',
                        color: 'white',
                      }}
                    >
                      <span>{copiedStatus ? '✓' : '📋'}</span>
                      <span>{copiedStatus ? 'Copied to Clipboard!' : '1-Click Copy Full Caption & Hashtags'}</span>
                    </button>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 5: 100K VIEWS METRICS TRACKER */}
          {activeTab === 'metrics' && (
            <div className="flex-1 overflow-y-auto pr-1">
              <SocialMetricsTracker />
            </div>
          )}
        </div>
      </div>

      {/* ── BATCH QUEUE MODAL ──────────────────────────────────────── */}
      <BatchQueueModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onStartBatch={(items) => {
          void handleStartBatchProcessing(items);
        }}
        onAbortBatch={handleAbortBatchProcessing}
      />
    </div>
  );
}
