import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import {
  isolateBackgroundHybrid,
  isolateWithSharp,
  hasUniformChromaOrSolidBorder,
  normalizeImageBuffer,
  normalizeCutoutTo3x4Canvas,
  PNG_MAGIC,
} from '@/lib/image/isolation';
import { storeProductAssets } from '@/lib/storage/productStorage';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

export const dynamic = 'force-dynamic';

/**
 * Safeguard against blank/over-erased cutouts (e.g. full-bleed framed diamond art touching all 4 edges).
 * If < 3% of pixels on the normalized canvas are opaque foreground, falls back to centering the
 * original photo at 86% fill on the 1200x1200 transparent canvas so uploads NEVER disappear.
 */
async function ensureNonEmptyCutout(
  cutoutPngBuffer: Buffer,
  normalizedRawBuffer: Buffer,
  canvasSize = 1200,
  targetFill = 0.86
): Promise<Buffer> {
  try {
    const { data, info } = await sharp(cutoutPngBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let opaqueCount = 0;
    const totalPixels = info.width * info.height;
    for (let i = 0; i < totalPixels; i++) {
      if (data[i * 4 + 3] > 40) opaqueCount++;
    }
    if (totalPixels > 0 && opaqueCount / totalPixels >= 0.03) {
      return cutoutPngBuffer;
    }

    console.warn(
      `[upload] Blank/near-empty cutout detected (${opaqueCount}/${totalPixels} opaque pixels). Falling back to framed photo preservation.`
    );
    const rawMeta = await sharp(normalizedRawBuffer).metadata();
    const rw = rawMeta.width || canvasSize;
    const rh = rawMeta.height || canvasSize;
    const scale = Math.min((canvasSize * targetFill) / rw, (canvasSize * targetFill) / rh);
    const sw = Math.max(1, Math.round(rw * scale));
    const sh = Math.max(1, Math.round(rh * scale));
    const resizedPhoto = await sharp(normalizedRawBuffer)
      .ensureAlpha()
      .resize(sw, sh, { fit: 'fill' })
      .png()
      .toBuffer();

    return await sharp({
      create: {
        width: canvasSize,
        height: canvasSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: resizedPhoto,
          left: Math.round((canvasSize - sw) / 2),
          top: Math.round((canvasSize - sh) / 2),
        },
      ])
      .png()
      .toBuffer();
  } catch {
    return cutoutPngBuffer;
  }
}

export async function POST(request: NextRequest) {
  const authErr = await requireAdminAuth(request);
  if (authErr) return authErr;

  try {
    const data = await request.formData();
    const file = data.get('file');
    const preIsolatedCutout = data.get('cutout');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);

    if (rawBuffer.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Uploaded file is empty' },
        { status: 400 }
      );
    }

    // 1. Auto-orient via EXIF and constrain max dimensions to 2048px
    const normalizedBuffer = await normalizeImageBuffer(rawBuffer, 2048);

    let transparentBuffer: Buffer;
    let engineUsed: 'imgly' | 'sharp' = 'sharp';
    let durationMs = 0;

    // Check if the original photo was taken on a uniform chroma-key / solid posterboard (e.g., green screen)
    const isSolidOrChromaBg = await hasUniformChromaOrSolidBorder(normalizedBuffer);

    const canvasNormOpts = {
      canvasWidth: 1200,
      canvasHeight: 1200,
      targetFillH: 0.86,
      maxFillW: 0.86,
      deFringe: false,
      removePockets: false,
    };

    // 2. If the photo is on a solid/chroma-key background (like green screen), always use the
    //    exact color flood-fill engine (isolateWithSharp) so neural portrait models (@imgly)
    //    never strip black picture frames or dark item borders!
    if (isSolidOrChromaBg) {
      const t0 = Date.now();
      const sharpIsolated = await isolateWithSharp(normalizedBuffer, {
        tolerance: 44,
        autoCrop: false,
      });
      transparentBuffer = await normalizeCutoutTo3x4Canvas(sharpIsolated, canvasNormOpts);
      engineUsed = 'sharp';
      durationMs = Date.now() - t0;
    } else if (preIsolatedCutout && preIsolatedCutout instanceof Blob && preIsolatedCutout.size > 0) {
      const t0 = Date.now();
      const cutoutBuf = Buffer.from(await preIsolatedCutout.arrayBuffer());
      if (cutoutBuf.length >= 8 && cutoutBuf.subarray(0, 8).equals(PNG_MAGIC)) {
        try {
          transparentBuffer = await normalizeCutoutTo3x4Canvas(cutoutBuf, canvasNormOpts);
        } catch {
          transparentBuffer = cutoutBuf;
        }
        engineUsed = 'imgly';
        durationMs = Date.now() - t0;
      } else {
        const isolation = await isolateBackgroundHybrid(normalizedBuffer, {
          preferEngine: 'sharp',
          autoCrop: false,
        });
        transparentBuffer = await normalizeCutoutTo3x4Canvas(isolation.buffer, canvasNormOpts);
        engineUsed = isolation.engine;
        durationMs = isolation.durationMs;
      }
    } else {
      // Server-side hybrid background isolation + standardized 1:1 square canvas normalization
      const isolation = await isolateBackgroundHybrid(normalizedBuffer, {
        preferEngine: 'sharp',
        autoCrop: false,
      });
      transparentBuffer = await normalizeCutoutTo3x4Canvas(isolation.buffer, canvasNormOpts);
      engineUsed = isolation.engine;
      durationMs = isolation.durationMs;
    }

    // 2b. Blank-cutout safeguard: guarantee full-bleed framed art or light-on-light items never vanish
    transparentBuffer = await ensureNonEmptyCutout(transparentBuffer, normalizedBuffer, 1200, 0.86);

    // 3. Store both assets (cutout + raw) via productStorage
    const fileName = (file instanceof File ? file.name : null) || 'upload.jpeg';
    const storageResult = await storeProductAssets({
      rawBuffer: normalizedBuffer,
      transparentBuffer,
      originalFilename: fileName,
      mimeType: file.type || 'image/jpeg',
    });

    // 4. Return dual URLs and isolation performance metadata
    return NextResponse.json({
      success: true,
      url: storageResult.transparentUrl, // backward compatibility with existing callers
      transparentUrl: storageResult.transparentUrl,
      originalUrl: storageResult.originalUrl,
      filename: storageResult.filename,
      engine: engineUsed,
      durationMs,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[upload] Upload route error:', error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
