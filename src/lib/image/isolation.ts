import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';
import type sharpType from 'sharp';

/**
 * PNG Magic Header Bytes: \x89PNG\r\n\x1a\n
 */
export const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export interface IsolationOptions {
  timeoutMs?: number;
  tolerance?: number;
  featherSigma?: number;
  paddingPercent?: number;
  maxDimension?: number;
  autoCrop?: boolean;
  normalize3x4?: boolean;
  preferEngine?: 'hybrid' | 'sharp' | 'imgly';
}

export interface CanvasNormalizationOptions {
  canvasWidth?: number;
  canvasHeight?: number;
  targetFillH?: number;
  maxFillW?: number;
  deFringe?: boolean;
  removePockets?: boolean;
}

export interface IsolationResult {
  buffer: Buffer;
  engine: 'imgly' | 'sharp';
  durationMs: number;
  width?: number;
  height?: number;
}

type SharpModule = typeof sharpType;

async function getSharp(): Promise<SharpModule | null> {
  try {
    const mod = await import('sharp');
    return (mod.default || mod) as unknown as SharpModule;
  } catch (err) {
    console.warn('[isolation] Native sharp unavailable, using pure-JS fallback:', (err as Error).message);
    return null;
  }
}

/**
 * Normalizes orientation and constrains max dimension using sharp when available,
 * or returns rawBuffer directly if sharp is unavailable in the runtime.
 */
export async function normalizeImageBuffer(rawBuffer: Buffer, maxDim = 2048): Promise<Buffer> {
  const sharp = await getSharp();
  if (!sharp) {
    return rawBuffer;
  }
  try {
    let instance = sharp(rawBuffer).rotate();
    const meta = await instance.metadata();
    if ((meta.width && meta.width > maxDim) || (meta.height && meta.height > maxDim)) {
      instance = instance.resize(maxDim, maxDim, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    return await instance.toBuffer();
  } catch (err) {
    console.warn('[isolation] normalizeImageBuffer fallback to rawBuffer:', (err as Error).message);
    return rawBuffer;
  }
}

/**
 * Detects whether an image has a uniform chroma-key or solid colored studio posterboard border
 * (such as Bonnie's neon green posterboard, bright yellow/blue/pink board, or uniform studio sheet).
 */
export async function hasUniformChromaOrSolidBorder(inputBuffer: Buffer): Promise<boolean> {
  const sharp = await getSharp();
  if (!sharp) return false;
  try {
    const { data, info } = await sharp(inputBuffer)
      .rotate()
      .resize(160, 160, { fit: 'inside' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const W = info.width;
    const H = info.height;
    if (W < 20 || H < 20) return false;

    const samples: Array<[number, number, number]> = [];
    const inX = Math.max(2, Math.round(W * 0.04));
    const inY = Math.max(2, Math.round(H * 0.04));

    for (let x = inX; x < W - inX; x += 2) {
      const iTop = (inY * W + x) * 3;
      samples.push([data[iTop], data[iTop + 1], data[iTop + 2]]);
      const iBot = ((H - 1 - inY) * W + x) * 3;
      samples.push([data[iBot], data[iBot + 1], data[iBot + 2]]);
    }
    for (let y = inY; y < H - inY; y += 2) {
      const iLeft = (y * W + inX) * 3;
      samples.push([data[iLeft], data[iLeft + 1], data[iLeft + 2]]);
      const iRight = (y * W + (W - 1 - inX)) * 3;
      samples.push([data[iRight], data[iRight + 1], data[iRight + 2]]);
    }

    if (samples.length < 16) return false;

    const bgR = median(samples.map((s) => s[0]));
    const bgG = median(samples.map((s) => s[1]));
    const bgB = median(samples.map((s) => s[2]));
    const bgColor: [number, number, number] = [bgR, bgG, bgB];

    // Check if it's a high-saturation chroma-key surface (green screen, yellow, blue, or pink posterboard)
    const isGreenScreen = bgG > 110 && bgG > bgR + 28 && bgG > bgB + 45;
    const maxC = Math.max(bgR, bgG, bgB);
    const minC = Math.min(bgR, bgG, bgB);
    const chroma = maxC - minC;

    let matchingCount = 0;
    for (const s of samples) {
      if (colorDist(s, bgColor) <= 34) {
        matchingCount++;
      }
    }
    const uniformity = matchingCount / samples.length;

    if (isGreenScreen && uniformity >= 0.65) {
      return true;
    }
    if (chroma >= 75 && uniformity >= 0.78) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Weighted Euclidean color distance modeling human perception.
 */
function colorDist(c1: [number, number, number], c2: [number, number, number]): number {
  const dr = c1[0] - c2[0];
  const dg = c1[1] - c2[1];
  const db = c1[2] - c2[2];
  return Math.sqrt(0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db);
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Core multi-feature flood-fill + interior loop/hole clearing + stray island removal
 * operating on raw RGB buffers (blurred for grain immunity + original for crisp edges).
 */
function computeSmartAlphaMask(
  blurRgb: Buffer | Uint8Array,
  origRgb: Buffer | Uint8Array,
  W: number,
  H: number,
  tolerance = 38
): Uint8Array {
  const getPx = (buf: Buffer | Uint8Array, x: number, y: number): [number, number, number] => {
    const i = (y * W + x) * 3;
    return [buf[i], buf[i + 1], buf[i + 2]];
  };

  // Sample both outer border and inset ring (5% inset avoids thin frame/table edges)
  const inX = Math.max(2, Math.min(Math.floor(W / 4), Math.round(W * 0.05)));
  const inY = Math.max(2, Math.min(Math.floor(H / 4), Math.round(H * 0.05)));
  const samples: Array<[number, number, number]> = [];

  for (let x = inX; x < W - inX; x++) {
    samples.push(getPx(blurRgb, x, inY));
    samples.push(getPx(blurRgb, x, H - 1 - inY));
  }
  for (let y = inY; y < H - inY; y++) {
    samples.push(getPx(blurRgb, inX, y));
    samples.push(getPx(blurRgb, W - 1 - inX, y));
  }
  if (samples.length === 0) {
    for (let x = 0; x < W; x++) {
      samples.push(getPx(blurRgb, x, 0));
      samples.push(getPx(blurRgb, x, H - 1));
    }
  }

  const bgR = median(samples.map((s) => s[0]));
  const bgG = median(samples.map((s) => s[1]));
  const bgB = median(samples.map((s) => s[2]));
  const bgColor: [number, number, number] = [bgR, bgG, bgB];
  const bgRG = bgR - bgG;
  const bgGB = bgG - bgB;
  const bgRB = bgR - bgB;
  const bgLum = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;
  const isLightBg = bgR > 205 && bgG > 205 && bgB > 205;

  const corners: Array<[number, number, number]> = [
    getPx(blurRgb, 0, 0),
    getPx(blurRgb, W - 1, 0),
    getPx(blurRgb, 0, H - 1),
    getPx(blurRgb, W - 1, H - 1),
  ];

  const chromaDist = (c: [number, number, number]): number => {
    const dRG = c[0] - c[1] - bgRG;
    const dGB = c[1] - c[2] - bgGB;
    const dRB = c[0] - c[2] - bgRB;
    return Math.sqrt(dRG * dRG + dGB * dGB + dRB * dRB);
  };

  const lumDiff = (c: [number, number, number]): number => {
    const lum = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
    return Math.abs(lum - bgLum);
  };

  const isBg = (x: number, y: number, holeMode = false): boolean => {
    if (x < 3 || x >= W - 3 || y < 3 || y >= H - 3) return true;
    const c = getPx(blurRgb, x, y);
    const cOrig = getPx(origRgb, x, y);

    // 1. Classic Euclidean RGB match against median background or corners
    const rgbDist = colorDist(c, bgColor);
    if (rgbDist <= (holeMode ? tolerance * 0.85 : tolerance)) {
      return true;
    }
    if (!holeMode) {
      for (const cor of corners) {
        if (colorDist(c, cor) <= tolerance * 0.9) return true;
      }
    }

    // 2. Chromaticity-invariant match for speckled/textured tabletops & shadows
    const cd = chromaDist(c);
    const cdOrig = chromaDist(cOrig);
    const ld = lumDiff(c);
    if (
      cd < (holeMode ? 15 : 18) &&
      cdOrig < (holeMode ? 20 : 25) &&
      ld < (holeMode ? 45 : 68)
    ) {
      return true;
    }

    // 3. Pure light/white studio background match
    if (isLightBg && c[0] > 220 && c[1] > 220 && c[2] > 220) {
      return true;
    }

    return false;
  };

  const mask = new Uint8Array(W * H);
  mask.fill(255);
  const visited = new Uint8Array(W * H);
  const queue = new Int32Array(W * H);
  let qHead = 0;
  let qTail = 0;

  const push = (x: number, y: number) => {
    const i = y * W + x;
    if (!visited[i]) {
      visited[i] = 1;
      queue[qTail++] = i;
    }
  };

  for (let x = 0; x < W; x++) {
    push(x, 0);
    push(x, H - 1);
  }
  for (let y = 0; y < H; y++) {
    push(0, y);
    push(W - 1, y);
  }

  while (qHead < qTail) {
    const idx = queue[qHead++];
    mask[idx] = 0;
    const cx = idx % W;
    const cy = Math.floor(idx / W);
    const neighbors: Array<[number, number]> = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
        const nIdx = ny * W + nx;
        if (!visited[nIdx] && isBg(nx, ny, false)) {
          visited[nIdx] = 1;
          queue[qTail++] = nIdx;
        }
      }
    }
  }

  // Clear interior background holes (such as inside keychain carabiner loops!)
  const holeVis = new Uint8Array(W * H);
  const minHolePixels = Math.max(25, Math.round(W * H * 0.0007));
  for (let y = inY; y < H - inY; y++) {
    for (let x = inX; x < W - inX; x++) {
      const sIdx = y * W + x;
      if (mask[sIdx] === 255 && !holeVis[sIdx] && isBg(x, y, true)) {
        const comp = [sIdx];
        holeVis[sIdx] = 1;
        let h = 0;
        while (h < comp.length) {
          const curr = comp[h++];
          const cx = curr % W;
          const cy = Math.floor(curr / W);
          for (const [nx, ny] of [
            [cx + 1, cy],
            [cx - 1, cy],
            [cx, cy + 1],
            [cx, cy - 1],
          ]) {
            if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
              const ni = ny * W + nx;
              if (mask[ni] === 255 && !holeVis[ni] && isBg(nx, ny, true)) {
                holeVis[ni] = 1;
                comp.push(ni);
              }
            }
          }
        }
        if (comp.length >= minHolePixels) {
          for (const ci of comp) mask[ci] = 0;
        }
      }
    }
  }

  // Keep the primary foreground object and nearby attached charms, removing distant stray shadow islands
  const fgVis = new Uint8Array(W * H);
  const comps: Array<{
    pixels: number[];
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }> = [];

  for (let i = 0; i < W * H; i++) {
    if (mask[i] === 255 && !fgVis[i]) {
      const pixels = [i];
      fgVis[i] = 1;
      let minX = W,
        maxX = 0,
        minY = H,
        maxY = 0;
      let h = 0;
      while (h < pixels.length) {
        const curr = pixels[h++];
        const cx = curr % W;
        const cy = Math.floor(curr / W);
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
        for (const [nx, ny] of [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ]) {
          if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
            const ni = ny * W + nx;
            if (mask[ni] === 255 && !fgVis[ni]) {
              fgVis[ni] = 1;
              pixels.push(ni);
            }
          }
        }
      }
      comps.push({ pixels, minX, maxX, minY, maxY });
    }
  }

  if (comps.length > 1) {
    comps.sort((a, b) => b.pixels.length - a.pixels.length);
    const main = comps[0];
    const margin = Math.round(Math.max(W, H) * 0.06);
    const minIslandSize = Math.max(16, Math.round(main.pixels.length * 0.005));
    for (let c = 1; c < comps.length; c++) {
      const comp = comps[c];
      const nearMain =
        comp.maxX >= main.minX - margin &&
        comp.minX <= main.maxX + margin &&
        comp.maxY >= main.minY - margin &&
        comp.minY <= main.maxY + margin;
      if (!nearMain || comp.pixels.length < minIslandSize) {
        for (const pi of comp.pixels) mask[pi] = 0;
      }
    }
  }

  return mask;
}

/**
 * Pure JavaScript (zero native binary) border-sampling BFS flood-fill isolation engine
 * using jpeg-js and pngjs for serverless environments where libvips may not load.
 */
export function isolateWithPureJs(inputBuffer: Buffer, options: IsolationOptions = {}): Buffer {
  const tolerance = options.tolerance ?? 38;
  let width = 0;
  let height = 0;
  let rgbaData: Uint8Array;

  if (inputBuffer.length >= 8 && inputBuffer.subarray(0, 8).equals(PNG_MAGIC)) {
    const decoded = PNG.sync.read(inputBuffer);
    width = decoded.width;
    height = decoded.height;
    rgbaData = new Uint8Array(decoded.data);
  } else {
    const decoded = jpeg.decode(inputBuffer, { useTArray: true, maxResolutionInMP: 64 });
    width = decoded.width;
    height = decoded.height;
    rgbaData = new Uint8Array(decoded.data);
  }

  const origRgb = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    origRgb[i * 3] = rgbaData[i * 4];
    origRgb[i * 3 + 1] = rgbaData[i * 4 + 1];
    origRgb[i * 3 + 2] = rgbaData[i * 4 + 2];
  }

  // Simple 3x3 box blur for speckle resistance in pure JS
  const blurRgb = new Uint8Array(origRgb);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0, g = 0, b = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 3;
          r += origRgb[idx];
          g += origRgb[idx + 1];
          b += origRgb[idx + 2];
        }
      }
      const outIdx = (y * width + x) * 3;
      blurRgb[outIdx] = Math.round(r / 9);
      blurRgb[outIdx + 1] = Math.round(g / 9);
      blurRgb[outIdx + 2] = Math.round(b / 9);
    }
  }

  const mask = computeSmartAlphaMask(blurRgb, origRgb, width, height, tolerance);

  for (let i = 0; i < width * height; i++) {
    if (mask[i] === 0) {
      rgbaData[i * 4] = 0;
      rgbaData[i * 4 + 1] = 0;
      rgbaData[i * 4 + 2] = 0;
      rgbaData[i * 4 + 3] = 0;
    } else {
      rgbaData[i * 4 + 3] = 255;
    }
  }

  const outPng = new PNG({ width, height });
  outPng.data = Buffer.from(rgbaData);
  return PNG.sync.write(outPng);
}

/**
 * Pure sharp-based smart border-sampling, flood-fill, interior loop clearing,
 * and feathered alpha-matting isolation engine.
 */
export async function isolateWithSharp(
  inputBuffer: Buffer,
  options: IsolationOptions = {}
): Promise<Buffer> {
  const sharp = await getSharp();
  if (!sharp) {
    return isolateWithPureJs(inputBuffer, options);
  }

  try {
    const tolerance = options.tolerance ?? 38;
    const featherSigma = options.featherSigma ?? 1.2;
    const maxDim = options.maxDimension ?? 2048;

    // 1. Auto-orient via EXIF and constrain max dimensions
    let oriented = sharp(inputBuffer).rotate();
    const meta = await oriented.metadata();
    let origW = meta.width || 800;
    let origH = meta.height || 800;

    if (origW > maxDim || origH > maxDim) {
      oriented = oriented.resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true });
    }
    const normalizedBuffer = await oriented.toBuffer();
    const normalizedMeta = await sharp(normalizedBuffer).metadata();
    origW = normalizedMeta.width || origW;
    origH = normalizedMeta.height || origH;

    // 2. Downscale for fast mask BFS computation (max dimension 720px for crisp frame & bead edges)
    const maskMaxDim = 720;
    const scale = Math.min(1, maskMaxDim / Math.max(origW, origH));
    const maskW = Math.max(16, Math.round(origW * scale));
    const maskH = Math.max(16, Math.round(origH * scale));

    const { data: blurRgb } = await sharp(normalizedBuffer)
      .resize(maskW, maskH, { fit: 'fill' })
      .removeAlpha()
      .blur(1.2)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data: smallOrigRgb } = await sharp(normalizedBuffer)
      .resize(maskW, maskH, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 3. Compute smart multi-feature alpha mask (handles speckled mats + interior keychain loops)
    const mask = computeSmartAlphaMask(blurRgb, smallOrigRgb, maskW, maskH, tolerance);

    // 4. Upscale 1-channel mask back to original resolution and feather edges
    const maskBuffer = Buffer.from(mask);
    const upscaledMask = await sharp(maskBuffer, {
      raw: { width: maskW, height: maskH, channels: 1 },
    })
      .toColourspace('b-w')
      .resize(origW, origH, { kernel: 'lanczos3' })
      .blur(featherSigma)
      .raw()
      .toBuffer();

    // 5. Join RGB with Alpha channel + Chroma-Key green/color spill removal on outer boundary
    const rgbBuffer = await sharp(normalizedBuffer).removeAlpha().raw().toBuffer();
    const fullRgba = Buffer.alloc(origW * origH * 4);

    // Detect if background is a high-saturation chroma-key surface (e.g. neon green posterboard)
    let borderR = 0, borderG = 0, borderB = 0, borderN = 0;
    for (let x = 0; x < maskW; x++) {
      const idx = x * 3;
      borderR += smallOrigRgb[idx];
      borderG += smallOrigRgb[idx + 1];
      borderB += smallOrigRgb[idx + 2];
      borderN++;
    }
    const avgBgR = borderN > 0 ? borderR / borderN : 128;
    const avgBgG = borderN > 0 ? borderG / borderN : 128;
    const avgBgB = borderN > 0 ? borderB / borderN : 128;
    const isGreenScreen = avgBgG > 110 && avgBgG > avgBgR + 30 && avgBgG > avgBgB + 50;

    for (let y = 0; y < origH; y++) {
      for (let x = 0; x < origW; x++) {
        const i = y * origW + x;
        let a = upscaledMask[i] < 110 ? 0 : upscaledMask[i];
        const r = rgbBuffer[i * 3];
        const g = rgbBuffer[i * 3 + 1];
        const b = rgbBuffer[i * 3 + 2];

        if (isGreenScreen && a > 0) {
          // Check if near the outer boundary (within 4px of background mask < 180)
          const mx = Math.min(maskW - 1, Math.floor((x / origW) * maskW));
          const my = Math.min(maskH - 1, Math.floor((y / origH) * maskH));
          let nearBg = a < 250;
          if (!nearBg) {
            for (let dy = -2; dy <= 2 && !nearBg; dy++) {
              for (let dx = -2; dx <= 2 && !nearBg; dx++) {
                const nx = mx + dx;
                const ny = my + dy;
                if (nx < 0 || nx >= maskW || ny < 0 || ny >= maskH || mask[ny * maskW + nx] === 0) {
                  nearBg = true;
                }
              }
            }
          }

          if (nearBg) {
            // Strip neon-green boundary fringe pixels where green strongly dominates red and blue
            if (g > 85 && g > r + 18 && g > b + 30) {
              a = 0;
            } else if (g > r + 6 && g > b + 10) {
              // Despill green reflection on dark frame edge
              const neutral = Math.round((r + b) * 0.5);
              fullRgba[i * 4] = r;
              fullRgba[i * 4 + 1] = Math.min(g, neutral);
              fullRgba[i * 4 + 2] = b;
              fullRgba[i * 4 + 3] = a;
              continue;
            }
          }
        }

        if (a === 0) {
          fullRgba[i * 4] = 0;
          fullRgba[i * 4 + 1] = 0;
          fullRgba[i * 4 + 2] = 0;
          fullRgba[i * 4 + 3] = 0;
        } else {
          fullRgba[i * 4] = r;
          fullRgba[i * 4 + 1] = g;
          fullRgba[i * 4 + 2] = b;
          fullRgba[i * 4 + 3] = a;
        }
      }
    }

    // 6. Enforce strict transparency on the 3px perimeter border
    for (let y = 0; y < origH; y++) {
      for (let x = 0; x < origW; x++) {
        if (x < 3 || x >= origW - 3 || y < 3 || y >= origH - 3) {
          const idx = (y * origW + x) * 4;
          fullRgba[idx] = 0;
          fullRgba[idx + 1] = 0;
          fullRgba[idx + 2] = 0;
          fullRgba[idx + 3] = 0;
        }
      }
    }

    // 7. Auto-crop and center padding if requested
    let pipeline = sharp(fullRgba, {
      raw: { width: origW, height: origH, channels: 4 },
    });

    if (options.autoCrop) {
      const trimmed = await pipeline.png().trim().toBuffer({ resolveWithObject: true });
      const padX = Math.max(16, Math.round(trimmed.info.width * (options.paddingPercent ?? 0.05)));
      const padY = Math.max(16, Math.round(trimmed.info.height * (options.paddingPercent ?? 0.05)));
      pipeline = sharp(trimmed.data).extend({
        top: padY,
        bottom: padY,
        left: padX,
        right: padX,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      });
    }

    if (options.normalize3x4) {
      const unpadded = await pipeline.png().toBuffer();
      return await normalizeCutoutTo3x4Canvas(unpadded);
    }

    return await pipeline.png({ compressionLevel: 9 }).toBuffer();
  } catch (err) {
    console.warn('[isolation] sharp pipeline threw, falling back to pure-JS:', (err as Error).message);
    return isolateWithPureJs(inputBuffer, options);
  }
}

/**
 * De-fringes and removes trapped concavity background pockets on an RGBA buffer.
 * - Pass 1: Weak alpha clamp (< 60 => 0; 60..140 => 0 if low saturation or tabletop match).
 * - Pass 2: Boundary decontamination (2px-3px boundary adjacent to transparent pixels).
 * - Pass 3: Full-resolution concavity background pocket removal via connected component BFS.
 */
export function cleanCutoutRgba(
  data: Uint8Array | Buffer,
  W: number,
  H: number,
  options: { deFringe?: boolean; removePockets?: boolean } = {}
): { bgR: number; bgG: number; bgB: number } {
  const deFringe = options.deFringe !== false;
  const removePockets = options.removePockets !== false;
  if (!deFringe && !removePockets) return { bgR: 128, bgG: 118, bgB: 110 };

  // 1. Estimate background color signature from perimeter and weak alpha fringe
  const bgSamples: Array<[number, number, number]> = [];

  for (let x = 0; x < W; x++) {
    const iTop = (0 * W + x) * 4;
    if (data[iTop + 3] > 10) bgSamples.push([data[iTop], data[iTop + 1], data[iTop + 2]]);
    const iBot = ((H - 1) * W + x) * 4;
    if (data[iBot + 3] > 10) bgSamples.push([data[iBot], data[iBot + 1], data[iBot + 2]]);
  }
  for (let y = 0; y < H; y++) {
    const iLeft = (y * W + 0) * 4;
    if (data[iLeft + 3] > 10) bgSamples.push([data[iLeft], data[iLeft + 1], data[iLeft + 2]]);
    const iRight = (y * W + (W - 1)) * 4;
    if (data[iRight + 3] > 10) bgSamples.push([data[iRight], data[iRight + 1], data[iRight + 2]]);
  }

  for (let i = 0; i < W * H; i++) {
    const a = data[i * 4 + 3];
    if (a >= 30 && a < 140) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
      if (sat < 0.25) {
        bgSamples.push([r, g, b]);
      }
    }
  }

  let bgR = 128;
  let bgG = 118;
  let bgB = 110;
  if (bgSamples.length >= 20) {
    const med = (arr: number[]) => {
      const s = arr.slice().sort((a, b) => a - b);
      return s[Math.floor(s.length / 2)];
    };
    bgR = med(bgSamples.map((s) => s[0]));
    bgG = med(bgSamples.map((s) => s[1]));
    bgB = med(bgSamples.map((s) => s[2]));
  }

  const bgRG = bgR - bgG;
  const bgGB = bgG - bgB;
  const bgRB = bgR - bgB;
  const bgLum = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;

  if (deFringe) {
    // Pass 1: Edge Alpha Tightening (< 140 gray tabletop fringe clamping)
    for (let i = 0; i < W * H; i++) {
      const a = data[i * 4 + 3];
      if (a === 0) continue;
      if (a < 60) {
        data[i * 4] = 0;
        data[i * 4 + 1] = 0;
        data[i * 4 + 2] = 0;
        data[i * 4 + 3] = 0;
        continue;
      }
      if (a < 210) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const chroma = maxC - minC;
        const sat = maxC === 0 ? 0 : chroma / maxC;
        const dr = r - bgR;
        const dg = g - bgG;
        const db = b - bgB;
        const dist = Math.sqrt(0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db);
        if (chroma <= 36 || (sat < 0.25 && dist < 55)) {
          data[i * 4] = 0;
          data[i * 4 + 1] = 0;
          data[i * 4 + 2] = 0;
          data[i * 4 + 3] = 0;
        }
      }
    }

    // Pass 2: Boundary decontamination (2px outer boundary)
    const origZero = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
      if (data[i * 4 + 3] === 0) origZero[i] = 1;
    }

    const isZero = (x: number, y: number): boolean => {
      if (x < 0 || x >= W || y < 0 || y >= H) return true;
      return origZero[y * W + x] === 1;
    };

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = (y * W + x) * 4;
        if (data[idx + 3] === 0) continue;

        let hasZeroNeighbor = false;
        for (let dy = -2; dy <= 2 && !hasZeroNeighbor; dy++) {
          for (let dx = -2; dx <= 2 && !hasZeroNeighbor; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (isZero(x + dx, y + dy)) {
              hasZeroNeighbor = true;
            }
          }
        }

        if (hasZeroNeighbor) {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const maxC = Math.max(r, g, b);
          const minC = Math.min(r, g, b);
          const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
          const dr = r - bgR;
          const dg = g - bgG;
          const db = b - bgB;
          const dist = Math.sqrt(0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db);
          if (sat < 0.20 && dist < 40) {
            data[idx] = 0;
            data[idx + 1] = 0;
            data[idx + 2] = 0;
            data[idx + 3] = 0;
          }
        }
      }
    }
  }

  if (removePockets) {
    // Pass 3: Full-resolution concavity background pocket removal
    let totalOpaque = 0;
    for (let i = 0; i < W * H; i++) {
      if (data[i * 4 + 3] > 25) totalOpaque++;
    }

    const pocketCandidates = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = (y * W + x) * 4;
        if (data[idx + 3] === 0) continue;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const dr = r - bgR;
        const dg = g - bgG;
        const db = b - bgB;
        const dist = Math.sqrt(0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db);
        const dRG = (r - g) - bgRG;
        const dGB = (g - b) - bgGB;
        const dRB = (r - b) - bgRB;
        const chromaDist = Math.sqrt(dRG * dRG + dGB * dGB + dRB * dRB);

        if (
          sat < 0.18 &&
          (dist < 32 || (chromaDist < 16 && Math.abs(lum - bgLum) < 42))
        ) {
          pocketCandidates[y * W + x] = 1;
        }
      }
    }

    const visited = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (pocketCandidates[i] && !visited[i]) {
          const comp = [i];
          visited[i] = 1;
          let head = 0;
          while (head < comp.length) {
            const curr = comp[head++];
            const cx = curr % W;
            const cy = Math.floor(curr / W);
            const neighbors = [
              [cx + 1, cy],
              [cx - 1, cy],
              [cx, cy + 1],
              [cx, cy - 1],
            ];
            for (const [nx, ny] of neighbors) {
              if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
                const ni = ny * W + nx;
                if (pocketCandidates[ni] && !visited[ni]) {
                  visited[ni] = 1;
                  comp.push(ni);
                }
              }
            }
          }
          if (comp.length >= 20 && comp.length < totalOpaque * 0.40) {
            for (const ci of comp) {
              data[ci * 4] = 0;
              data[ci * 4 + 1] = 0;
              data[ci * 4 + 2] = 0;
              data[ci * 4 + 3] = 0;
            }
          }
        }
      }
    }
  }

  return { bgR, bgG, bgB };
}

/**
 * Normalizes an isolated transparent cutout buffer to a standard 1200x1600 (3:4) canvas.
 * - Trims transparent bounds around non-transparent pixels (alpha > 25).
 * - Applies edge alpha tightening / de-fringing and concavity pocket removal.
 * - Uniformly scales the trinket bounding box so it occupies 48%-52% of canvas height
 *   (target 50%) and at most 52% of canvas width.
 * - Centers the scaled cutout on a transparent 1200x1600 canvas.
 */
export async function normalizeCutoutTo3x4Canvas(
  buffer: Buffer,
  options: CanvasNormalizationOptions = {}
): Promise<Buffer> {
  const canvasW = options.canvasWidth ?? 1200;
  const canvasH = options.canvasHeight ?? 1600;
  const targetFillH = options.targetFillH ?? 0.50;
  const maxFillW = options.maxFillW ?? 0.52;
  const deFringe = options.deFringe !== false;
  const removePockets = options.removePockets !== false;

  const sharp = await getSharp();
  if (!sharp) {
    let width = 0;
    let height = 0;
    let rgbaData: Uint8Array;

    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_MAGIC)) {
      const decoded = PNG.sync.read(buffer);
      width = decoded.width;
      height = decoded.height;
      rgbaData = new Uint8Array(decoded.data);
    } else {
      const decoded = jpeg.decode(buffer, { useTArray: true, maxResolutionInMP: 64 });
      width = decoded.width;
      height = decoded.height;
      rgbaData = new Uint8Array(decoded.data);
    }

    cleanCutoutRgba(rgbaData, width, height, { deFringe, removePockets });

    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (rgbaData[(y * width + x) * 4 + 3] > 25) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const outPng = new PNG({ width: canvasW, height: canvasH });
    outPng.data.fill(0);

    if (minX > maxX || minY > maxY) {
      return PNG.sync.write(outPng);
    }

    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;
    const scale = Math.min((canvasH * targetFillH) / cropH, (canvasW * maxFillW) / cropW);
    const scaledW = Math.max(1, Math.round(cropW * scale));
    const scaledH = Math.max(1, Math.round(cropH * scale));
    const destX = Math.round((canvasW - scaledW) / 2);
    const destY = Math.round((canvasH - scaledH) / 2);

    for (let cy = 0; cy < scaledH; cy++) {
      const sy = minY + Math.min(cropH - 1, Math.floor(cy / scale));
      const outRow = (destY + cy) * canvasW;
      for (let cx = 0; cx < scaledW; cx++) {
        const sx = minX + Math.min(cropW - 1, Math.floor(cx / scale));
        const srcIdx = (sy * width + sx) * 4;
        const destIdx = (outRow + (destX + cx)) * 4;
        outPng.data[destIdx] = rgbaData[srcIdx];
        outPng.data[destIdx + 1] = rgbaData[srcIdx + 1];
        outPng.data[destIdx + 2] = rgbaData[srcIdx + 2];
        outPng.data[destIdx + 3] = rgbaData[srcIdx + 3];
      }
    }

    return PNG.sync.write(outPng);
  }

  // Native sharp processing
  const { data: rawRgba, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const W = info.width;
  const H = info.height;
  const { bgR, bgG, bgB } = cleanCutoutRgba(rawRgba, W, H, { deFringe, removePockets });

  let minX = W;
  let maxX = 0;
  let minY = H;
  let maxY = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (rawRgba[(y * W + x) * 4 + 3] > 25) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (minX > maxX || minY > maxY) {
    return await sharp({
      create: {
        width: canvasW,
        height: canvasH,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png({ compressionLevel: 9 })
      .toBuffer();
  }

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const scale = Math.min((canvasH * targetFillH) / cropH, (canvasW * maxFillW) / cropW);
  const scaledW = Math.max(1, Math.round(cropW * scale));
  const scaledH = Math.max(1, Math.round(cropH * scale));
  const destX = Math.round((canvasW - scaledW) / 2);
  const destY = Math.round((canvasH - scaledH) / 2);

  const croppedRgba = await sharp(rawRgba, {
    raw: { width: W, height: H, channels: 4 },
  })
    .extract({ left: minX, top: minY, width: cropW, height: cropH })
    .resize(scaledW, scaledH, {
      kernel: 'lanczos3',
      fit: 'fill',
    })
    .raw()
    .toBuffer();

  const finalCanvas = Buffer.alloc(canvasW * canvasH * 4, 0);
  for (let cy = 0; cy < scaledH; cy++) {
    const srcOffset = cy * scaledW * 4;
    const destOffset = ((destY + cy) * canvasW + destX) * 4;
    croppedRgba.copy(finalCanvas, destOffset, srcOffset, srcOffset + scaledW * 4);
  }

  if (deFringe) {
    for (let i = 0; i < canvasW * canvasH; i++) {
      const a = finalCanvas[i * 4 + 3];
      if (a === 0) continue;
      if (a < 60) {
        finalCanvas[i * 4] = 0;
        finalCanvas[i * 4 + 1] = 0;
        finalCanvas[i * 4 + 2] = 0;
        finalCanvas[i * 4 + 3] = 0;
      } else if (a < 140) {
        const r = finalCanvas[i * 4];
        const g = finalCanvas[i * 4 + 1];
        const b = finalCanvas[i * 4 + 2];
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
        const dr = r - bgR;
        const dg = g - bgG;
        const db = b - bgB;
        const dist = Math.sqrt(0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db);
        if (sat < 0.20 || dist < 40) {
          finalCanvas[i * 4] = 0;
          finalCanvas[i * 4 + 1] = 0;
          finalCanvas[i * 4 + 2] = 0;
          finalCanvas[i * 4 + 3] = 0;
        }
      }
    }
  }

  return await sharp(finalCanvas, {
    raw: { width: canvasW, height: canvasH, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Trims transparent outer margins and adds centered transparent padding.
 */
export async function trimAndCenter(
  buffer: Buffer,
  options: { paddingPercent?: number; minPadding?: number } = {}
): Promise<Buffer> {
  const sharp = await getSharp();
  if (!sharp) {
    return buffer;
  }
  const trimmed = await sharp(buffer).trim().toBuffer({ resolveWithObject: true });
  const minPad = options.minPadding ?? 16;
  const padX = Math.max(minPad, Math.round(trimmed.info.width * (options.paddingPercent ?? 0.05)));
  const padY = Math.max(minPad, Math.round(trimmed.info.height * (options.paddingPercent ?? 0.05)));

  return sharp(trimmed.data)
    .extend({
      top: padY,
      bottom: padY,
      left: padX,
      right: padX,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Resilient Hybrid Isolation Pipeline:
 * Routes to sharp / pure-JS isolation by default, or @imgly when explicitly requested.
 */
export async function isolateBackgroundHybrid(
  inputBuffer: Buffer,
  options: IsolationOptions = {}
): Promise<IsolationResult> {
  const t0 = Date.now();
  const timeoutMs = options.timeoutMs ?? 5000;
  let isolatedBuffer: Buffer | null = null;
  let engineUsed: 'imgly' | 'sharp' = 'imgly';

  const isWindows = process.platform === 'win32';
  const isServerless = Boolean(
    process.env.NETLIFY ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.VERCEL
  );

  const shouldTryImgly = options.preferEngine === 'imgly' && !isWindows && !isServerless;

  if (!shouldTryImgly) {
    engineUsed = 'sharp';
    isolatedBuffer = await isolateWithSharp(inputBuffer, options);
    return {
      buffer: isolatedBuffer,
      engine: engineUsed,
      durationMs: Date.now() - t0,
    };
  }

  try {
    const loadDynamicModule = new Function(
      'specifier',
      'return import(specifier);'
    ) as (specifier: string) => Promise<{
      removeBackground?: (input: unknown, config?: unknown) => Promise<Blob>;
      default?: { removeBackground?: (input: unknown, config?: unknown) => Promise<Blob> };
    }>;
    const imglyModule = await loadDynamicModule('@imgly/background-removal-node');
    const removeBackground =
      imglyModule.removeBackground ||
      (imglyModule.default as { removeBackground?: typeof imglyModule.removeBackground })?.removeBackground ||
      imglyModule.default;

    if (typeof removeBackground !== 'function') {
      throw new Error('removeBackground function not found in @imgly/background-removal-node');
    }

    const imglyPromise = (async () => {
      const blob = new Blob([new Uint8Array(inputBuffer)], { type: 'image/jpeg' });
      const outBlob = await removeBackground(blob, {
        model: 'small',
        output: { format: 'image/png', quality: 0.85 },
      });
      const arr = await outBlob.arrayBuffer();
      const buf = Buffer.from(arr);
      if (buf && buf.length >= 8 && buf.subarray(0, 8).equals(PNG_MAGIC)) {
        return buf;
      }
      throw new Error('@imgly output is not a valid PNG');
    })();

    imglyPromise.catch(() => {});

    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`@imgly isolation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      if (timer.unref) timer.unref();
    });

    isolatedBuffer = await Promise.race([imglyPromise, timeoutPromise]);

    if (options.normalize3x4) {
      isolatedBuffer = await normalizeCutoutTo3x4Canvas(isolatedBuffer);
    } else if (options.autoCrop) {
      isolatedBuffer = await trimAndCenter(isolatedBuffer, {
        paddingPercent: options.paddingPercent,
      });
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[isolation] @imgly unavailable or failed (${errMsg}), falling back to sharp engine...`);
    engineUsed = 'sharp';
    isolatedBuffer = await isolateWithSharp(inputBuffer, options);
  }

  return {
    buffer: isolatedBuffer,
    engine: engineUsed,
    durationMs: Date.now() - t0,
  };
}
