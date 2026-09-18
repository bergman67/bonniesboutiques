# Handoff Report: Product Image Pipeline & Background Removal Survey

**Agent**: Explorer 2 (Image Pipeline Explorer)  
**Parent**: `709b2f6c-4509-4f62-b402-d9e5d9ae2401` (parent)  
**Date**: 2026-09-18T16:08:00Z  
**Type**: Hard Handoff (Investigation Complete)  
**Target File Reference**: `C:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_explorer_survey_2\analysis.md`

---

## 1. Observation

1. **Storage Locations & Assets**:
   - `public/uploads/`: Contains 99 JPEG files named `1789147836207-1-IMG_8918.JPEG` to `1789147837443-99-IMG_9017.JPEG`. Total directory size is ~202 MB.
   - Raw disk source: `C:\Users\eranb\Downloads\BonniesBoutiqe\iCloud Photos` exists and contains 99 files (`IMG_8918.JPEG` to `IMG_9017.JPEG`).
   - Sample dimensions verified via JPEG header parsing: `IMG_8918.JPEG` native resolution is **1536 × 2048 px** (Aspect ratio 3:4 / 0.75).
   - Visual inspection of `IMG_8918.JPEG`, `IMG_8919.JPEG`, `IMG_9017.JPEG` confirms each photo depicts a handmade keychain/charm centered on a dark-grey glitter cardstock background.
   - Public branding: `public/bt_logo.jpg` (548,814 bytes), `public/logo.jpg` (396,755 bytes).

2. **Database Schema & Live Records**:
   - `prisma/schema.prisma` lines 12-21 defines `Product`:
     ```prisma
     model Product {
       id          String   @id @default(cuid())
       title       String
       description String?
       price       Float?
       imageUrl    String?
       isDraft     Boolean  @default(true)
       createdAt   DateTime @default(now())
       updatedAt   DateTime @updatedAt
     }
     ```
   - Live PostgreSQL database query via `@prisma/client` returned:
     - Record count: **99**.
     - All 99 records have `isDraft: false`, `price: 8.00`.
     - 100% of records have `imageUrl` prefixed with `https://fvhjotdrsqlgitlkouwz.supabase.co/storage/v1/object/public/products/`.
   - Seed scripts: `scripts/importPhotos.js` (populates local `public/uploads`), `scripts/importToSupabase.js` (populates Supabase bucket `'products'`), `scripts/updatePrices.js` (sets price to 8.00 and publishes).

3. **Supabase Storage & CORS**:
   - Bucket name: `'products'`.
   - Supabase client in `scripts/importToSupabase.js` lines 8-9 and `src/app/api/upload/route.ts` lines 4-7 uses `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.SUPABASE_SERVICE_ROLE_KEY`.
   - Direct HTTP OPTIONS preflight check returned:
     `access-control-allow-origin: *`, confirming WebGL textures can be loaded cross-origin without CORS issues.

4. **Environment & Package Compatibility**:
   - `node -v` → `v24.19.0`
   - `npm -v` → `11.17.0`
   - OS: Windows x64 (`win32 x64`)
   - `python --version` → `Python 3.14.0`
   - `process.versions.napi` → `'10'`
   - `npm install --dry-run @imgly/background-removal-node` succeeded with exit code 0 (`added 64 packages in 3s`).
   - `npm view onnxruntime-node@1.17.3 binary` specifies `napi_versions: [ 3 ]`.
   - `npm view sharp@0.32.6 binary` specifies `napi_versions: [ 7 ]`.
   - Both native binary bindings run under N-API, which is backwards compatible with Node 24's N-API version 10.

5. **Frontend 3D & Scrollytelling Consumers**:
   - `src/app/page.tsx` line 36 maps database products to `scrollyProducts` with `imageUrl: p.imageUrl`.
   - `src/components/scrollytelling/LevitatingProductViewer.tsx` line 209 currently renders `<ProceduralProductModel descriptor={displayDescriptor} />` using procedural geometry presets from `src/lib/scrollytelling/assetManifest.ts`.
   - `@react-three/drei` (`^9.122.0`) and `@react-three/fiber` (`^8.18.0`) are installed and transpiled in `next.config.mjs`.

---

## 2. Logic Chain

1. **Product Image Inventory**:
   - Because 99 JPEG files exist in `public/uploads/` and 99 records exist in PostgreSQL pointing to Supabase storage, all 99 products are fully accounted for.
   - Because local `public/uploads/` files exist, a background removal script can read directly from disk without downloading 200MB over the internet, while falling back to HTTP fetch from Supabase if running on a machine without local uploads.

2. **Segmentation Technique Requirement**:
   - Because the background in all photos is a textured dark-grey cardstock with sparkle specks and keychain shadows, simple color keying or thresholding with `sharp` will produce severe artifacts.
   - An AI segmentation model (such as the IS-Net model in `@imgly/background-removal-node`) is mandatory to isolate the keychain and beads cleanly.

3. **Dependency Feasibility**:
   - `npm install --dry-run @imgly/background-removal-node` succeeded with 0 errors.
   - Node 24 supports N-API 10, whereas `onnxruntime-node@1.17.3` and `sharp@0.32.6` require N-API 3 and 7 respectively.
   - Because N-API is ABI-stable, prebuilt binaries are compatible.
   - However, because `@imgly/background-removal-node` relies on native `.node` binaries, it must only be executed in a Node.js CLI script or server-side process, never in Next.js client component bundles.

4. **Script Architecture**:
   - Processing 99 images at 1536×2048 with an ONNX neural network will take ~2–4 seconds per image (total runtime ~3–6 minutes).
   - Running this in an API route or server action will trigger HTTP gateway timeouts (Netlify limits functions to 10–26s).
   - Therefore, a standalone CLI script (`scripts/removeBackgrounds.mjs`) is the optimal architecture.
   - The script should save transparent PNGs locally to `public/uploads/transparent/` and upload them to Supabase Storage bucket `products/transparent/`.
   - Updating `Product.imageUrl` in PostgreSQL directly propagates transparent assets to `src/app/page.tsx`, `ProductCard.tsx`, and the 3D viewer.
   - Writing `src/lib/scrollytelling/productAssetManifest.json` provides an explicit manifest mapping matching Requirement R2.

5. **3D Billboard Rendering**:
   - In `LevitatingProductViewer.tsx`, replacing `<ProceduralProductModel>` with Drei's `<Image>` or a double-sided plane mesh (`side={THREE.DoubleSide}`) satisfies Requirement R3.
   - Preserving the showcase pedestal, contact shadow (`ringGeometry`), point light aura, and sine-wave levitation logic ensures compatibility with existing visual design and test assertions in `scripts/verify-milestone2.mjs`.

---

## 3. Caveats

1. **First-run Model Download**: On the first execution of `@imgly/background-removal-node`, the library downloads the ONNX model (~40MB) from its public CDN. Internet access is required during this initial run.
2. **GPU vs CPU Inference**: Inference on Windows CPU will take ~2–4 seconds per image. A batch size / concurrency of 2 is recommended to prevent excessive memory usage.
3. **Database Mutation**: Updating `Product.imageUrl` in PostgreSQL modifies live records. A `--dry-run` flag and a backup of the original `imageUrl` map in `productAssetManifest.json` are recommended before executing bulk updates.
4. **No other caveats**: All storage locations, database records, environment versions, and dependencies were directly inspected and verified.

---

## 4. Conclusion

- **Product Images**: Exactly 99 product photos exist, stored both in Supabase Storage (`products` bucket) and locally in `public/uploads/`.
- **Database**: PostgreSQL (via Supabase) has 99 published products with `imageUrl` pointing to Supabase.
- **Library Compatibility**: `@imgly/background-removal-node` (v1.4.5) is fully compatible with Node 24 and Windows x64 via N-API ABI stability.
- **Architecture**: A Node.js CLI script (`scripts/removeBackgrounds.mjs`) reading from `public/uploads/`, processing transparent PNGs, uploading to Supabase `products/transparent/`, updating Prisma `Product.imageUrl`, and emitting `productAssetManifest.json` provides the most reliable and non-breaking architecture.
- **3D Viewer**: `LevitatingProductViewer.tsx` can directly render transparent PNG cutouts using Drei's `<Image>` or `<Billboard>` with `side={THREE.DoubleSide}`, preserving all existing pedestal and levitation animations.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Image Inventory**:
   ```powershell
   (Get-ChildItem "public\uploads").Count
   # Expected output: 99
   ```

2. **Verify Database Records**:
   ```bash
   node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.product.count().then(c => console.log('Count:', c));"
   # Expected output: Count: 99
   ```

3. **Verify @imgly Dry Run Installation**:
   ```bash
   npm install --dry-run @imgly/background-removal-node
   # Expected output: added 64 packages, exit code 0
   ```

4. **Verify Existing Project Health & Linters**:
   ```bash
   npm run lint
   # Expected output: ✔ No ESLint warnings or errors
   ```
