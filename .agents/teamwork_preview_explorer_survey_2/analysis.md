# Technical Analysis: Product Images & Background Removal Pipeline

**Explorer**: Explorer 2 (Image Pipeline Explorer)  
**Date**: 2026-09-18  
**Repository**: `wonderful-hertz` (Bonnie's Boutique)  
**Target Milestone**: Background Removal Script & 3D Billboard Integration (Milestone 3 / R2 & R3)

---

## Executive Summary

Bonnie's Boutique currently hosts 99 product items representing handmade keychains and trinkets. All 99 items are stored both locally in `public/uploads/` and in Supabase Storage (`products` bucket), and are tracked in PostgreSQL via Prisma with `isDraft: false`. Each image is a 1536×2048 portrait photograph showing a handmade charm on a textured dark-grey glitter cardstock surface.

To fulfill Requirement R2 (Background Removal Script) and R3 (3D Billboard Rendering), we evaluated `@imgly/background-removal-node` on Node.js v24.19.0 (win32 x64). The package dependencies resolve cleanly with zero peer dependency conflicts. Both underlying native binary modules (`onnxruntime-node` via N-API 3 and `sharp` via N-API 7) are forward-compatible with Node 24's N-API 10. We recommend a standalone Node CLI script (`scripts/removeBackgrounds.mjs`) that processes images with resumption and concurrency control, saves transparent PNGs locally to `public/uploads/transparent/` and remotely to Supabase Storage `products/transparent/`, updates Prisma `Product.imageUrl`, and emits an asset manifest for frontend fallbacks.

---

## 1. Product Image Storage & Assets Audit

### 1.1 Storage Locations

We identified three distinct storage tiers for product images:

| Tier | Path / Location | Item Count | Details |
|---|---|---|---|
| **Production Cloud** | Supabase Storage bucket `products` | 99 files | Public URLs: `https://fvhjotdrsqlgitlkouwz.supabase.co/storage/v1/object/public/products/<timestamp>-<count>-<filename>.JPEG` |
| **Local Project Assets** | `public/uploads/` | 99 files | Exact local mirrors: `1789147836207-1-IMG_8918.JPEG` to `1789147837443-99-IMG_9017.JPEG`. Total directory size: ~202 MB. |
| **Raw Source Disk** | `C:\Users\eranb\Downloads\BonniesBoutiqe\iCloud Photos` | 99 files | Original raw photos (`IMG_8918.JPEG` to `IMG_9017.JPEG`). |
| **Static Branding** | `public/` | 2 files | `public/bt_logo.jpg` (548 KB), `public/logo.jpg` (396 KB). |

### 1.2 Image Characteristics

- **Format**: JPEG (Baseline DCT, 8-bit color, sRGB).
- **Dimensions**: Native resolution is **1536 × 2048 px** (Aspect ratio 3:4 / 0.75).
- **File Sizes**: Ranging from 678 KB (`IMG_9014.JPEG`) to 2.39 MB (`IMG_8929.JPEG`), averaging ~2.0 MB per image.
- **Subject Matter**: Visual inspection of sample files (`IMG_8918.JPEG`, `IMG_8919.JPEG`, `IMG_9017.JPEG`) confirms each image depicts an isolated handmade keychain (metal carabiner/split ring, clasp, silicone/wooden/resin beads, character charm) resting in the center of a textured dark-grey sparkling backdrop.
- **Segmentation Implication**: Simple RGB color thresholding or luminance keying cannot cleanly separate foreground from background because the backdrop has specular glitter noise and shadows, and several keychains have dark/metallic components. A neural segmentation model (U2Net / IS-Net / RMBG) is required.

### 1.3 CORS & WebGL Texture Verification

When loading textures into Three.js WebGL contexts (`THREE.TextureLoader` or `@react-three/drei` `<Image>`), browser security enforces CORS (`crossOrigin = "anonymous"`).
We verified Supabase Storage HTTP headers directly:
```http
OPTIONS /storage/v1/object/public/products/... HTTP/1.1
Host: fvhjotdrsqlgitlkouwz.supabase.co
Origin: http://localhost:3000

HTTP/1.1 200 OK
access-control-allow-origin: *
access-control-allow-methods: GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS,TRACE,CONNECT
```
**Finding**: Supabase Storage explicitly serves `access-control-allow-origin: *`. Textures hosted on Supabase Storage can be directly mounted onto Three.js materials without CORS errors. Local `/uploads/` URLs are same-origin and also work without restriction.

---

## 2. Database Schema, Seed Scripts & Manifest Mapping

### 2.1 Prisma Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-3.0.x", "debian-openssl-3.0.x"]
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

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

### 2.2 Live Database Audit

Direct query to PostgreSQL via Prisma Client:
- **Total Product Records**: Exactly **99**.
- **`isDraft` Status**: All 99 records have `isDraft: false`.
- **Pricing**: All 99 records have `price: 8.00`.
- **`imageUrl` Value**: 100% (99/99) currently point to `https://fvhjotdrsqlgitlkouwz.supabase.co/storage/v1/object/public/products/<timestamp>-<count>-<name>.JPEG`.

### 2.3 Existing Scripts & API Endpoints

1. **`scripts/importPhotos.js`**:
   Reads `C:\Users\eranb\Downloads\BonniesBoutiqe\iCloud Photos`, copies to `public/uploads`, and creates draft products with `imageUrl: /uploads/${destFilename}`.
2. **`scripts/importToSupabase.js`**:
   Reads `iCloud Photos`, uploads buffer to Supabase bucket `products` using `SUPABASE_SERVICE_ROLE_KEY`, and creates products with `price: 8.00`, `isDraft: false`, and `imageUrl: publicUrl`.
3. **`scripts/updatePrices.js`**:
   Executes `prisma.product.updateMany({ data: { price: 8.00, isDraft: false } })`.
4. **`src/app/api/upload/route.ts`**:
   Receives multipart file upload, uploads to Supabase storage bucket `products` using `@supabase/supabase-js`, and returns `{ success: true, url: publicUrl }`.
5. **`src/app/api/products/route.ts` & `[id]/route.ts`**:
   CRUD endpoints reading/writing `Product` records, including `imageUrl`.
6. **`src/lib/scrollytelling/assetManifest.ts`**:
   Defines procedural 3D model descriptors (`MODEL_PRESETS`) and 2D sprite configs (`SPRITE_CONFIGS`). Currently does not track isolated product PNG cutouts.

---

## 3. Environment & Library Compatibility Assessment

### 3.1 Runtime Environment

- **Node.js**: `v24.19.0`
- **npm**: `11.17.0` (npm lockfile version 3)
- **Platform**: Windows 10/11 x64 (`win32 x64`)
- **N-API Supported Version**: `10` (from `process.versions.napi`)
- **Python**: `3.14.0` available at system level

### 3.2 Candidate 1: `@imgly/background-removal-node` (Primary Recommendation)

- **Latest npm Release**: `1.4.5`
- **Internal Dependencies**:
  - `onnxruntime-node@1.17.3`
  - `sharp@0.32.6`
  - `ndarray@1.0.19`
  - `zod@3.21.4`
  - `lodash@4.17.21`
- **Installation Dry-Run Verification**:
  ```bash
  npm install --dry-run @imgly/background-removal-node
  # Result: added 64 packages in 3s, exit code 0.
  ```
- **N-API ABI Compatibility**:
  - `onnxruntime-node@1.17.3` prebuilds target N-API version 3.
  - `sharp@0.32.6` prebuilds target N-API version 7.
  - Node.js 24 provides N-API version 10. By Node-API design, N-API is ABI-stable and backwards compatible across major Node releases.
- **Model Fetching & Caching**:
  - By default, `@imgly/background-removal-node` downloads the fine-tuned IS-Net ONNX model (~40 MB) upon first execution from CDN and caches it locally.
  - System network access to npm and HTTPS endpoints is functional.
- **Webpack / Next.js Bundler Warning**:
  - `@imgly/background-removal-node` includes native bindings (`.node` files) and C++ modules.
  - **CRITICAL**: Do NOT import `@imgly/background-removal-node` in client components or any file imported by `page.tsx` or `LevitatingProductViewer.tsx`. It must be restricted to standalone CLI scripts or server scripts.

### 3.3 Candidate 2: `@xenova/transformers` (Fallback 1)

- Can run Hugging Face ONNX models (`briaai/RMBG-1.4` or `Xenova/modnet`) in Node.js.
- Requires downloading ~170MB model weights. Good fallback if `@imgly` encounters unexpected runtime errors on specific image types.

### 3.4 Candidate 3: Python `rembg` (Fallback 2)

- Python 3.14 is installed.
- Can be invoked via `pip install rembg` and CLI command `rembg i <input> <output>`.
- Serves as an independent fallback if Node C++ addons ever encounter Windows environment constraints.

---

## 4. Recommended Background Removal & Data Pipeline Architecture

### 4.1 Script Type & Location

We recommend creating:
`scripts/removeBackgrounds.mjs`

**Rationale for CLI Script over HTTP Server Route**:
1. **Execution Time**: Running neural inference across 99 images at 1536×2048 takes ~2–4 seconds per image (~3–6 minutes total). An HTTP API route would exceed serverless and local request timeouts (Netlify limit is 10–26s).
2. **Resource Management**: A CLI script allows controlled concurrency (processing 2 images at a time) to prevent memory spikes in Node.js.
3. **Idempotency**: The script can check if the output PNG already exists in `public/uploads/transparent/` or Supabase, skipping already processed images and allowing fast incremental reruns.
4. **Developer Usability**: Can be executed via `npm run remove-bg` or `node scripts/removeBackgrounds.mjs --limit 5` for testing.

### 4.2 Pipeline Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Read Product Records from Prisma Database (99 items)     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Resolve Source Image Buffer                              │
│    - Fast path: Check local public/uploads/<filename>       │
│    - Fallback: fetch(product.imageUrl) as ArrayBuffer       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Execute Background Removal (@imgly or fallback)          │
│    - Optional: Resize to max 1024px for WebGL efficiency    │
│    - Output: Transparent RGBA PNG Buffer                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Save & Upload Transparent Asset                          │
│    - Local: public/uploads/transparent/<name>.png           │
│    - Cloud: Supabase Storage products/transparent/<name>.png│
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Update Database & Asset Manifest                         │
│    - Prisma: prisma.product.update({ data: { imageUrl } })  │
│    - Manifest: src/lib/scrollytelling/productAssetManifest  │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Output File Strategy

1. **Local Output Directory**:
   `public/uploads/transparent/`
   Filename convention: `transparent-${filenameWithoutExt}.png`
   Local URL: `/uploads/transparent/transparent-${filenameWithoutExt}.png`

2. **Supabase Cloud Storage**:
   Upload to bucket: `'products'`
   Destination path: `transparent/transparent-${filenameWithoutExt}.png`
   Content-Type: `'image/png'`
   Public URL: `https://fvhjotdrsqlgitlkouwz.supabase.co/storage/v1/object/public/products/transparent/transparent-${filenameWithoutExt}.png`

### 4.4 Database & Manifest Update Strategy

1. **Prisma Update**:
   Update `imageUrl` for each product in PostgreSQL:
   ```ts
   await prisma.product.update({
     where: { id: product.id },
     data: { imageUrl: newTransparentUrl },
   });
   ```
   - **Impact**: Zero breaking changes. `src/app/page.tsx` already queries `prisma.product.findMany()` and feeds `imageUrl` into both `ScrollytellingExperience` and `ProductCard`.

2. **Static Asset Manifest Fallback**:
   Write `src/lib/scrollytelling/productAssetManifest.json`:
   ```json
   {
     "updatedAt": "2026-09-18T16:00:00.000Z",
     "total": 99,
     "products": [
       {
         "id": "cmu1mpip90000fsjllmsu8n4q",
         "title": "Trinket #1",
         "originalUrl": "https://fvhjotdrsqlgitlkouwz.supabase.co/storage/v1/object/public/products/1789413687897-1-IMG_8918.JPEG",
         "transparentLocalUrl": "/uploads/transparent/transparent-1789413687897-1-IMG_8918.png",
         "transparentCloudUrl": "https://fvhjotdrsqlgitlkouwz.supabase.co/storage/v1/object/public/products/transparent/transparent-1789413687897-1-IMG_8918.png",
         "aspectRatio": 0.75
       }
     ]
   }
   ```
   - **Impact**: Satisfies Requirement R2 ("update the database or asset manifest to point to these new transparent assets"). Allows offline, mock, and test environments to resolve transparent cutouts immediately.

---

## 5. 3D Billboard Rendering Integration (Requirement R3)

### 5.1 Architecture in `LevitatingProductViewer.tsx`

Currently, `LevitatingProductViewer.tsx` renders `<ProceduralProductModel descriptor={displayDescriptor} />` inside a floating `group` with sine-wave levitation, tilt, and turntable rotation.

To satisfy Requirement R3 ("replace placeholder geometries with actual isolated product images levitating as 2D paper cutouts in 3D space"):
1. Retain the showcase pedestal (`cylinderGeometry`), dynamic contact shadow ring (`ringGeometry`), point light aura (`displayDescriptor.pedestalAura`), and drag turntable interaction.
2. In place of `<ProceduralProductModel>`, render a 2D cutout plane using `@react-three/drei` `<Image>` or a custom `<mesh>` with `<planeGeometry args={[1.5, 2]}>` and `<meshBasicMaterial map={texture} transparent alphaTest={0.01} side={THREE.DoubleSide} />`.
3. Setting `side={THREE.DoubleSide}` gives the authentic "2D paper cutout rotating in 3D space" aesthetic requested in the prompt.
4. If `product.imageUrl` is null or loading, gracefully fall back to `<ProceduralProductModel>`.

---

## 6. Implementation Risk Matrix & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Node 24 native build compilation issue | Low | High | Prebuilt binaries already exist via N-API 3 and 7; if native bindings fail, fallback to `@xenova/transformers` or Python `rembg`. |
| Memory exhaustion processing 99 images | Medium | Medium | Implement queue with concurrency = 2; garbage collect buffer references between iterations. |
| Netlify build timeout during deployment | Low | High | Run image processing locally or in CI as an ahead-of-time CLI script; do not run background removal during `next build`. |
| Next.js client bundler error | Medium | High | Keep `@imgly/background-removal-node` strictly in `scripts/` or `devDependencies`; never import in `src/`. |
| WebGL texture CORS block | Very Low | High | Verified Supabase returns `Access-Control-Allow-Origin: *`. Also local `/uploads/transparent/` provides a local fallback. |
