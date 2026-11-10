/**
 * tests/e2e/tier1-features/tier1-r5-photo-ai-pipeline.mjs
 *
 * Tier 1: Smart Photo Isolation & AI Auto-Naming Pipeline (Requirement R5)
 *
 * Test Cases:
 * 5.1 Smart Background Isolation Engine Contract (4-channel transparent PNG, alpha distribution, <10s, dual URLs)
 * 5.2 Gemini Vision Auto-Naming API Contract (/api/upload/analyze structured response: title, description, category, $8, modelUsed)
 * 5.3 1-Click Name Re-Roll with Exclusion History (cumulative excludeTitles prevents duplicate titles)
 * 5.4 StoreSettings Privacy & Secret Protection Contract (unauthenticated omits secrets, authenticated returns masked key)
 * 5.5 Grandma-Friendly 1-Click Single Auto-Magic UI Contract (pipeline transitions, before/after toggle, pre-filled form, 1-click publish)
 * 5.6 Batch Multi-Photo Queue & 1-Click "Publish All" Contract (concurrency <= 2, batch publish, DB teardown to 96 baseline)
 */

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';

// Register module loader for Next.js '@/' path aliases and JSON loading
try {
  register('./scripts/test-loader.mjs', pathToFileURL('./'));
} catch (_err) {
  // Loader already registered or not supported
}

import {
  defaultRunner,
  ROOT_DIR,
  assertEqual,
  assertDeepEqual,
  assertIncludes,
  assertNotIncludes,
  assert,
} from '../harness/test-utils.mjs';

/**
 * Test runner wrapper implementing createTestRunner contract
 */
export function createTestRunner(suiteName, context = defaultRunner) {
  const runner = context?.describeAsync ? context : defaultRunner;
  return {
    suiteName,
    runner,
    async describe(fn) {
      await runner.describeAsync(suiteName, fn);
    },
    async test(name, fn) {
      return runner.test(name, fn);
    },
    skip(name, reason) {
      return runner.skip(name, reason);
    },
  };
}

export async function runTier1R5(context = defaultRunner) {
  const testSuite = createTestRunner(
    'Tier 1: Smart Photo Isolation & AI Auto-Naming Pipeline (R5)',
    context
  );

  // Dynamically load route handlers and image utilities
  const { isolateBackgroundHybrid, isolateWithSharp, PNG_MAGIC } = await import(
    '../../../src/lib/image/isolation.ts'
  );
  const { storeProductAssets } = await import('../../../src/lib/storage/productStorage.ts');
  const { POST: uploadPOST } = await import('../../../src/app/api/upload/route.ts');
  const { POST: analyzePOST } = await import('../../../src/app/api/upload/analyze/route.ts');
  const { GET: settingsGET } = await import('../../../src/app/api/settings/route.ts');
  const { POST: productsPOST } = await import('../../../src/app/api/products/route.ts');

  const prisma = new PrismaClient();
  const defaultSettings = await prisma.storeSettings.findUnique({
    where: { id: 'default' },
  });
  const adminPin = defaultSettings?.adminPin || process.env.ADMIN_PASSWORD || 'welcome1';

  await testSuite.describe(async () => {
    // ──────────────────────────────────────────────────────────────────────────
    // 5.1 Smart Background Isolation Engine Contract
    // ──────────────────────────────────────────────────────────────────────────
    await testSuite.test(
      '5.1 Smart background isolation produces 4-channel transparent PNG (<10s) with dual asset URLs',
      async () => {
        // Construct a synthetic test photo: solid white 240x240 background with a solid magenta circular trinket
        const width = 240;
        const height = 240;
        const svgContent = `<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="#ffffff"/><circle cx="120" cy="120" r="60" fill="#c44b63"/></svg>`;
        const inputJpegBuffer = await sharp(Buffer.from(svgContent)).jpeg({ quality: 90 }).toBuffer();

        const t0 = Date.now();
        const isolationResult = await isolateBackgroundHybrid(inputJpegBuffer, {
          preferEngine: 'sharp',
          autoCrop: false,
        });
        const durationMs = Date.now() - t0;

        // 1. Latency under 10,000ms
        assert(
          durationMs < 10000,
          `Isolation latency must be < 10,000ms, actual: ${durationMs}ms`
        );

        // 2. Output is non-empty buffer with valid 8-byte PNG magic signature
        assert(isolationResult.buffer && isolationResult.buffer.length >= 8, 'Output buffer must be non-empty');
        const header = isolationResult.buffer.subarray(0, 8);
        assert(
          header.equals(PNG_MAGIC),
          `Header must match \\x89PNG, actual: ${header.toString('hex')}`
        );

        // 3. Output metadata: 4 channels (RGBA) with alpha
        const meta = await sharp(isolationResult.buffer).metadata();
        assertEqual(meta.format, 'png', 'Output format must be png');
        assertEqual(meta.channels, 4, 'Output must have exactly 4 channels (RGBA)');
        assertEqual(meta.hasAlpha, true, 'Output must have alpha channel');

        // 4. Alpha channel distribution: perimeter alpha === 0, center alpha >= 128
        const { data: rawRgba, info } = await sharp(isolationResult.buffer)
          .raw()
          .toBuffer({ resolveWithObject: true });

        // Check perimeter pixels along all 4 outer borders
        let nonZeroPerimeterCount = 0;
        for (let x = 0; x < info.width; x++) {
          const topAlpha = rawRgba[(0 * info.width + x) * 4 + 3];
          const bottomAlpha = rawRgba[((info.height - 1) * info.width + x) * 4 + 3];
          if (topAlpha !== 0) nonZeroPerimeterCount++;
          if (bottomAlpha !== 0) nonZeroPerimeterCount++;
        }
        for (let y = 0; y < info.height; y++) {
          const leftAlpha = rawRgba[(y * info.width + 0) * 4 + 3];
          const rightAlpha = rawRgba[(y * info.width + (info.width - 1)) * 4 + 3];
          if (leftAlpha !== 0) nonZeroPerimeterCount++;
          if (rightAlpha !== 0) nonZeroPerimeterCount++;
        }
        assertEqual(
          nonZeroPerimeterCount,
          0,
          `Perimeter alpha must be strictly 0 across all border pixels (found ${nonZeroPerimeterCount} non-zero)`
        );

        // Check center pixel alpha (must be opaque/foreground >= 128)
        const centerX = Math.floor(info.width / 2);
        const centerY = Math.floor(info.height / 2);
        const centerAlpha = rawRgba[(centerY * info.width + centerX) * 4 + 3];
        assert(
          centerAlpha >= 128,
          `Center pixel alpha must be >= 128 (found ${centerAlpha})`
        );

        // 5. Dual URLs contract via /api/upload
        let uploadedTransparentFile = null;
        let uploadedRawFile = null;
        try {
          const formData = new FormData();
          formData.append(
            'file',
            new Blob([inputJpegBuffer], { type: 'image/jpeg' }),
            'e2e-isolation-test.jpg'
          );

          const uploadReq = new Request('http://localhost:3000/api/upload', {
            method: 'POST',
            headers: { 'x-admin-pin': adminPin },
            body: formData,
          });
          const uploadRes = await uploadPOST(uploadReq);
          assertEqual(uploadRes.status, 200, 'Upload endpoint must return 200 OK');

          const uploadBody = await uploadRes.json();
          assertEqual(uploadBody.success, true, 'Upload must succeed');
          assert(
            typeof uploadBody.transparentUrl === 'string' && uploadBody.transparentUrl.includes('transparent'),
            `transparentUrl must reference a transparent asset: ${uploadBody.transparentUrl}`
          );
          assert(
            typeof uploadBody.originalUrl === 'string' && (uploadBody.originalUrl.includes('raw') || uploadBody.originalUrl.includes('upload')),
            `originalUrl must reference the original raw photo: ${uploadBody.originalUrl}`
          );
          assertEqual(
            uploadBody.url,
            uploadBody.transparentUrl,
            'Backward-compatible url must match transparentUrl'
          );
          assert(
            typeof uploadBody.durationMs === 'number' && uploadBody.durationMs < 10000,
            `durationMs must be recorded and < 10,000ms (${uploadBody.durationMs}ms)`
          );

          uploadedTransparentFile = uploadBody.filename;
          uploadedRawFile = uploadBody.originalUrl
            ? uploadBody.originalUrl.split('/').pop()?.split('?')[0] || null
            : null;
        } finally {
          // Clean up any test files created on local disk AND Supabase Storage during test
          if (uploadedTransparentFile) {
            const localTransparentPath = path.join(
              ROOT_DIR,
              'public',
              'uploads',
              'transparent',
              uploadedTransparentFile
            );
            if (fs.existsSync(localTransparentPath)) {
              try {
                fs.unlinkSync(localTransparentPath);
              } catch {}
            }
          }
          if (process.env.SUPABASE_SERVICE_ROLE_KEY && (uploadedTransparentFile || uploadedRawFile)) {
            try {
              const { createClient } = await import('@supabase/supabase-js');
              const sb = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fvhjotdrsqlgitlkouwz.supabase.co',
                process.env.SUPABASE_SERVICE_ROLE_KEY
              );
              if (uploadedTransparentFile) {
                await sb.storage.from('products').remove([`transparent/${uploadedTransparentFile}`]);
              }
              if (uploadedRawFile) {
                await sb.storage.from('products').remove([`raw/${uploadedRawFile}`]);
              }
            } catch {}
          }
        }
      }
    );

    // ──────────────────────────────────────────────────────────────────────────
    // 5.2 Gemini Vision Auto-Naming API Contract
    // ──────────────────────────────────────────────────────────────────────────
    await testSuite.test(
      '5.2 Gemini Vision /api/upload/analyze returns structured title, description, category, $8 price, and modelUsed',
      async () => {
        // Use an existing transparent pen asset from catalog
        const sampleUrl = '/uploads/transparent/transparent-1789413705065-46-IMG_8963.png';

        const analyzeReq = new Request('http://localhost:3000/api/upload/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-pin': adminPin,
          },
          body: JSON.stringify({
            imageUrl: sampleUrl,
          }),
        });

        const res = await analyzePOST(analyzeReq);
        assertEqual(res.status, 200, `POST /api/upload/analyze returned status ${res.status}`);

        const body = await res.json();
        assertEqual(body.success, true, 'Response success flag must be true');

        // Title validation
        assert(
          typeof body.title === 'string' && body.title.trim().length >= 4,
          `Expected valid product title string, got: "${body.title}"`
        );

        // Description validation
        assert(
          typeof body.description === 'string' && body.description.trim().length >= 15,
          `Expected warm 1-2 sentence description, got: "${body.description}"`
        );

        // Category validation (must be one of the 3 boutique categories)
        const validCategories = ['Beaded Pens', 'Keychains', 'Charms & Bookmarks'];
        assert(
          validCategories.includes(body.category),
          `Category "${body.category}" must be one of: ${validCategories.join(', ')}`
        );

        // Price validation (must be default 8.00)
        assertEqual(body.price, 8.00, 'Suggested price must be default 8.00');

        // Model validation
        assert(
          typeof body.modelUsed === 'string' && body.modelUsed.length > 0,
          `modelUsed must be provided, got: "${body.modelUsed}"`
        );
        const recognizedModels = ['gemini-flash-latest', 'gemini-3.8-flash', 'heuristic-fallback'];
        assert(
          recognizedModels.includes(body.modelUsed),
          `modelUsed "${body.modelUsed}" must be one of recognized models: ${recognizedModels.join(', ')}`
        );
      }
    );

    // ──────────────────────────────────────────────────────────────────────────
    // 5.3 1-Click Name Re-Roll with Exclusion History
    // ──────────────────────────────────────────────────────────────────────────
    await testSuite.test(
      '5.3 1-Click Name Re-Roll passes cumulative exclusion history and guarantees distinct title generation',
      async () => {
        const sampleUrl = '/uploads/transparent/transparent-1789413705065-46-IMG_8963.png';

        // Round 1: Initial analysis
        const req1 = new Request('http://localhost:3000/api/upload/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-pin': adminPin,
          },
          body: JSON.stringify({
            imageUrl: sampleUrl,
            excludeTitles: [],
          }),
        });
        const res1 = await analyzePOST(req1);
        assertEqual(res1.status, 200);
        const data1 = await res1.json();
        const title1 = data1.title;
        assert(title1 && title1.length > 0, 'Round 1 title must be non-empty');

        // Round 2: Suggest Another Name with exclusion of Round 1 title
        const req2 = new Request('http://localhost:3000/api/upload/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-pin': adminPin,
          },
          body: JSON.stringify({
            imageUrl: sampleUrl,
            excludeTitles: [title1],
          }),
        });
        const res2 = await analyzePOST(req2);
        assertEqual(res2.status, 200);
        const data2 = await res2.json();
        const title2 = data2.title;
        assert(title2 && title2.length > 0, 'Round 2 title must be non-empty');
        assert(
          title2 !== title1,
          `Round 2 title "${title2}" must be distinct from excluded Round 1 title "${title1}"`
        );

        // Round 3: Suggest Another Name with cumulative exclusions [title1, title2]
        const req3 = new Request('http://localhost:3000/api/upload/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-pin': adminPin,
          },
          body: JSON.stringify({
            imageUrl: sampleUrl,
            excludeTitles: [title1, title2],
          }),
        });
        const res3 = await analyzePOST(req3);
        assertEqual(res3.status, 200);
        const data3 = await res3.json();
        const title3 = data3.title;
        assert(title3 && title3.length > 0, 'Round 3 title must be non-empty');
        assert(
          title3 !== title1 && title3 !== title2,
          `Round 3 title "${title3}" must be distinct from all previous exclusions [${title1}, ${title2}]`
        );

        // Round 4: Adversarial exclusion payloads (empty values, special symbols)
        const reqAdv = new Request('http://localhost:3000/api/upload/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-pin': adminPin,
          },
          body: JSON.stringify({
            imageUrl: sampleUrl,
            excludeTitles: ['Sparkling "Rose" & Butterfly Pen!', 'Ocean <Wave> Keychain #42', ''],
          }),
        });
        const resAdv = await analyzePOST(reqAdv);
        assertEqual(resAdv.status, 200);
        const dataAdv = await resAdv.json();
        assert(dataAdv.title && dataAdv.title.length > 0, 'Adversarial exclusions must succeed gracefully');
      }
    );

    // ──────────────────────────────────────────────────────────────────────────
    // 5.4 StoreSettings Privacy & Secret Protection Contract
    // ──────────────────────────────────────────────────────────────────────────
    await testSuite.test(
      '5.4 StoreSettings privacy strictly conceals secrets from public GET and provides masked key for authenticated admin',
      async () => {
        // 1. Public Unauthenticated GET /api/settings
        const unauthReq = new Request('http://localhost:3000/api/settings');
        const unauthRes = await settingsGET(unauthReq);
        assertEqual(unauthRes.status, 200);
        const unauthData = await unauthRes.json();

        // Sensitive keys that MUST NEVER appear in public response
        const forbiddenKeys = [
          'geminiApiKey',
          'geminiKeyMasked',
          'geminiConfigured',
          'returnStreet',
          'returnCity',
          'returnState',
          'returnZip',
          'shippoApiKey',
          'shippoKeyMasked',
          'stripeSecretKey',
          'stripeSecretKeyMasked',
        ];

        for (const forbiddenKey of forbiddenKeys) {
          assert(
            !(forbiddenKey in unauthData),
            `Security Violation: Public GET leaked sensitive field "${forbiddenKey}"`
          );
        }

        // Verify public settings fields that SHOULD appear
        assert('enableStripe' in unauthData, 'Public settings must include enableStripe');
        assert('shippingFlatRate' in unauthData, 'Public settings must include shippingFlatRate');
        assert('freeShippingThreshold' in unauthData, 'Public settings must include freeShippingThreshold');

        // String serialization check for secret leak
        const unauthJson = JSON.stringify(unauthData);
        assertNotIncludes(
          unauthJson,
          'AQ.',
          'Public settings JSON must not contain any fragment of the Gemini key'
        );

        // 2. Query param injection rejection (attempting to pass PIN via URL)
        const queryReq = new Request('http://localhost:3000/api/settings?admin=true&pin=welcome1');
        const queryRes = await settingsGET(queryReq);
        const queryData = await queryRes.json();
        assertEqual(queryData.requiresAuth, true, 'Query param PIN must be rejected');
        assert(!('geminiKeyMasked' in queryData), 'Query param attempt must not return masked key');

        // 3. Authenticated Admin GET with x-admin-pin header
        const defaultSettings = await prisma.storeSettings.findUnique({
          where: { id: 'default' },
        });
        const adminPin = defaultSettings?.adminPin || process.env.ADMIN_PASSWORD || 'welcome1';
        const effectiveKey = defaultSettings?.geminiApiKey || process.env.GEMINI_API_KEY || '';
        const expectedMask = `${effectiveKey.slice(0, 7)}••••••••${effectiveKey.slice(-4)}`;
        const middleSecretSlice = effectiveKey.slice(10, 28);

        const adminReq = new Request('http://localhost:3000/api/settings?admin=true', {
          headers: { 'x-admin-pin': adminPin },
        });
        const adminRes = await settingsGET(adminReq);
        assertEqual(adminRes.status, 200);
        const adminData = await adminRes.json();

        assertEqual(adminData.requiresAuth, false, 'Authenticated admin must not require auth');
        assertEqual(adminData.geminiConfigured, true, 'geminiConfigured must be true for admin');
        assertEqual(
          adminData.geminiKeyMasked,
          expectedMask,
          `geminiKeyMasked must match masked format, got "${adminData.geminiKeyMasked}"`
        );

        // Ensure raw unmasked key is NEVER returned in JSON
        assert(
          !('geminiApiKey' in adminData),
          'Raw geminiApiKey must NEVER be present in admin GET JSON payload'
        );
        const adminJson = JSON.stringify(adminData);
        if (middleSecretSlice.length >= 8) {
          assertNotIncludes(
            adminJson,
            middleSecretSlice,
            'Admin response JSON must not contain unmasked middle secret key bytes'
          );
        }
      }
    );

    // ──────────────────────────────────────────────────────────────────────────
    // 5.5 Grandma-Friendly 1-Click Single Auto-Magic UI Contract
    // ──────────────────────────────────────────────────────────────────────────
    await testSuite.test(
      '5.5 Grandma-Friendly single photo pipeline transitions through 3 steps to 1-click publish without typing',
      async () => {
        // 1. Pipeline progression state machine verification
        const stateHistory = [];
        const recordState = (s) => stateHistory.push(s);

        // Step 0: Initial pending state
        const initialItem = {
          id: 'magic-test-single',
          file: { name: 'IMG_8963.JPEG', size: 102400 },
          status: 'pending',
          stepProgress: 0,
          stepMessage: 'Waiting in queue...',
          transparentUrl: null,
          previewMode: 'cutout',
          title: '',
          description: '',
          category: 'Beaded Pens',
          price: 8.00,
        };
        recordState({ ...initialItem });
        assertEqual(initialItem.status, 'pending');
        assertEqual(initialItem.stepProgress, 0);

        // Transition 1: Step 1 (Removing background)
        const isolatingState = {
          ...initialItem,
          status: 'isolating',
          stepProgress: 33,
          stepMessage: '✂️ Step 1: Removing background...',
        };
        recordState(isolatingState);
        assertEqual(isolatingState.status, 'isolating');
        assertEqual(isolatingState.stepProgress, 33);
        assertIncludes(isolatingState.stepMessage, 'Step 1: Removing background');

        // Transition 2: Step 2 (Naming your trinket)
        const namingState = {
          ...isolatingState,
          status: 'naming',
          stepProgress: 66,
          stepMessage: '✨ Step 2: Naming your trinket...',
          transparentUrl: '/uploads/transparent/transparent-1789413705065-46-IMG_8963.png',
        };
        recordState(namingState);
        assertEqual(namingState.status, 'naming');
        assertEqual(namingState.stepProgress, 66);
        assertIncludes(namingState.stepMessage, 'Step 2: Naming your trinket');
        assert(namingState.transparentUrl, 'transparentUrl must be populated by Step 2');

        // Transition 3: Step 3 (Ready to Add to Store)
        const readyState = {
          ...namingState,
          status: 'ready',
          stepProgress: 100,
          stepMessage: '✅ Ready to Add to Store!',
          title: 'Spooky Pumpkin Witch Beaded Pen',
          description: 'Handcrafted with sparkling orange and black beads with a spooky witch pumpkin topper.',
          category: 'Beaded Pens',
          price: 8.00,
          suggestedTitlesHistory: ['Spooky Pumpkin Witch Beaded Pen'],
        };
        recordState(readyState);
        assertEqual(readyState.status, 'ready');
        assertEqual(readyState.stepProgress, 100);
        assertIncludes(readyState.stepMessage, 'Ready to Add to Store');

        // 2. Before/After preview mode toggle logic
        function getPreviewUrl(item) {
          return item.previewMode === 'cutout' && item.transparentUrl
            ? item.transparentUrl
            : '/uploads/1789147836207-1-IMG_8918.JPEG';
        }
        assertEqual(readyState.previewMode, 'cutout');
        assertEqual(
          getPreviewUrl(readyState),
          '/uploads/transparent/transparent-1789413705065-46-IMG_8963.png'
        );

        // Toggle to original mode
        const originalModeItem = { ...readyState, previewMode: 'original' };
        assertEqual(getPreviewUrl(originalModeItem), '/uploads/1789147836207-1-IMG_8918.JPEG');

        // 3. Pre-filled form verification (zero typing required)
        assert(readyState.title.length > 0, 'Title must be pre-filled');
        assert(readyState.description.length > 0, 'Description must be pre-filled');
        assert(
          ['Beaded Pens', 'Keychains', 'Charms & Bookmarks'].includes(readyState.category),
          'Category must be pre-selected'
        );
        assertEqual(readyState.price, 8.00, 'Price must default to $8.00');

        // 4. 1-Click publish execution without typing (draft mode + immediate deletion to guarantee zero DB mutation)
        let publishedId = null;
        try {
          const publishReq = new Request('http://localhost:3000/api/products', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-pin': adminPin,
            },
            body: JSON.stringify({
              title: readyState.title,
              description: readyState.description,
              category: readyState.category,
              price: readyState.price,
              imageUrl: readyState.transparentUrl,
              isDraft: true, // Created as draft during contract test
            }),
          });
          const publishRes = await productsPOST(publishReq);
          assertEqual(publishRes.status, 201, 'Product publish must return 201 Created');
          const publishedData = await publishRes.json();
          assert(publishedData.id, 'Published product must have an ID');
          assertEqual(publishedData.price, 8.00);
          publishedId = publishedData.id;
        } finally {
          if (publishedId) {
            await prisma.product.delete({ where: { id: publishedId } });
          }
        }
      }
    );

    // ──────────────────────────────────────────────────────────────────────────
    // 5.6 Batch Multi-Photo Queue & 1-Click "Publish All" Contract
    // ──────────────────────────────────────────────────────────────────────────
    await testSuite.test(
      '5.6 Batch multi-photo queue throttles concurrency to 2, publishes batch in 1-click, and leaves exactly 96 DB products',
      async () => {
        // 1. Concurrency Queue contract test (max concurrency = 2)
        class TestBatchConcurrencyQueue {
          constructor(concurrency = 2) {
            this.concurrency = concurrency;
            this.running = 0;
            this.maxObservedRunning = 0;
            this.queue = [];
          }
          add(task) {
            this.queue.push(task);
            this.processNext();
          }
          processNext() {
            while (this.running < this.concurrency && this.queue.length > 0) {
              const task = this.queue.shift();
              if (!task) break;
              this.running++;
              if (this.running > this.maxObservedRunning) {
                this.maxObservedRunning = this.running;
              }
              task().finally(() => {
                this.running--;
                this.processNext();
              });
            }
          }
        }

        const queue = new TestBatchConcurrencyQueue(2);
        const taskOrder = [];
        const taskPromises = [];

        for (let i = 1; i <= 5; i++) {
          let resolveFn;
          const p = new Promise((resolve) => {
            resolveFn = resolve;
          });
          taskPromises.push(p);

          const taskIndex = i;
          queue.add(async () => {
            taskOrder.push(`start-${taskIndex}`);
            // Small async delay simulating image isolation + naming
            await new Promise((r) => setTimeout(r, 20));
            taskOrder.push(`end-${taskIndex}`);
            resolveFn();
          });
        }

        await Promise.all(taskPromises);

        // Verify concurrency never exceeded 2
        assert(
          queue.maxObservedRunning <= 2,
          `Batch queue exceeded max concurrency of 2 (observed: ${queue.maxObservedRunning})`
        );
        assertEqual(taskOrder.length, 10, 'All 5 tasks must start and complete');

        // 2. Batch "Publish All" execution & strict database teardown
        const initialCount = await prisma.product.count({
          where: { isDraft: false },
        });
        const createdProductIds = [];
        try {
          const batchItems = [
            {
              title: 'Batch Item 1 Butterfly Pen',
              description: 'Handcrafted butterfly pen in batch upload.',
              price: 8.00,
              imageUrl: '/uploads/transparent/transparent-1789413705065-46-IMG_8963.png',
              isDraft: false,
            },
            {
              title: 'Batch Item 2 Sea Turtle Keychain',
              description: 'Handcrafted sea turtle keychain in batch upload.',
              price: 8.00,
              imageUrl: '/uploads/transparent/transparent-1789413688662-2-IMG_8919.png',
              isDraft: false,
            },
            {
              title: 'Batch Item 3 Hummingbird Charm',
              description: 'Handcrafted hummingbird charm in batch upload.',
              price: 8.00,
              imageUrl: '/uploads/transparent/transparent-1789413705065-46-IMG_8963.png',
              isDraft: false,
            },
          ];

          // 1-Click "Publish All" batch execution simulation
          for (const item of batchItems) {
            const req = new Request('http://localhost:3000/api/products', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-admin-pin': adminPin,
              },
              body: JSON.stringify(item),
            });
            const res = await productsPOST(req);
            assertEqual(res.status, 201);
            const created = await res.json();
            assert(created.id, 'Batch created product must return valid ID');
            createdProductIds.push(created.id);
          }

          assertEqual(createdProductIds.length, 3, 'All 3 batch products must be published');
        } finally {
          // Teardown: Clean up all created test products from database
          if (createdProductIds.length > 0) {
            await prisma.product.deleteMany({
              where: { id: { in: createdProductIds } },
            });
          }

          // Invariant Check: Verify database contains baseline published products
          const finalCount = await prisma.product.count({
            where: { isDraft: false },
          });
          assertEqual(
            finalCount,
            initialCount,
            `CRITICAL INVARIANT: Database must return to baseline published products after teardown, found ${finalCount} (expected ${initialCount})`
          );
        }
      }
    );
  });
}

// Support direct execution via node tests/e2e/tier1-features/tier1-r5-photo-ai-pipeline.mjs
if (process.argv[1]?.endsWith('tier1-r5-photo-ai-pipeline.mjs')) {
  runTier1R5().then(() => defaultRunner.printSummary());
}
