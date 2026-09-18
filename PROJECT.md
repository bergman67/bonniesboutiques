# Project: Bonnie's Boutiques — Generational Crafting & 3D Levitating Cutouts

## Architecture
- **Framework**: Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS
- **3D Graphics**: Three.js (`three` 0.170.0) + React Three Fiber (`@react-three/fiber` 8.18.0) + Drei (`@react-three/drei` 9.122.0)
- **Database & Storage**: PostgreSQL via Prisma (`@prisma/client`), Supabase Storage (`products` bucket), local fallback (`public/uploads`)
- **Image Processing**: Node.js backend CLI with `@imgly/background-removal-node` using ONNX neural network segmentation
- **Component Flow**:
  - `src/app/page.tsx` loads products from Prisma, renders `#about` section and `<ScrollytellingExperience>`.
  - `ScrollytellingExperience.tsx` manages viewport scroll state and passes `activeProduct` with `imageUrl` to `ScrollyCanvas.tsx`.
  - `ScrollyCanvas.tsx` renders R3F `<Canvas>` containing `<LevitatingProductViewer>`.
  - `LevitatingProductViewer.tsx` renders floating 3D pedestal, aura, and floating 2D transparent cutout billboard with dual-harmonic levitation.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | About Copy Update | Remove "16-bit", highlight generational crafting (Bonnie & Tammy), mention variety of animations | M1 | R1, survey_1 | DONE |
| 2 | Storefront Copy Polish | Clean up "16-bit" mentions in `ScrollytellingExperience.tsx`, harmonize Bonnie & Tammy descriptions | M1 | survey_1 | DONE |
| 3 | Background Removal Package | Install `@imgly/background-removal-node` for node runtime CLI/server usage | M2 | R2, survey_2 | DONE |
| 4 | Background Removal Script | Backend script (`scripts/removeBackgrounds.mjs`) to strip backgrounds from photos into transparent PNGs | M2 | R2, survey_2 | DONE |
| 5 | Asset Storage & Manifest | Save transparent PNGs to `public/uploads/transparent/` and/or Supabase, update `Product.imageUrl` / `productAssetManifest.json` | M2 | R2, survey_2 | DONE |
| 6 | 3D Billboard Cutout Component | Render transparent product images as 2D levitating billboards in `LevitatingProductViewer.tsx` | M3 | R3, survey_3 | DONE |
| 7 | Transparency & Depth Material | Configure `alphaTest={0.05}`, `transparent={true}`, `depthWrite={true}`, `side={THREE.DoubleSide}` for clean depth sorting | M3 | R3, survey_3 | DONE |
| 8 | Suspense & Fallback Guard | Wrap texture loading in `<React.Suspense>` fallback to protect canvas against unmounting | M3 | survey_3 | DONE |
| 9 | Levitation & Animation Invariants | Preserve dual-harmonic levitation math (`floatOffset = Math.sin(...)`) and drag rotation | M3 | survey_3 | DONE |
| 10 | Automated Copy & Feature Verification | Automated assertions for About copy, transparent PNG generation, and 3D billboard rendering | M4 | AC1-3, survey_1,2,3 | DONE |
| 11 | Challenger & Forensic Audit | Verification of build/lint, empirical behavior, and anti-cheat forensic integrity | M4 | system constraints | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | About Section Update | Update `src/app/page.tsx`, `ScrollytellingExperience.tsx`, `ProductHUD.tsx` copy; ensure no "16-bit", emphasize generational crafting & animations | none | DONE |
| M2 | Background Removal Script & Assets | Install `@imgly/background-removal-node`, create `scripts/removeBackgrounds.mjs`, process product photos to transparent PNGs, update manifest/DB | none | DONE |
| M3 | 3D Billboard Rendering | Update `LevitatingProductViewer.tsx` to render transparent cutouts via billboard planes with lighting, transparency, suspense, and levitation | M2 | DONE |
| M4 | Comprehensive Verification & Audit | Run all verification scripts, tests, builds, reviewer checks, challenger tests, and forensic auditor | M1, M2, M3 | DONE |

## Interface Contracts
### Product Photo Processing ↔ 3D Billboard Viewer
- Output transparent assets path: `public/uploads/transparent/<filename>.png` and `https://.../storage/v1/object/public/products/transparent/<filename>.png`
- `Product.imageUrl`: updated in PostgreSQL via Prisma to point to transparent Supabase URLs.
- Manifest lookup: `src/lib/scrollytelling/productAssetManifest.json` provides offline fallback mapping for all 100 products.
- `LevitatingProductViewer`: expects `product.imageUrl` to resolve to a transparent PNG. Renders double-sided billboard plane with `<meshStandardMaterial>` and `alphaTest={0.05}`, catching scene sunlight and pedestal aura point light.

### Copy Contract (About Section)
- Eyebrow / Headline: `✦ Generational Crafting ✦`, `Made by Bonnie & Tammy, with generational heart`.
- Text: explicitly contains `"generational crafting"` and `"animations"`.
- Text: zero occurrences of `"16-bit"` in customer-facing rendered copy.

## Code Layout
- `src/app/page.tsx`: About section copy and product list mapping
- `src/components/scrollytelling/ScrollytellingExperience.tsx`: Hero & descent copy
- `src/components/scrollytelling/LevitatingProductViewer.tsx`: 3D showcase, billboard plane cutout, levitation loop
- `src/components/scrollytelling/ScrollyCanvas.tsx`: Three.js Canvas container with Suspense
- `scripts/removeBackgrounds.mjs`: Node.js CLI script for background removal
- `public/uploads/transparent/`: Generated transparent PNG assets (198 files)
- `src/lib/scrollytelling/productAssetManifest.json`: Generated asset manifest for cutouts (100 entries)
- `scripts/verify-about-section.mjs`: Automated verification for copy constraints (13 checks)
- `scripts/verify-background-removal.mjs`: Automated verification for background removal & manifest (6 checks)
- `scripts/verify-3d-billboard.mjs`: Automated verification for 3D billboard rendering (20 checks)
