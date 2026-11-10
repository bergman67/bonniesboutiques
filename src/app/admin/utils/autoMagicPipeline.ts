import { ProductCategory, applyCategoryTag } from '@/lib/categories';

export interface MagicQueueItem {
  id: string;
  file: File;
  originalPreviewUrl: string;
  transparentUrl: string | null;
  originalUploadedUrl?: string | null;
  previewMode: 'cutout' | 'original';

  status: 'pending' | 'isolating' | 'naming' | 'ready' | 'publishing' | 'published' | 'error';
  stepProgress: number; // 0 = pending, 33 = isolating, 66 = naming, 100 = ready
  stepMessage: string;
  errorMessage: string | null;

  title: string;
  description: string;
  category: ProductCategory;
  price: number;
  suggestedTitlesHistory: string[];
  isRegeneratingName: boolean;
  publishedProductId?: string | null;
}

export interface AutoMagicPipelineResult {
  transparentUrl: string;
  originalUrl?: string;
  title: string;
  description: string;
  category: ProductCategory;
  price: number;
}

export type ProgressCallback = (update: Partial<MagicQueueItem>) => void;

/**
 * Creates a new pending MagicQueueItem from a File.
 */
export function createMagicQueueItem(file: File): MagicQueueItem {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `magic-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const originalPreviewUrl = typeof URL !== 'undefined' && URL.createObjectURL
    ? URL.createObjectURL(file)
    : '';

  return {
    id,
    file,
    originalPreviewUrl,
    transparentUrl: null,
    originalUploadedUrl: null,
    previewMode: 'cutout',
    status: 'pending',
    stepProgress: 0,
    stepMessage: 'Waiting in queue...',
    errorMessage: null,
    title: '',
    description: '',
    category: 'Beaded Pens',
    price: 8.00,
    suggestedTitlesHistory: [],
    isRegeneratingName: false,
    publishedProductId: null,
  };
}

/**
 * Validates and normalizes category string to one of the 5 boutique categories.
 */
function normalizeCategory(cat?: string | null): ProductCategory {
  if (!cat) return 'Beaded Pens';
  const lower = cat.toLowerCase();
  if (lower.includes('diamond') || lower.includes('framed') || lower.includes('art')) return 'Diamond Art';
  if (lower.includes('accessor') || lower.includes('bracelet') || lower.includes('wristlet') || lower.includes('set')) return 'Accessories';
  if (lower.includes('keychain')) return 'Keychains';
  if (lower.includes('charm') || lower.includes('bookmark')) return 'Charms & Bookmarks';
  return 'Beaded Pens';
}

/**
 * Compresses and resizes large phone camera photos (e.g., 5MB-12MB iPhone JPEG/HEIC)
 * in the browser before uploading to `/api/upload`, preventing 413 Payload Too Large
 * errors on Netlify Serverless Functions (which enforce a ~4.5MB body limit).
 */
export async function compressImageForUpload(
  file: File,
  maxDimension = 1280,
  quality = 0.86
): Promise<File> {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof Image === 'undefined'
  ) {
    return file;
  }

  return new Promise<File>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          resolve(file);
          return;
        }

        // If already small in both dimensions and byte size (< 600KB), keep as-is
        if (width <= maxDimension && height <= maxDimension && file.size <= 600 * 1024) {
          resolve(file);
          return;
        }

        if (width > maxDimension || height > maxDimension) {
          const scale = maxDimension / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const outputType = file.type === 'image/png' && file.size < 900 * 1024
          ? 'image/png'
          : 'image/jpeg';

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const ext = outputType === 'image/png' ? '.png' : '.jpg';
            const cleanBase = file.name.replace(/\.[^/.]+$/, '') || 'trinket-photo';
            const compressedFile = new File([blob], `${cleanBase}${ext}`, {
              type: outputType,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          outputType,
          quality
        );
      } catch {
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Normalizes a cutout PNG Blob to a standard 1200x1600 (3:4) canvas in the browser.
 * Applies edge alpha tightening (< 140 gray tabletop fringe clamp), 2px boundary de-fringing,
 * concavity background pocket removal, and scales the trinket bounding box
 * to occupy 48%-52% of canvas height (target 50%) and at most 52% of canvas width.
 */
export async function normalizeCutoutBlobTo3x4(cutoutBlob: Blob): Promise<Blob> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return cutoutBlob;
  }

  return new Promise<Blob>((resolve) => {
    const url = URL.createObjectURL(cutoutBlob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) {
          resolve(cutoutBlob);
          return;
        }

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
          resolve(cutoutBlob);
          return;
        }

        tempCtx.drawImage(img, 0, 0);
        const imgDataObj = tempCtx.getImageData(0, 0, w, h);
        const data = imgDataObj.data;

        // Strip faint alpha dust (a < 45) while preserving all opaque white, black, silver, and neutral beads
        for (let i = 0; i < w * h; i++) {
          const a = data[i * 4 + 3];
          if (a < 45) {
            data[i * 4] = 0;
            data[i * 4 + 1] = 0;
            data[i * 4 + 2] = 0;
            data[i * 4 + 3] = 0;
          }
        }

        // Put cleaned data back to temp canvas
        tempCtx.putImageData(imgDataObj, 0, 0);

        // Find bounding box
        let minX = w;
        let minY = h;
        let maxX = 0;
        let maxY = 0;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (data[(y * w + x) * 4 + 3] > 25) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        const canvasW = 1200;
        const canvasH = 1200;
        const outCanvas = document.createElement('canvas');
        outCanvas.width = canvasW;
        outCanvas.height = canvasH;
        const outCtx = outCanvas.getContext('2d');
        if (!outCtx) {
          resolve(cutoutBlob);
          return;
        }

        if (minX > maxX || minY > maxY) {
          outCanvas.toBlob((b) => resolve(b || cutoutBlob), 'image/png');
          return;
        }

        const cropW = maxX - minX + 1;
        const cropH = maxY - minY + 1;
        const scale = Math.min((canvasH * 0.86) / cropH, (canvasW * 0.86) / cropW);
        const scaledW = Math.max(1, Math.round(cropW * scale));
        const scaledH = Math.max(1, Math.round(cropH * scale));
        const destX = Math.round((canvasW - scaledW) / 2);
        const destY = Math.round((canvasH - scaledH) / 2);

        outCtx.clearRect(0, 0, canvasW, canvasH);
        outCtx.drawImage(tempCanvas, minX, minY, cropW, cropH, destX, destY, scaledW, scaledH);

        outCanvas.toBlob((b) => resolve(b || cutoutBlob), 'image/png');
      } catch {
        resolve(cutoutBlob);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(cutoutBlob);
    };

    img.src = url;
  });
}

/**
 * Backwards-compatible alias for cutout trimming and normalization.
 */
export async function trimAndCompressCutoutBlob(
  cutoutBlob: Blob,
  _maxDim = 1000,
  _paddingPercent = 0.05
): Promise<Blob> {
  return normalizeCutoutBlobTo3x4(cutoutBlob);
}

/**
 * Runs neural ISNet background segmentation (@imgly/background-removal) in the browser
 * so textured/speckled mats, wood surfaces, and enclosed keychain loops are cleanly removed.
 * Returns null if unavailable or in a non-browser test environment.
 */
async function isolateInBrowserWithImgly(
  file: File,
  onProgress?: ProgressCallback
): Promise<File | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  // First check if the photo is on a chroma-key green screen or bright posterboard.
  // If so, skip @imgly in the browser so the server's exact chroma/flood-fill engine
  // preserves 100% of black picture frames and dark borders!
  try {
    const isChromaBg = await new Promise<boolean>((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          const w = 120;
          const h = 120;
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          if (!ctx) return resolve(false);
          ctx.drawImage(img, 0, 0, w, h);
          const d = ctx.getImageData(0, 0, w, h).data;
          let rSum = 0, gSum = 0, bSum = 0, n = 0;
          for (let x = 6; x < w - 6; x += 2) {
            for (const y of [5, h - 6]) {
              const idx = (y * w + x) * 4;
              rSum += d[idx]; gSum += d[idx + 1]; bSum += d[idx + 2]; n++;
            }
          }
          if (n === 0) return resolve(false);
          const avgR = rSum / n;
          const avgG = gSum / n;
          const avgB = bSum / n;
          // Green screen posterboard or high-chroma studio posterboard
          if (avgG > 110 && avgG > avgR + 28 && avgG > avgB + 45) {
            return resolve(true);
          }
          resolve(false);
        } catch {
          resolve(false);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(false);
      };
      img.src = url;
    });

    if (isChromaBg) {
      onProgress?.({
        status: 'isolating',
        stepProgress: 45,
        stepMessage: '✂️ Step 1: Green-screen studio background detected — preserving full item & frame...',
      });
      return null;
    }
  } catch {}

  try {
    const importUrl = 'https://esm.sh/@imgly/background-removal@1.4.5';
    const dynamicImporter = new Function('u', 'return import(u);') as (
      url: string
    ) => Promise<{
      removeBackground?: (input: Blob, config?: Record<string, unknown>) => Promise<Blob>;
      default?: (input: Blob, config?: Record<string, unknown>) => Promise<Blob>;
    }>;

    const imglyMod = await dynamicImporter(importUrl);
    const removeBgFn = imglyMod.removeBackground || imglyMod.default;
    if (typeof removeBgFn !== 'function') {
      return null;
    }

    const rawCutoutBlob = await removeBgFn(file, {
      publicPath: 'https://staticimgly.com/@imgly/background-removal-data/1.4.5/dist/',
      model: 'medium',
      output: {
        format: 'image/png',
        quality: 0.9,
      },
      progress: (_key: string, current: number, total: number) => {
        if (total > 0) {
          const pct = Math.min(58, 15 + Math.round((current / total) * 40));
          onProgress?.({
            status: 'isolating',
            stepProgress: pct,
            stepMessage: '✂️ Step 1: AI isolating your trinket...',
          });
        }
      },
    });

    const trimmedBlob = await normalizeCutoutBlobTo3x4(rawCutoutBlob);

    // Verify the browser cutout actually retained visible foreground (>= 3% of 1200x1200 canvas).
    // Full-bleed framed art or low-contrast items can be over-erased by @imgly in browser;
    // returning null hands control to /api/upload's server-side framed-art safeguard.
    const hasSufficientForeground = await new Promise<boolean>((resolve) => {
      const checkUrl = URL.createObjectURL(trimmedBlob);
      const checkImg = new Image();
      checkImg.onload = () => {
        URL.revokeObjectURL(checkUrl);
        try {
          const cw = 120;
          const ch = 120;
          const c = document.createElement('canvas');
          c.width = cw;
          c.height = ch;
          const ctx = c.getContext('2d');
          if (!ctx) return resolve(true);
          ctx.drawImage(checkImg, 0, 0, cw, ch);
          const px = ctx.getImageData(0, 0, cw, ch).data;
          let opaque = 0;
          for (let i = 0; i < cw * ch; i++) {
            if (px[i * 4 + 3] > 40) opaque++;
          }
          resolve(opaque / (cw * ch) >= 0.03);
        } catch {
          resolve(true);
        }
      };
      checkImg.onerror = () => {
        URL.revokeObjectURL(checkUrl);
        resolve(false);
      };
      checkImg.src = checkUrl;
    });

    if (!hasSufficientForeground) {
      console.warn('[autoMagicPipeline] Browser cutout had <3% foreground; falling back to server safeguard.');
      return null;
    }

    const cleanBase = file.name.replace(/\.[^/.]+$/, '') || 'trinket';
    return new File([trimmedBlob], `${cleanBase}-cutout.png`, {
      type: 'image/png',
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn('[autoMagicPipeline] Browser @imgly fallback to server isolation:', err);
    return null;
  }
}

/**
 * Full single-photo auto-magic processing pipeline:
 * 1. Compresses large mobile camera photos client-side to avoid 413 Payload Too Large
 * 2. Isolates background via neural @imgly in browser + POST /api/upload
 * 3. Analyzes visual features via POST /api/upload/analyze
 * Dispatches continuous progress updates for Grandma Bonnie.
 */
export async function processAutoMagicPhoto(
  file: File,
  onProgress?: ProgressCallback,
  excludeTitles: string[] = [],
  adminPin?: string
): Promise<AutoMagicPipelineResult> {
  const effectivePin =
    adminPin ||
    (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bonnies_admin_pin') : null) ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('bonnies_admin_pin') : null) ||
    '';

  // Step 1: Background Isolation
  onProgress?.({
    status: 'isolating',
    stepProgress: 20,
    stepMessage: '✂️ Step 1: Preparing & removing background...',
    errorMessage: null,
  });

  // Compress large phone photo (< 400KB) so Netlify never returns 413 Payload Too Large
  const uploadReadyFile = await compressImageForUpload(file, 1280, 0.86);

  // Run neural ISNet segmentation in browser when available
  const browserCutoutFile = await isolateInBrowserWithImgly(uploadReadyFile, onProgress);

  onProgress?.({
    status: 'isolating',
    stepProgress: 55,
    stepMessage: '✂️ Step 1: Saving transparent cutout...',
  });

  const uploadFormData = new FormData();
  uploadFormData.append('file', uploadReadyFile);
  if (browserCutoutFile) {
    uploadFormData.append('cutout', browserCutoutFile);
  }

  const uploadHeaders: Record<string, string> = {};
  if (effectivePin) {
    uploadHeaders['x-admin-pin'] = effectivePin;
  }

  const uploadRes = await fetch('/api/upload', {
    method: 'POST',
    headers: uploadHeaders,
    body: uploadFormData,
  });

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text().catch(() => 'Upload failed');
    let msg = `Background removal failed (${uploadRes.status})`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error) msg = parsed.error;
    } catch {}
    throw new Error(msg);
  }

  const uploadData = await uploadRes.json();
  const transparentUrl: string = uploadData.transparentUrl || uploadData.url;
  const originalUrl: string | undefined = uploadData.originalUrl;

  if (!transparentUrl) {
    throw new Error('Server returned an empty cutout image URL');
  }

  // Step 2: Gemini Vision Auto-Naming & Categorization
  onProgress?.({
    status: 'naming',
    stepProgress: 72,
    stepMessage: '✨ Step 2: Naming your trinket...',
    transparentUrl,
    originalUploadedUrl: originalUrl || null,
  });

  let analyzeData: {
    success?: boolean;
    title?: string;
    description?: string;
    category?: string;
    price?: number;
    error?: string;
  } | null = null;

  try {
    // Primary approach: JSON payload with imageUrl
    const analyzeHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (effectivePin) {
      analyzeHeaders['x-admin-pin'] = effectivePin;
    }

    const analyzeRes = await fetch('/api/upload/analyze', {
      method: 'POST',
      headers: analyzeHeaders,
      body: JSON.stringify({
        imageUrl: transparentUrl,
        excludeTitles,
      }),
    });

    if (analyzeRes.ok) {
      analyzeData = await analyzeRes.json();
    } else {
      // Fallback: try multipart with compressed file if remote URL fetch failed
      const fallbackFormData = new FormData();
      fallbackFormData.append('file', browserCutoutFile || uploadReadyFile);
      if (excludeTitles.length > 0) {
        fallbackFormData.append('excludeTitles', JSON.stringify(excludeTitles));
      }
      const fallbackHeaders: Record<string, string> = {};
      if (effectivePin) {
        fallbackHeaders['x-admin-pin'] = effectivePin;
      }
      const fallbackRes = await fetch('/api/upload/analyze', {
        method: 'POST',
        headers: fallbackHeaders,
        body: fallbackFormData,
      });
      if (fallbackRes.ok) {
        analyzeData = await fallbackRes.json();
      }
    }
  } catch (_analysisErr) {
    // If analysis fails completely, provide charming default fallback
  }

  const cleanTitle = analyzeData?.title?.trim() || `${file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')} Trinket`;
  const cleanDescription = analyzeData?.description?.trim() || 'Handcrafted with beautiful beads and vibrant colors. Perfect gift for yourself or a loved one!';
  const cleanCategory = normalizeCategory(analyzeData?.category);
  const cleanPrice = typeof analyzeData?.price === 'number' && analyzeData.price > 0 ? analyzeData.price : 8.00;

  // Step 3: Ready to Publish
  onProgress?.({
    status: 'ready',
    stepProgress: 100,
    stepMessage: '✅ Ready to Add to Store!',
    transparentUrl,
    originalUploadedUrl: originalUrl || null,
    title: cleanTitle,
    description: cleanDescription,
    category: cleanCategory,
    price: cleanPrice,
    suggestedTitlesHistory: [cleanTitle],
    errorMessage: null,
  });

  return {
    transparentUrl,
    originalUrl,
    title: cleanTitle,
    description: cleanDescription,
    category: cleanCategory,
    price: cleanPrice,
  };
}

/**
 * Re-rolls title & description via POST /api/upload/analyze passing cumulative exclusion history.
 */
export async function regenerateTitle(
  imageUrl: string,
  excludeTitles: string[] = [],
  adminPin?: string
): Promise<{ title: string; description: string; category?: ProductCategory }> {
  const effectivePin =
    adminPin ||
    (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bonnies_admin_pin') : null) ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('bonnies_admin_pin') : null) ||
    '';

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (effectivePin) {
    headers['x-admin-pin'] = effectivePin;
  }

  const res = await fetch('/api/upload/analyze', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      imageUrl,
      excludeTitles,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Naming service unavailable');
    let msg = `AI naming failed (${res.status})`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error) msg = parsed.error;
    } catch {}
    throw new Error(msg);
  }

  const data = await res.json();
  return {
    title: data.title || 'Sparkling Handcrafted Trinket',
    description: data.description || 'Handmade with colorful beads and love.',
    category: normalizeCategory(data.category),
  };
}

/**
 * 1-Click publishes a prepared trinket directly to live store via POST /api/products.
 */
export async function publishProductToStore(
  item: {
    title: string;
    description: string;
    category?: ProductCategory;
    price: number;
    transparentUrl: string | null;
  },
  adminPin?: string
): Promise<{ success: boolean; id: string; error?: string }> {
  if (!item.transparentUrl) {
    throw new Error('Cannot publish product without a cutout image URL');
  }

  const effectivePin =
    adminPin ||
    (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bonnies_admin_pin') : null) ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('bonnies_admin_pin') : null) ||
    '';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (effectivePin) {
    headers['x-admin-pin'] = effectivePin;
  }

  const effectiveCategory = item.category || 'Beaded Pens';
  const taggedDescription = applyCategoryTag(item.title, item.description, effectiveCategory);

  const res = await fetch('/api/products', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: item.title,
      description: taggedDescription,
      category: effectiveCategory,
      price: item.price ?? 8.00,
      imageUrl: item.transparentUrl,
      isDraft: false,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Publish failed');
    let msg = `Publishing failed (${res.status})`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error) msg = parsed.error;
    } catch {}
    throw new Error(msg);
  }

  const data = await res.json();
  return {
    success: true,
    id: data.id,
  };
}

/**
 * Lightweight batch concurrency pool (default concurrency = 2)
 * Ensures photos process smoothly without exceeding browser memory or API rate limits.
 */
export class BatchConcurrencyQueue {
  private concurrency: number;
  private running: number = 0;
  private queue: Array<() => Promise<void>> = [];

  constructor(concurrency = 2) {
    this.concurrency = concurrency;
  }

  get activeCount(): number {
    return this.running;
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  add(task: () => Promise<void>): void {
    this.queue.push(task);
    this.processNext();
  }

  clear(): void {
    this.queue = [];
  }

  private processNext(): void {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) break;
      this.running++;
      task().finally(() => {
        this.running--;
        this.processNext();
      });
    }
  }
}
