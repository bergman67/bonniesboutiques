# BRIEFING — 2026-09-18T16:24:00Z

## Mission
Implement 3D billboard rendering for LevitatingProductViewer using transparent product cutouts, Drei Billboard, texture loading with aspect ratio preservation, while strictly preserving dual-harmonic levitation and interactive drag rotation.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: C:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_worker_m3
- Original parent: 709b2f6c-4509-4f62-b402-d9e5d9ae2401
- Milestone: Milestone 3 - 3D Billboard Rendering

## 🔒 Key Constraints
- Preserve exact dual-harmonic levitation math:
  `const floatOffset = Math.sin(t * 1.8) * 0.12 + Math.sin(t * 3.6) * 0.025;`
  `modelGroupRef.current.position.y = 0.85 + floatOffset;`
  `modelGroupRef.current.rotation.y = t * 0.6 + dragRotation;`
- Preserve onPointerDown, onPointerMove, onPointerUp drag rotation logic verbatim.
- Preserve downTimer and upTimer with clearInterval for smooth swap transitions.
- Replace placeholder 3D geometry with 2D transparent billboard plane.
- Drei `<Billboard>` and plane mesh with transparent material (`transparent={true}`, `alphaTest={0.05}`, `depthWrite={true}`, `side={THREE.DoubleSide}`).
- Use `<meshStandardMaterial>` so the cutout catches directional sunlight and the pedestal's glowing aura point light.
- Texture loading from product.imageUrl with local manifest fallback if offline. Wrap in React.Suspense fallback.
- Dynamic aspect ratio from texture dimensions to prevent distortion.
- Exclusive Write Ownership:
  * src/components/scrollytelling/LevitatingProductViewer.tsx
  * src/components/scrollytelling/ScrollyCanvas.tsx (if Suspense wrapper is needed)
  * scripts/verify-3d-billboard.mjs

## Current Parent
- Conversation ID: 709b2f6c-4509-4f62-b402-d9e5d9ae2401
- Updated: 2026-09-18T16:24:00Z

## Task Summary
- **What to build**: Transparent 2D Billboard in Drei for LevitatingProductViewer with dynamic aspect ratio, Suspense fallback, lighting responsiveness, verified with scripts.
- **Success criteria**: Tests pass, lint passes, existing test suites pass, Next.js build passes.
- **Interface contracts**: PROJECT.md

## Change Tracker
- **Files modified**:
  * `src/components/scrollytelling/LevitatingProductViewer.tsx`: Replaced placeholder 3D geometries with 2D Billboard cutout plane using Drei `<Billboard follow={true}>`, `useTexture`, dynamic aspect ratio preservation, `meshStandardMaterial` with `transparent={true}`, `alphaTest={0.05}`, `depthWrite={true}`, `side={THREE.DoubleSide}`, Suspense fallback, and ErrorBoundary protection, while preserving all levitation and timer invariants verbatim.
  * `src/components/scrollytelling/ScrollyCanvas.tsx`: Wrapped `LevitatingProductViewer` in `<Suspense fallback={null}>` boundary to prevent React 18 suspension crashes.
  * `scripts/verify-3d-billboard.mjs`: Added automated 20-check verification suite for 3D billboard rendering.
- **Build status**: PASS (`next build` and all 6 verification scripts exited code 0).
- **Pending issues**: None.

## Quality Status
- **Build/test result**: PASS (20/20 in verify-3d-billboard, 8/8 in verify-milestone2, all suites pass in test-challenger-m2, 13/13 in verify-about-section, 6/6 in verify-background-removal).
- **Lint status**: PASS (`npm run lint` exited code 0 with 0 warnings or errors).
- **Tests added/modified**: `scripts/verify-3d-billboard.mjs` (20 automated assertions).

## Loaded Skills
None

## Key Decisions Made
- Used `<Billboard follow={true}>` to orient the cutout plane toward the camera during the 4-phase descent.
- Configured `<meshStandardMaterial>` with `alphaTest={0.05}` and `depthWrite={true}` so transparent background pixels are discarded without writing to Z-buffer, while foreground pixels cast/receive shadows and respond to directional sunlight and pedestal aura point light.
- Implemented dynamic aspect ratio normalization from `texture.image.naturalWidth / naturalHeight` within a max dimension of 1.35.
- Added `TextureErrorBoundary` and `Suspense` with wireframe placeholder for 100% resilient rendering.
- Maintained exact verbatim lines for dual-harmonic levitation, turntable rotation, and dual-timer swap intervals to satisfy all automated challenger suites.

## Artifact Index
- .agents/teamwork_preview_worker_m3/DISPATCH.md
- .agents/teamwork_preview_worker_m3/BRIEFING.md
- .agents/teamwork_preview_worker_m3/progress.md
- .agents/teamwork_preview_worker_m3/handoff.md
