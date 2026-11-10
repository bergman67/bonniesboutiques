'use client';

/**
 * src/components/studio/StudioCanvas.tsx
 * Integer-Scaled 16-Bit Canvas Viewport with Burnt-in Synced Captions (R1 & R3)
 * Supports 9:16 (1080x1920), 16:9 (1920x1080), and 1:1 (1080x1080) framing
 * Renders procedural Bonnie & Tammy, 5 backdrops, 96 product props, and RPG appraisal HUD.
 */

import React, { useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { CharacterState, renderCharacter, normalizeAction, normalizeExpression } from '@/lib/studio/characterRig';
import { BackdropId, renderBackdrop, renderBoutiqueCounterAndForeground, renderOverheadSpeechBubble } from '@/lib/studio/backdrops';
import { SkitBeat, SkitTemplate, FourthWallEffect } from '@/lib/studio/skitTemplates';
import { generateRPGAppraisal, renderAppraisalCard, RPGProductAppraisal, getProductById } from '@/lib/studio/rpgAppraisal';
import { playVoiceBlip, playSoundEffect } from '@/lib/studio/audioSynth';

export type AspectRatio = '9:16' | '16:9' | '1:1';

export interface CameraCinematographyState {
  handheldX: number;
  handheldY: number;
  handheldAngle: number;
  zoomScale: number; // 1.0 to 1.35 on punchline / 4th-wall beats
  shakeOffset: { x: number; y: number }; // damped impact shake
  approachT: number; // 0.0 to 1.0 approach progress
  tapImpact: number; // 0.0 to 1.0 screen tap impact
  punchlineZoom: number; // 1.0 to 1.16
  fourthWallZoom: number; // 1.0 to 1.14
  totalCameraZoom: number; // 1.0 to 1.322
  impactDecay: number; // 1.0 to 0.0
  impactShakeX: number;
  impactShakeY: number;
  tapShakeX: number;
  tapShakeY: number;
  totalShakeX: number;
  totalShakeY: number;
  focusX: number;
  focusY: number;
}

/**
 * Pure mathematical calculation of virtual camera cinematography state.
 * Guaranteed safe against negative, NaN, infinite, or out-of-bounds beatProgress.
 */
export function computeCameraCinematography(
  frameCount: number,
  beatProgress: number,
  currentBeat?: SkitBeat,
  fourthWall?: FourthWallEffect,
  VW: number = 270,
  counterY: number = 290
): CameraCinematographyState {
  // 1. Sanitize & clamp input beatProgress to strict [0.0, 1.0] interval
  const safeProgress =
    typeof beatProgress === 'number' && Number.isFinite(beatProgress)
      ? Math.max(0.0, Math.min(1.0, beatProgress))
      : 0.0;

  // 2. Approach interpolation (0 -> 1 over first ~28% of beat)
  // Protected against negative base: approachBase is strictly >= 0.0
  const approachBase = Math.max(0.0, Math.min(1.0, safeProgress * 3.4));
  const approachT = fourthWall ? Math.min(1.0, Math.pow(approachBase, 0.75)) : 0.0;

  // 3. Screen-tap impact pulse (triggers every ~26 frames once character reaches the glass)
  const tapImpact =
    fourthWall === 'screen_tap' && approachT > 0.65 && frameCount % 26 < 5
      ? Math.sin(((frameCount % 26) / 5) * Math.PI)
      : 0.0;

  // 4. Subtle handheld camera float / drift + dynamic reaction Dutch tilt
  const handheldX = Math.sin(frameCount * 0.031) * 1.8 + Math.cos(frameCount * 0.017) * 0.9;
  const handheldY = Math.cos(frameCount * 0.027) * 1.4 + Math.sin(frameCount * 0.019) * 0.7;
  const reactionDutchTilt =
    currentBeat && (currentBeat.expression === 'shocked' || currentBeat.action === 'gasp')
      ? (currentBeat.speaker === 'bonnie' ? -0.011 : 0.011) * Math.sin(safeProgress * Math.PI)
      : 0.0;
  const handheldAngle = Math.sin(frameCount * 0.023) * 0.0035 + reactionDutchTilt;

  // 5. Comedic punch-in zooms (1.08x–1.20x scale) on dialogue, joke, punchline, and escalation beats
  const isPunchlineBeat = Boolean(
    currentBeat &&
      (currentBeat.action === 'laugh' ||
        currentBeat.action === 'gasp' ||
        currentBeat.expression === 'shocked' ||
        currentBeat.expression === 'laughing')
  );
  const isActionFocusBeat = Boolean(
    currentBeat &&
      (currentBeat.action === 'hold trinket' ||
        currentBeat.action === 'sip tea' ||
        currentBeat.expression === 'proud grandma')
  );
  const punchlineZoomTarget = isPunchlineBeat ? 1.18 : isActionFocusBeat ? 1.07 : 1.03;
  const zoomProgress = Math.max(0.0, Math.min(1.0, safeProgress * 2.8));
  const punchlineZoom = 1.0 + (punchlineZoomTarget - 1.0) * zoomProgress;

  const safeApproachT = Number.isFinite(approachT) ? Math.max(0.0, Math.min(1.0, approachT)) : 0.0;
  const fourthWallZoom = fourthWall === 'camera_zoom' ? 1.0 + 0.14 * safeApproachT : 1.0;

  const rawTotalZoom = punchlineZoom * fourthWallZoom;
  const totalCameraZoom =
    Number.isFinite(rawTotalZoom) && rawTotalZoom > 0
      ? Math.max(1.0, Math.min(1.35, rawTotalZoom))
      : 1.0;

  // 6. Physical impact screen shake on 'shocked' or 'laughing' emotional reaction beats
  const isImpactReaction = Boolean(
    currentBeat &&
      (currentBeat.expression === 'shocked' ||
        currentBeat.expression === 'laughing' ||
        currentBeat.action === 'gasp' ||
        currentBeat.action === 'laugh')
  );
  // Clamped strictly to [0.0, 1.0]: starts at 1.0, decays to 0.0 by beatProgress ~0.263
  const impactDecay = isImpactReaction
    ? Math.max(0.0, Math.min(1.0, 1.0 - safeProgress * 3.8))
    : 0.0;
  const impactShakeX = impactDecay > 0 ? Math.sin(frameCount * 1.8) * 3.4 * impactDecay : 0.0;
  const impactShakeY = impactDecay > 0 ? Math.cos(frameCount * 2.2) * 2.6 * impactDecay : 0.0;

  // 7. Tactile glass-knock screen shake
  const tapShakeX = tapImpact > 0 ? (frameCount % 2 === 0 ? 1 : -1) * tapImpact * 2.2 : 0.0;
  const tapShakeY = tapImpact > 0 ? tapImpact * 1.6 : 0.0;

  const totalShakeX = Number.isFinite(tapShakeX + impactShakeX + handheldX)
    ? tapShakeX + impactShakeX + handheldX
    : 0.0;
  const totalShakeY = Number.isFinite(tapShakeY + impactShakeY + handheldY)
    ? tapShakeY + impactShakeY + handheldY
    : 0.0;

  // 8. Dynamic Speaker-Tracking Horizontal Pan & Vertical Framing
  const speakerPanEase = Math.sin(Math.min(1.0, safeProgress * 1.8) * (Math.PI / 2));
  const speakerPanX =
    currentBeat?.speaker === 'bonnie'
      ? -13 * speakerPanEase
      : currentBeat?.speaker === 'tammy'
      ? 13 * speakerPanEase
      : 0;
  const focusX = VW / 2 + speakerPanX;
  const focusY = counterY - 18 - (totalCameraZoom > 1.08 ? 4 * zoomProgress : 0);

  return {
    handheldX,
    handheldY,
    handheldAngle: Number.isFinite(handheldAngle) ? handheldAngle : 0.0,
    zoomScale: totalCameraZoom,
    shakeOffset: { x: tapShakeX + impactShakeX, y: tapShakeY + impactShakeY },
    approachT,
    tapImpact,
    punchlineZoom,
    fourthWallZoom,
    totalCameraZoom,
    impactDecay,
    impactShakeX,
    impactShakeY,
    tapShakeX,
    tapShakeY,
    totalShakeX,
    totalShakeY,
    focusX,
    focusY,
  };
}

export interface StudioCanvasHandle {
  getCanvas: () => HTMLCanvasElement | null;
}

interface StudioCanvasProps {
  aspectRatio: AspectRatio;
  backdropId: BackdropId;
  activeSkit: SkitTemplate | null;
  currentBeatIndex: number;
  beatProgress: number; // 0.0 to 1.0 within active beat
  isPlaying: boolean;
  activePropId?: string;
  onBeatAdvance?: () => void;
}

export const StudioCanvas = forwardRef<StudioCanvasHandle, StudioCanvasProps>(function StudioCanvas(
  {
    aspectRatio,
    backdropId,
    activeSkit,
    currentBeatIndex,
    beatProgress,
    isPlaying: _isPlaying,
    activePropId,
  },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameCountRef = useRef(0);
  const propImagesCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const reactionVideosCacheRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const lastBlipCharRef = useRef(-1);
  const lastBeatIndexRef = useRef(-1);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }));

  // Canvas Resolution Settings
  const dims = useMemo(
    () =>
      aspectRatio === '9:16'
        ? { w: 1080, h: 1920, virtualW: 270, virtualH: 480, scale: 4 }
        : aspectRatio === '16:9'
        ? { w: 1920, h: 1080, virtualW: 480, virtualH: 270, scale: 4 }
        : { w: 1080, h: 1080, virtualW: 360, virtualH: 360, scale: 3 },
    [aspectRatio]
  );

  // Load and cache active prop image
  useEffect(() => {
    const propToLoad = activePropId || activeSkit?.defaultPropId;
    if (propToLoad && !propImagesCacheRef.current.has(propToLoad)) {
      const product = getProductById(propToLoad);
      if (product && product.transparentLocalUrl) {
        const img = new Image();
        img.src = product.transparentLocalUrl;
        img.onload = () => {
          propImagesCacheRef.current.set(propToLoad, img);
        };
      }
    }
  }, [activePropId, activeSkit]);

  // Play beat sound effect when beat changes
  useEffect(() => {
    if (!activeSkit || !activeSkit.beats[currentBeatIndex]) return;
    if (lastBeatIndexRef.current !== currentBeatIndex) {
      lastBeatIndexRef.current = currentBeatIndex;
      lastBlipCharRef.current = -1;
      const beat = activeSkit.beats[currentBeatIndex];
      if (beat.soundEffect) {
        playSoundEffect(beat.soundEffect);
      }
    }
  }, [activeSkit, currentBeatIndex]);

  // Main 60fps Render Loop
  useEffect(() => {
    let animId: number;

    const render = () => {
      frameCountRef.current++;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Enable crisp pixelated rendering
      ctx.imageSmoothingEnabled = false;

      const VW = dims.virtualW;
      const VH = dims.virtualH;
      const S = dims.scale;

      // Clear Canvas
      ctx.clearRect(0, 0, dims.w, dims.h);

      // Save base transform for pixel scaling
      ctx.save();
      ctx.scale(S, S);

      const counterY = aspectRatio === '9:16' ? 290 : aspectRatio === '1:1' ? 220 : 160;

      // Active Beat & Characters
      const currentBeat: SkitBeat | undefined = activeSkit?.beats[currentBeatIndex];
      const speaker = currentBeat?.speaker || 'bonnie';
      const isSpeakingBonnie = Boolean(currentBeat && speaker === 'bonnie');
      const isSpeakingTammy = Boolean(currentBeat && speaker === 'tammy');
      const fourthWall = currentBeat?.fourthWallEffect;

      // Sanitize input progress for all subsequent canvas operations
      const safeProgress =
        typeof beatProgress === 'number' && Number.isFinite(beatProgress)
          ? Math.max(0.0, Math.min(1.0, beatProgress))
          : 0.0;

      // Dynamic Virtual Cinematography (F9)
      const cameraState = computeCameraCinematography(
        frameCountRef.current,
        safeProgress,
        currentBeat,
        fourthWall,
        VW,
        counterY
      );

      const {
        approachT,
        tapImpact,
        handheldAngle,
        totalCameraZoom,
        totalShakeX,
        totalShakeY,
        focusX,
        focusY,
      } = cameraState;

      ctx.save();
      // Apply coordinate transformations
      ctx.translate(focusX + totalShakeX, focusY + totalShakeY);
      ctx.rotate(handheldAngle);
      if (totalCameraZoom !== 1.0 && Number.isFinite(totalCameraZoom) && totalCameraZoom > 0) {
        ctx.scale(totalCameraZoom, totalCameraZoom);
      }
      ctx.translate(-focusX, -focusY);

      // 1. Render Procedural Backdrop
      renderBackdrop(ctx, backdropId, VW, VH, counterY, frameCountRef.current);

      // 2. Character Setup & Placement (with lively walk sway & listener nod)
      const bonnieAction = currentBeat && isSpeakingBonnie ? normalizeAction(currentBeat.action) : 'idle';
      const bonnieExpr = currentBeat && isSpeakingBonnie ? normalizeExpression(currentBeat.expression) : 'happy';

      const tammyAction = currentBeat && isSpeakingTammy ? normalizeAction(currentBeat.action) : 'idle';
      const tammyExpr = currentBeat && isSpeakingTammy ? normalizeExpression(currentBeat.expression) : 'happy';

      const bonnieStroll = isSpeakingBonnie
        ? Math.sin(safeProgress * Math.PI) * 8
        : Math.sin(frameCountRef.current * 0.032) * 11;
      const tammyStroll = isSpeakingTammy
        ? -Math.sin(safeProgress * Math.PI) * 8
        : Math.cos(frameCountRef.current * 0.028) * 11;

      const bonnieWalkDrift = bonnieAction === 'walk' ? Math.sin(safeProgress * Math.PI * 2) * 14 : bonnieStroll;
      const tammyWalkDrift = tammyAction === 'walk' ? Math.sin(safeProgress * Math.PI * 2) * 14 : tammyStroll;

      const bonnieTalkHop = isSpeakingBonnie ? -Math.abs(Math.sin(frameCountRef.current * 0.26)) * 2.2 : Math.sin(frameCountRef.current * 0.08) * 0.8;
      const tammyTalkHop = isSpeakingTammy ? -Math.abs(Math.sin(frameCountRef.current * 0.26)) * 2.2 : Math.cos(frameCountRef.current * 0.08) * 0.8;

      const bonnieX = (aspectRatio === '9:16' ? Math.floor(VW / 2) - 62 : Math.floor(VW / 2) - 60) + Math.round(bonnieWalkDrift);
      const bonnieY = counterY - 40 + Math.round(bonnieTalkHop);

      const tammyX = (aspectRatio === '9:16' ? Math.floor(VW / 2) + 38 : Math.floor(VW / 2) + 40) + Math.round(tammyWalkDrift);
      const tammyY = counterY - 34 + Math.round(tammyTalkHop);

      const featuredPropId = currentBeat?.propId || activePropId || activeSkit?.defaultPropId;

      // Determine if speaking character steps out IN FRONT of the counter to approach the viewer's screen
      const bonnieInForeground = Boolean(fourthWall && isSpeakingBonnie);
      const tammyInForeground = Boolean(fourthWall && isSpeakingTammy);

      const bonnieState: CharacterState = {
        id: 'bonnie',
        x: bonnieX,
        y: bonnieY,
        facing: fourthWall ? 'front' : 'right',
        action: bonnieInForeground && approachT < 0.65 ? 'walk' : bonnieAction,
        expression: bonnieExpr,
        animFrame: frameCountRef.current,
        isSpeaking: isSpeakingBonnie,
      };

      const tammyState: CharacterState = {
        id: 'tammy',
        x: tammyX,
        y: tammyY,
        facing: fourthWall ? 'front' : 'left',
        action: tammyInForeground && approachT < 0.65 ? 'walk' : tammyAction,
        expression: tammyExpr,
        animFrame: frameCountRef.current,
        isSpeaking: isSpeakingTammy,
      };

      // 3. Render Characters who remain behind the counter
      if (!bonnieInForeground) {
        renderCharacter(ctx, bonnieState, undefined, frameCountRef.current, propImagesCacheRef.current);
      }
      if (!tammyInForeground) {
        renderCharacter(ctx, tammyState, undefined, frameCountRef.current, propImagesCacheRef.current);
      }

      // 4. Recessed Wood-Paneled Mahogany Counter, Flickering Candle, Steaming Kettle, Bubbling Flask & Woven Floor Rug
      const { runnerX, runnerW } = renderBoutiqueCounterAndForeground(
        ctx,
        backdropId,
        VW,
        VH,
        counterY,
        frameCountRef.current
      );

      // 5. Product Prop Display on Counter
      if (featuredPropId) {
        renderCounterPropShowcase(
          ctx,
          featuredPropId,
          runnerX + Math.floor(runnerW / 2),
          counterY - 10,
          frameCountRef.current,
          propImagesCacheRef.current
        );
      }

      // 5a. In-Scene Overhead Pixel Speech Bubble (Inkwell & Alembic style)
      if (currentBeat?.dialogue && !bonnieInForeground && !tammyInForeground) {
        const spk = isSpeakingBonnie ? 'bonnie' : 'tammy';
        const spkX = isSpeakingBonnie ? bonnieX : tammyX;
        const spkY = isSpeakingBonnie ? bonnieY : tammyY;
        renderOverheadSpeechBubble(ctx, spk, currentBeat.dialogue, spkX, spkY, safeProgress, VW);
      }

      // 5b. Render Foreground 4th-Wall Character Walking Right Up to the User's Screen!
      if (bonnieInForeground || tammyInForeground) {
        const fgState = bonnieInForeground ? bonnieState : tammyState;
        const targetScale =
          fourthWall === 'screen_tap'
            ? 2.35
            : fourthWall === 'pause_bait'
            ? 2.05
            : fourthWall === 'camera_zoom'
            ? 1.9
            : 1.75;
        const safeApproachT = Number.isFinite(approachT) ? Math.max(0.0, Math.min(1.0, approachT)) : 0.0;
        const curScale = 1 + (targetScale - 1) * safeApproachT;

        // Walk from counter position to dead-center close-up right above the dialogue box
        const startCenterX = fgState.x + 14;
        const startTopY = fgState.y;
        const endCenterX = Math.floor(VW / 2) + (bonnieInForeground ? -10 : 10);
        const endTopY =
          fourthWall === 'subtitle_peek'
            ? counterY - 18
            : counterY - 26;

        const walkBob = safeApproachT < 0.75 ? Math.abs(Math.sin(frameCountRef.current * 0.45)) * 4 : Math.sin(frameCountRef.current * 0.18) * 1.5;
        const curCenterX = startCenterX + (endCenterX - startCenterX) * safeApproachT;
        const curTopY = startTopY + (endTopY - startTopY) * safeApproachT - walkBob;

        // Subtle atmospheric vignette behind the close-up character so they pop off the screen
        ctx.fillStyle = `rgba(10, 5, 20, ${0.28 * safeApproachT})`;
        ctx.fillRect(0, 0, VW, VH);

        ctx.save();
        ctx.translate(curCenterX, curTopY + 20);
        if (Number.isFinite(curScale) && curScale > 0) {
          ctx.scale(curScale, curScale);
        }
        ctx.translate(-14, -20);

        renderCharacter(
          ctx,
          {
            ...fgState,
            x: 0,
            y: 0,
          },
          undefined,
          frameCountRef.current,
          propImagesCacheRef.current
        );
        ctx.restore();
      }

      ctx.restore();

      // 5c. 4th-Wall Break Screen Effects (Glass Knock Hand, Shockwave Ripples, Breath Fog, Subtitle Peek, Pause Bait)
      if (fourthWall) {
        renderFourthWallOverlay(
          ctx,
          fourthWall,
          speaker,
          bonnieX,
          tammyX,
          counterY,
          VW,
          VH,
          aspectRatio,
          frameCountRef.current,
          approachT,
          tapImpact
        );
      }

      // 6. RPG Item Appraisal Parchment Card (if active) or Nat Geo Wildlife Monitor
      if (currentBeat?.natGeoScene) {
        const tvW = Math.min(228, VW - 26);
        const tvH = 148;
        const tvX = Math.floor((VW - tvW) / 2);
        const tvY = aspectRatio === '9:16' ? 28 : 12;
        renderNatGeoMonitor(
          ctx,
          currentBeat.natGeoScene,
          tvX,
          tvY,
          tvW,
          tvH,
          frameCountRef.current,
          reactionVideosCacheRef.current
        );
      } else if (currentBeat?.showAppraisalCard && featuredPropId) {
        const appraisal: RPGProductAppraisal = generateRPGAppraisal(featuredPropId);
        const cardW = Math.min(220, VW - 30);
        const cardH = 186;
        const cardX = Math.floor((VW - cardW) / 2);
        const cardY = aspectRatio === '9:16' ? 24 : 12;
        const cachedImg = propImagesCacheRef.current.get(featuredPropId);

        renderAppraisalCard(ctx, appraisal, cardX, cardY, cardW, cardH, frameCountRef.current, cachedImg);
      }

      // 7. Burnt-In Synchronized Social Captions
      if (currentBeat) {
        renderBurntInCaptions(
          ctx,
          currentBeat,
          safeProgress,
          VW,
          VH,
          aspectRatio,
          frameCountRef.current,
          lastBlipCharRef
        );
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [aspectRatio, backdropId, activeSkit, currentBeatIndex, beatProgress, dims, activePropId]);

  return (
    <div className="relative flex items-center justify-center w-full h-full bg-stone-950 p-2 sm:p-4 select-none overflow-hidden">
      <canvas
        ref={canvasRef}
        width={dims.w}
        height={dims.h}
        className="max-h-[78vh] w-auto object-contain shadow-2xl rounded-2xl border border-rose-500/30"
        style={{
          imageRendering: 'pixelated',
          aspectRatio: aspectRatio === '9:16' ? '9/16' : aspectRatio === '16:9' ? '16/9' : '1/1',
        }}
      />
    </div>
  );
});

/**
 * Render floating product prop on the mahogany counter
 */
function renderCounterPropShowcase(
  ctx: CanvasRenderingContext2D,
  propId: string,
  centerX: number,
  baseY: number,
  frameCount: number,
  propCache: Map<string, HTMLImageElement>
): void {
  const floatOffset = Math.sin(frameCount * 0.08) * 3;
  const py = baseY + floatOffset;
  const propImg = propCache.get(propId);

  // Soft Golden Halo Glow
  ctx.save();
  const rad = ctx.createRadialGradient(centerX, py, 2, centerX, py, 26);
  rad.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
  rad.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = rad;
  ctx.fillRect(centerX - 30, py - 30, 60, 60);
  ctx.restore();

  if (propImg && propImg.complete && propImg.naturalWidth > 0) {
    const size = 38;
    ctx.drawImage(propImg, centerX - Math.floor(size / 2), py - Math.floor(size / 2), size, size);
  } else {
    // Procedural glowing jewel charm
    ctx.fillStyle = '#e8748a';
    ctx.fillRect(centerX - 8, py - 8, 16, 16);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(centerX - 4, py - 4, 8, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(centerX - 2, py - 6, 4, 4);
  }

  // Floating Sparkles
  ctx.fillStyle = '#fef08a';
  const sparkY = py - 16 + Math.sin(frameCount * 0.15) * 4;
  ctx.fillRect(centerX - 16, sparkY, 2, 2);
  ctx.fillRect(centerX + 14, sparkY + 4, 2, 2);
}

/**
 * Ensures a character boundary does not split a UTF-16 surrogate pair.
 * If targetCount lands between a high surrogate (0xD800-0xDBFF) and low surrogate (0xDC00-0xDFFF),
 * it advances targetCount by 1 to include the complete surrogate pair.
 *
 * Performance: O(1) integer arithmetic and single charCodeAt check (0 heap allocations).
 * Execution time: ~0.000035ms per call (negligible overhead on 60fps canvas loop).
 */
export function getSurrogateSafeLength(str: string, targetCount: number): number {
  if (targetCount <= 0) return 0;
  if (targetCount >= str.length) return str.length;
  const lastCode = str.charCodeAt(targetCount - 1);
  return (lastCode >= 0xd800 && lastCode <= 0xdbff) ? targetCount + 1 : targetCount;
}

/**
 * Render Burnt-In Synchronized Animated Dialogue Captions
 * Positioned in social safe zones with high contrast and speaker attribution
 */
function renderBurntInCaptions(
  ctx: CanvasRenderingContext2D,
  beat: SkitBeat,
  progress: number,
  VW: number,
  VH: number,
  aspectRatio: AspectRatio,
  frameCount: number,
  lastBlipRef: React.MutableRefObject<number>
): void {
  const safeProgress =
    typeof progress === 'number' && Number.isFinite(progress)
      ? Math.max(0.0, Math.min(1.0, progress))
      : 0.0;
  const fullText = beat.dialogue;
  const rawCharCount = Math.floor(fullText.length * Math.min(1.0, safeProgress * 1.25));
  const charCount = getSurrogateSafeLength(fullText, rawCharCount);

  // Play voice blips on character advancement
  if (charCount > lastBlipRef.current) {
    if (charCount % 2 === 0 && charCount < fullText.length) {
      playVoiceBlip(beat.speaker);
    }
    lastBlipRef.current = charCount;
  }

  // Position dialogue box in TikTok/Reels Safe Zones
  const boxW = Math.min(VW - 24, 340);
  const boxH = aspectRatio === '9:16' ? 72 : 54;
  const boxX = Math.floor((VW - boxW) / 2);

  // Vertical placement: avoids TikTok bottom controls & top bars
  const boxY =
    aspectRatio === '9:16'
      ? Math.floor(VH * 0.72) // Safe upper-lower zone
      : aspectRatio === '1:1'
      ? Math.floor(VH * 0.68)
      : Math.floor(VH * 0.64);

  // Dynamic entry pop animation on dialogue line transition
  const entryProgress = Math.min(1.0, safeProgress * 4.0);
  const entryPopScale = 1.0 + 0.08 * Math.sin(entryProgress * Math.PI) * (1.0 - entryProgress);
  const safePopScale = Number.isFinite(entryPopScale) && entryPopScale > 0 ? entryPopScale : 1.0;

  ctx.save();
  const boxCenterX = boxX + Math.floor(boxW / 2);
  const boxCenterY = boxY + Math.floor(boxH / 2);
  ctx.translate(boxCenterX, boxCenterY);
  if (safePopScale !== 1.0) {
    ctx.scale(safePopScale, safePopScale);
  }
  ctx.translate(-boxCenterX, -boxCenterY);

  // 1. Drop Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(boxX + 2, boxY + 2, boxW, boxH);

  // 2. High-Contrast Retro Indigo Bubble
  ctx.fillStyle = 'rgba(15, 10, 26, 0.94)';
  ctx.fillRect(boxX, boxY, boxW, boxH);

  // 3. Double Border (Rose Velvet & Vintage Cream)
  ctx.fillStyle = '#e8748a';
  ctx.fillRect(boxX, boxY, boxW, 2);
  ctx.fillRect(boxX, boxY + boxH - 2, boxW, 2);
  ctx.fillRect(boxX, boxY, 2, boxH);
  ctx.fillRect(boxX + boxW - 2, boxY, 2, boxH);

  ctx.fillStyle = '#f5efe6';
  ctx.fillRect(boxX + 3, boxY + 3, boxW - 6, 1);
  ctx.fillRect(boxX + 3, boxY + boxH - 4, boxW - 6, 1);
  ctx.fillRect(boxX + 3, boxY + 3, 1, boxH - 6);
  ctx.fillRect(boxX + boxW - 4, boxY + 3, 1, boxH - 6);

  // 4. Speaker Nametag Badge
  const speakerName =
    beat.speaker === 'bonnie'
      ? '👵 BONNIE'
      : beat.speaker === 'tammy'
      ? '✨ TAMMY'
      : '✦ NARRATOR';
  const speakerColor =
    beat.speaker === 'bonnie'
      ? '#f43f5e'
      : beat.speaker === 'tammy'
      ? '#0d9488'
      : '#7c3aed';

  ctx.fillStyle = speakerColor;
  ctx.fillRect(boxX + 12, boxY - 8, 80, 13);
  ctx.font = 'bold 8px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText(speakerName, boxX + 16, boxY + 1);

  // 5. Typewriter Dialogue Text with Auto-Wrapping and Word-Level Active Karaoke Highlighting
  ctx.font = 'bold 8px monospace';
  const maxTextWidth = boxW - 24;
  const wrappedLines = wrapText(ctx, fullText, maxTextWidth);

  // Calculate total words and active word index for karaoke highlighting
  const allWords = fullText.split(/\s+/).filter(Boolean);
  const totalWords = allWords.length;
  const activeWordIndex =
    totalWords > 0
      ? Math.min(totalWords - 1, Math.floor(safeProgress * 1.25 * totalWords))
      : -1;

  // Pre-map wrapped lines with exact word token and character offset metadata
  let globalCharOffset = 0;
  let globalWordCount = 0;
  const parsedLines = wrappedLines.map((line, lineIdx) => {
    const lineWords = line.split(/\s+/).filter(Boolean);
    const words = lineWords.map((word) => {
      const charStart = fullText.indexOf(word, globalCharOffset);
      const effectiveCharStart = charStart !== -1 ? charStart : globalCharOffset;
      globalCharOffset = effectiveCharStart + word.length;
      return {
        word,
        globalWordIndex: globalWordCount++,
        charStart: effectiveCharStart,
      };
    });
    return {
      lineIndex: lineIdx,
      lineText: line,
      words,
    };
  });

  // Identify active line containing activeWordIndex
  let activeLineIndex = 0;
  for (const pl of parsedLines) {
    if (pl.words.some((w) => w.globalWordIndex === activeWordIndex)) {
      activeLineIndex = pl.lineIndex;
      break;
    }
  }

  // 3-Line Sliding Window: centers the active line vertically (Row 1) once past line 0
  const MAX_VISIBLE_LINES = 3;
  const startLineIndex = Math.max(
    0,
    Math.min(Math.max(0, parsedLines.length - MAX_VISIBLE_LINES), activeLineIndex - 1)
  );
  const visibleLines = parsedLines.slice(startLineIndex, startLineIndex + MAX_VISIBLE_LINES);

  // Cursor tracking strictly inside the 3-line dialogue box
  const activeRowIndex = Math.max(0, Math.min(MAX_VISIBLE_LINES - 1, activeLineIndex - startLineIndex));
  let cursorX = boxX + 12;
  let cursorY = boxY + 17 + activeRowIndex * 13;

  visibleLines.forEach((pl, rowIdx) => {
    const lineY = boxY + 17 + rowIdx * 13;
    let currentX = boxX + 12;

    for (const w of pl.words) {
      const { word, globalWordIndex: currentWordIndex, charStart: wordStart } = w;

      // Typewriter boundary check
      if (wordStart >= charCount) continue;

      const isPartial = wordStart + word.length > charCount;
      let displayWord = word;
      if (isPartial) {
        const targetSlice = Math.max(0, charCount - wordStart);
        const safeSlice = getSurrogateSafeLength(word, targetSlice);
        displayWord = word.slice(0, safeSlice);
      }
      const wordW = ctx.measureText(displayWord).width;
      const spaceW = ctx.measureText(' ').width;

      const isCurrentActiveWord = currentWordIndex === activeWordIndex;

      if (isCurrentActiveWord) {
        // Active word-level karaoke gold highlight glow
        ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
        ctx.fillRect(currentX - 1, lineY - 8, wordW + 2, 10);
        // Karaoke gold shadow & text
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillText(displayWord, currentX + 1, lineY + 1);
        ctx.fillStyle = '#fbbf24'; // Active word gold highlight
        ctx.fillText(displayWord, currentX, lineY);
      } else {
        // Soft drop shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillText(displayWord, currentX + 1, lineY + 1);
        // Spoken or upcoming cream foreground
        ctx.fillStyle = currentWordIndex < activeWordIndex ? '#f5efe6' : 'rgba(245, 239, 230, 0.7)';
        ctx.fillText(displayWord, currentX, lineY);
      }

      currentX += wordW + spaceW;

      // Update cursor position if rendering on active line
      if (pl.lineIndex === activeLineIndex) {
        cursorX = currentX - spaceW + 2;
        cursorY = lineY;
      }
    }
  });

  // Animated Cursor Indicator while typing
  if (charCount < fullText.length && frameCount % 30 < 15) {
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(cursorX, cursorY - 6, 4, 8);
  }

  ctx.restore();
}

/**
 * Text Wrapping Utility
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Render 4th-Wall Break Screen Effects (Screen Tap Ripples, Subtitle Peek, Camera Zoom HUD, Pause Bait)
 */
function renderFourthWallOverlay(
  ctx: CanvasRenderingContext2D,
  effect: FourthWallEffect,
  speaker: string,
  bonnieX: number,
  tammyX: number,
  counterY: number,
  VW: number,
  VH: number,
  aspectRatio: AspectRatio,
  frameCount: number,
  approachT: number = 1,
  tapImpact: number = 0
): void {
  ctx.save();
  const isBonnie = speaker !== 'tammy';
  const startX = isBonnie ? bonnieX + 14 : tammyX + 12;
  const endX = Math.floor(VW / 2) + (isBonnie ? -10 : 10);
  const actorCenterX = startX + (endX - startX) * approachT;
  const actorCenterY = counterY - 12;

  if (effect === 'screen_tap') {
    const knockX = actorCenterX + (isBonnie ? 18 : -18);
    const knockY = actorCenterY + 6;

    // 1. Warm Breath Condensation Fog on the Inside of the Glass when close up
    if (approachT > 0.5) {
      const fogAlpha = 0.14 * approachT * (0.75 + 0.25 * Math.sin(frameCount * 0.1));
      ctx.fillStyle = `rgba(255, 255, 255, ${fogAlpha})`;
      ctx.beginPath();
      ctx.ellipse(actorCenterX, actorCenterY - 4, 28 * approachT, 18 * approachT, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Animated Foreground Pixel Hand Reaching Out to Knock on the Glass
    if (approachT > 0.45) {
      const tapCycle = Math.sin(frameCount * 0.48);
      const handScale = 1 + Math.max(0, tapCycle) * 0.35;
      const hx = knockX - Math.floor(6 * handScale);
      const hy = knockY - Math.floor(6 * handScale) - Math.floor(tapCycle * 3);

      // Sleeve cuff
      ctx.fillStyle = isBonnie ? '#7a1c3a' : '#0d9488';
      ctx.fillRect(hx + 1, hy + 8, Math.floor(10 * handScale), Math.floor(6 * handScale));
      // Pixel knocking knuckles
      ctx.fillStyle = '#fde2c4';
      ctx.fillRect(hx, hy, Math.floor(12 * handScale), Math.floor(10 * handScale));
      ctx.strokeStyle = '#4c0519';
      ctx.lineWidth = 1;
      ctx.strokeRect(hx, hy, Math.floor(12 * handScale), Math.floor(10 * handScale));
    }

    // 3. Expanding Concentric Glass-Tap Shockwave Rings
    const phase = (frameCount % 32) / 32;
    const r1 = 6 + phase * 36;
    const r2 = 6 + ((phase + 0.5) % 1) * 36;

    ctx.strokeStyle = `rgba(251, 191, 36, ${(1 - phase) * 0.95})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(knockX, knockY, r1, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(244, 114, 182, ${(1 - ((phase + 0.5) % 1)) * 0.9})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(knockX, knockY, r2, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Impact Starburst & Floating "*KNOCK* *TAP*" Badge
    if (tapImpact > 0.1) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(knockX - 14, knockY - 12, 4, 4);
      ctx.fillRect(knockX + 12, knockY - 10, 4, 4);
      ctx.fillRect(knockX + 10, knockY + 10, 3, 3);
    }

    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#0f0a1a';
    ctx.fillText('*TAP* *TAP*', knockX - 27, knockY - 21 - Math.sin(frameCount * 0.25) * 3);
    ctx.fillStyle = '#fef08a';
    ctx.fillText('*TAP* *TAP*', knockX - 28, knockY - 22 - Math.sin(frameCount * 0.25) * 3);
  } else if (effect === 'subtitle_peek') {
    // Animated arrow & poking hand pointing down at the RPG subtitle box
    const boxY = aspectRatio === '9:16' ? Math.floor(VH * 0.72) : aspectRatio === '1:1' ? Math.floor(VH * 0.68) : Math.floor(VH * 0.64);
    const bounce = Math.sin(frameCount * 0.28) * 4;
    const arrowY = boxY - 14 + bounce;

    ctx.fillStyle = '#0f0a1a';
    ctx.font = 'bold 8px monospace';
    ctx.fillText('▼ LOOK AT SUBTITLES ▼', Math.floor(VW / 2) - 49, arrowY + 1);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('▼ LOOK AT SUBTITLES ▼', Math.floor(VW / 2) - 50, arrowY);
  } else if (effect === 'pause_bait') {
    // Retro blinking Pause Challenge badge in top safe zone
    const badgeW = 158;
    const badgeH = 20;
    const badgeX = Math.floor((VW - badgeW) / 2);
    const badgeY = aspectRatio === '9:16' ? 28 : 14;

    ctx.fillStyle = 'rgba(15, 10, 26, 0.94)';
    ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

    if (frameCount % 26 < 20) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('⏸ TAP TO PAUSE CHALLENGE', badgeX + 12, badgeY + 13);
    }
  } else if (effect === 'camera_zoom') {
    // Retro 4th-wall REC frame corners + "CLOSE-UP WHISPER" indicator
    const pad = 12;
    const len = 12;
    ctx.strokeStyle = 'rgba(244, 114, 182, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad, pad + len);
    ctx.lineTo(pad, pad);
    ctx.lineTo(pad + len, pad);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(VW - pad - len, pad);
    ctx.lineTo(VW - pad, pad);
    ctx.lineTo(VW - pad, pad + len);
    ctx.stroke();

    ctx.fillStyle = 'rgba(244, 114, 182, 0.9)';
    ctx.font = 'bold 7px monospace';
    ctx.fillText('● 4TH-WALL CLOSE-UP', pad + 6, pad + 10);
  }

  ctx.restore();
}

const REACTION_CLIP_MAP: Record<string, string> = {
  studio_makeover_spruce: '/reaction-clips/studio_makeover_spruce.mp4',
  cake_decorating_icing: '/reaction-clips/cake_decorating_icing.mp4',
  blacksmith_sparks: '/reaction-clips/blacksmith_sparks.mp4',
  woodturning_lathe: '/reaction-clips/woodturning_lathe.mp4',
  northern_lights_aurora: '/reaction-clips/northern_lights_aurora.mp4',
  domino_chain_fall: '/reaction-clips/domino_chain_fall.mp4',
  neon_tokyo_rain: '/reaction-clips/neon_tokyo_rain.mp4',
  hummingbird_hover: '/reaction-clips/hummingbird_hover.mp4',
  honey_badger: '/reaction-clips/savanna_meerkat.mp4',
  savanna_meerkat: '/reaction-clips/savanna_meerkat.mp4',
  capybara_spa: '/reaction-clips/baby_capybaras.mp4',
  baby_capybaras: '/reaction-clips/baby_capybaras.mp4',
  anglerfish: '/reaction-clips/phantom_jellyfish.mp4',
  phantom_jellyfish: '/reaction-clips/phantom_jellyfish.mp4',
  mantis_shrimp: '/reaction-clips/hermit_crab.mp4',
  hermit_crab: '/reaction-clips/hermit_crab.mp4',
  penguin_heist: '/reaction-clips/penguins_slowmo.mp4',
  penguins_slowmo: '/reaction-clips/penguins_slowmo.mp4',
  octopus_architect: '/reaction-clips/octopus_observatory.mp4',
  octopus_observatory: '/reaction-clips/octopus_observatory.mp4',
  chameleon_glow: '/reaction-clips/chameleon_glow.mp4',
  red_panda_snack: '/reaction-clips/red_panda_snack.mp4',
  sea_otter_drift: '/reaction-clips/sea_otter_drift.mp4',
  curious_owl: '/reaction-clips/curious_owl.mp4',
  pottery_wheel_spin: '/reaction-clips/pottery_wheel_spin.mp4',
  glassblowing_lava: '/reaction-clips/glassblowing_lava.mp4',
  skateboarding_tricks: '/reaction-clips/skateboarding_tricks.mp4',
  roller_coaster_pov: '/reaction-clips/roller_coaster_pov.mp4',
  espresso_latte_art: '/reaction-clips/espresso_latte_art.mp4',
  lava_flow_volcano: '/reaction-clips/lava_flow_volcano.mp4',
  fireworks_finale: '/reaction-clips/fireworks_finale.mp4',
  campfire_marshmallows: '/reaction-clips/campfire_marshmallows.mp4',
  cat_playing_box: '/reaction-clips/cat_playing_box.mp4',
};

/**
 * Retro CRT Wildlife Monitor ("NAT GEO WILD • CH 42")
 * Renders real live-action .mp4 reaction clips (or procedural pixel-art fallback) above Bonnie & Tammy's counter
 */
function renderNatGeoMonitor(
  ctx: CanvasRenderingContext2D,
  scene: string,
  x: number,
  y: number,
  w: number,
  h: number,
  frameCount: number,
  videoCache?: Map<string, HTMLVideoElement>
): void {
  ctx.save();

  // Dynamic CRT Monitor Radial Glow & Volumetric Light Shafts
  // Projects scene-specific chromaticity cone downwards onto shop wall and mahogany counter
  const glowCenterX = x + Math.floor(w / 2);
  const glowBottomY = y + h;
  let crtColor = 'rgba(6, 182, 212, '; // default deep-sea cyan
  if (scene.includes('meerkat') || scene.includes('honey_badger') || scene.includes('capybara') || scene.includes('woodturning')) {
    crtColor = 'rgba(245, 158, 11, ';
  } else if (scene.includes('penguin') || scene.includes('coaster')) {
    crtColor = 'rgba(147, 197, 253, ';
  } else if (scene.includes('crab') || scene.includes('mantis_shrimp') || scene.includes('aurora') || scene.includes('hummingbird')) {
    crtColor = 'rgba(20, 184, 166, ';
  } else if (scene.includes('chameleon') || scene.includes('spruce') || scene.includes('cake')) {
    crtColor = `hsla(${(frameCount * 2) % 360}, 85%, 65%, `;
  } else if (scene.includes('red_panda') || scene.includes('lava') || scene.includes('blacksmith') || scene.includes('campfire')) {
    crtColor = 'rgba(249, 115, 22, ';
  } else if (scene.includes('owl') || scene.includes('neon') || scene.includes('fireworks')) {
    crtColor = 'rgba(139, 92, 246, ';
  }
  const crtPulse = 0.18 + 0.05 * Math.sin(frameCount * 0.14);
  const glowGrad = ctx.createRadialGradient(glowCenterX, glowBottomY, 10, glowCenterX, glowBottomY + 90, 140);
  glowGrad.addColorStop(0, `${crtColor}${crtPulse * 1.6})`);
  glowGrad.addColorStop(0.5, `${crtColor}${crtPulse * 0.7})`);
  glowGrad.addColorStop(1, `${crtColor}0)`);
  ctx.fillStyle = glowGrad;
  ctx.fillRect(glowCenterX - 140, glowBottomY, 280, 110);

  // Diagonal Volumetric Studio Light Beams from TV Bottom Edge
  ctx.fillStyle = `${crtColor}${(crtPulse * 0.35).toFixed(3)})`;
  ctx.beginPath();
  ctx.moveTo(x + 8, glowBottomY);
  ctx.lineTo(x + w - 8, glowBottomY);
  ctx.lineTo(x + w + 24, glowBottomY + 76);
  ctx.lineTo(x - 24, glowBottomY + 76);
  ctx.closePath();
  ctx.fill();

  // Ceiling mount cables & brass brackets
  ctx.fillStyle = '#27272a';
  ctx.fillRect(x + 26, 0, 4, y);
  ctx.fillRect(x + w - 30, 0, 4, y);
  ctx.fillStyle = '#d97706';
  ctx.fillRect(x + 24, y - 6, 8, 4);
  ctx.fillRect(x + w - 32, y - 6, 8, 4);

  // Outer Vintage Wood & Brass CRT Casing
  ctx.fillStyle = '#3f2314';
  ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);

  const sx = x + 6;
  const sy = y + 6;
  const sw = w - 12;
  const sh = h - 24;

  // Try real live-action .mp4 reaction clip first (with dynamic Ken Burns zoom/pan)
  let drewVideo = false;
  if (videoCache && typeof document !== 'undefined') {
    let vid = videoCache.get(scene);
    if (!vid) {
      vid = document.createElement('video');
      vid.src = REACTION_CLIP_MAP[scene] || `/reaction-clips/${scene}.mp4`;
      vid.muted = true;
      vid.loop = true;
      vid.playsInline = true;
      vid.autoplay = true;
      vid.play().catch(() => {});
      videoCache.set(scene, vid);
    }
    if (vid.readyState >= 2 && vid.videoWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx, sy, sw, sh);
      ctx.clip();
      ctx.imageSmoothingEnabled = true;
      const vidZoom = 1.05 + 0.04 * Math.sin(frameCount * 0.025);
      const vidPanX = Math.sin(frameCount * 0.018) * 5;
      const vidPanY = Math.cos(frameCount * 0.022) * 3;
      const cx = sx + sw / 2 + vidPanX;
      const cy = sy + sh / 2 + vidPanY;
      ctx.translate(cx, cy);
      ctx.scale(vidZoom, vidZoom);
      ctx.drawImage(vid, -sw / 2, -sh / 2, sw, sh);
      ctx.restore();
      drewVideo = true;
    }
  }

  // Scene-specific animated wildlife viewport fallback
  if (!drewVideo) {
    if (scene === 'honey_badger') {
      // Savanna sunset + fearless honey badger vs cobra
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(sx, sy + sh - 34, sw, 34);
      const hop = Math.abs(Math.sin(frameCount * 0.25)) * 6;
      // Honey Badger (black body + white stripe)
      const bx = sx + 52 + Math.sin(frameCount * 0.12) * 10;
      const by = sy + sh - 46 - hop;
      ctx.fillStyle = '#18181b';
      ctx.fillRect(bx, by, 38, 18);
      ctx.fillStyle = '#f4f4f5';
      ctx.fillRect(bx, by, 38, 6);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(bx + 32, by + 4, 4, 4);
      // King Cobra swaying on right
      const cx = sx + sw - 58;
      const sway = Math.sin(frameCount * 0.2) * 5;
      ctx.fillStyle = '#65a30d';
      ctx.fillRect(cx + sway, sy + sh - 62, 12, 34);
      ctx.fillRect(cx + sway - 6, sy + sh - 64, 24, 12);
    } else if (scene === 'capybara_spa') {
      // Steamy Japanese hot spring + capybara with yuzu orange on head
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(sx, sy + sh - 36, sw, 36);
      const bob = Math.sin(frameCount * 0.1) * 2;
      const cx = sx + Math.floor(sw / 2) - 22;
      const cy = sy + sh - 54 + bob;
      // Capybara body & peaceful closed eyes
      ctx.fillStyle = '#92400e';
      ctx.fillRect(cx, cy, 44, 28);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(cx + 28, cy - 8, 22, 20);
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(cx + 38, cy - 2, 6, 2);
      // Orange on head!
      ctx.fillStyle = '#f97316';
      ctx.fillRect(cx + 33, cy - 16, 10, 8);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(cx + 37, cy - 18, 4, 3);
    } else if (scene === 'anglerfish') {
      // Abyssal midnight zone + glowing bioluminescent lure
      ctx.fillStyle = '#020617';
      ctx.fillRect(sx, sy, sw, sh);
      const fx = sx + Math.floor(sw / 2) - 24 + Math.sin(frameCount * 0.08) * 8;
      const fy = sy + Math.floor(sh / 2) - 10;
      ctx.fillStyle = '#312e81';
      ctx.fillRect(fx, fy, 42, 28);
      // Glowing Lure
      const glowR = 8 + Math.sin(frameCount * 0.3) * 3;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.beginPath();
      ctx.arc(fx + 52, fy - 8, glowR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(fx + 49, fy - 11, 6, 6);
    } else {
      // Rainbow Mantis Shrimp / Ocean Reef
      ctx.fillStyle = '#0c4a6e';
      ctx.fillRect(sx, sy, sw, sh);
      const mx = sx + Math.floor(sw / 2) - 26;
      const my = sy + sh - 48;
      const colors = ['#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = colors[(i + Math.floor(frameCount / 4)) % colors.length];
        ctx.fillRect(mx + i * 10, my, 10, 22);
      }
      // Sonic punch shockwave
      if (frameCount % 20 < 8) {
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.strokeRect(mx + 52, my - 4, 18, 26);
      }
    }
  }

  // Retro CRT Scanlines Wash across video viewport
  ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
  for (let sly = sy; sly < sy + sh; sly += 2) {
    ctx.fillRect(sx, sly, sw, 1);
  }

  // Yellow Nat Geo Iconic Frame Border inside Screen
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.strokeRect(sx + 4, sy + 4, 12, 16);

  // Top-Left LIVE NAT GEO / BOUTIQUE TV Badge + Pulsing Red Recording Dot
  const isBoutiqueClip = /spruce|cake|blacksmith|woodturning|aurora|domino|neon|pottery|glassblowing|skateboard|coaster|latte|lava|fireworks|campfire|cat_playing/i.test(scene);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
  ctx.fillRect(sx + 20, sy + 4, 134, 13);
  if (frameCount % 24 < 16) {
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(sx + 24, sy + 8, 4, 4);
  }
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 7px monospace';
  ctx.fillText(isBoutiqueClip ? 'BOUTIQUE TV • CH 42' : 'NAT GEO WILD • CH 42', sx + 31, sy + 13);

  // Top-Right Animated 6-Bar VU Audio Equalizer HUD
  ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
  ctx.fillRect(sx + sw - 34, sy + 4, 30, 13);
  const vuColors = ['#22c55e', '#22c55e', '#eab308', '#eab308', '#f97316', '#ef4444'];
  for (let b = 0; b < 6; b++) {
    const wave = Math.abs(Math.sin(frameCount * 0.24 + b * 0.95) * Math.cos(frameCount * 0.11 + b));
    const barH = Math.max(2, Math.min(9, Math.round(2 + wave * 8)));
    ctx.fillStyle = vuColors[b];
    ctx.fillRect(sx + sw - 31 + b * 4, sy + 15 - barH, 3, barH);
  }

  // Bottom Animated Ticker Bar
  ctx.fillStyle = '#18181b';
  ctx.fillRect(sx, y + h - 17, sw, 13);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(sx + 2, y + h - 15, 22, 9);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 6px monospace';
  ctx.fillText('LIVE', sx + 5, y + h - 8);
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 7px monospace';
  const cleanTitle = scene.replace(/_/g, ' ').toUpperCase();
  ctx.fillText(`▶ ${cleanTitle}`, sx + 28, y + h - 8);

  ctx.restore();
}
