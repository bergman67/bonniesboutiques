## 2026-09-18T16:17:37Z
You are Worker 3 (3D Billboard Rendering Implementer).
Your working directory is C:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_worker_m3

Read ORIGINAL_REQUEST.md at:
C:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\ORIGINAL_REQUEST.md

Read Explorer 3 findings at:
C:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_explorer_survey_3\handoff.md
C:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_explorer_survey_3\analysis.md

Read Worker 2 findings (transparent PNG assets & manifest) at:
C:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_worker_m2\handoff.md

Read PROJECT.md at:
C:\Users\eranb\Documents\antigravity\wonderful-hertz\PROJECT.md

Exclusive Write Ownership:
You own:
- src/components/scrollytelling/LevitatingProductViewer.tsx
- src/components/scrollytelling/ScrollyCanvas.tsx (if Suspense wrapper is needed)
- scripts/verify-3d-billboard.mjs

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks:
1. Update `src/components/scrollytelling/LevitatingProductViewer.tsx`:
   - Replace the placeholder 3D geometry rendering (`<ProceduralProductModel descriptor={displayDescriptor} />`) with a 2D cutout plane/billboard rendering the transparent product image.
   - Use Drei's `<Billboard>` and/or plane mesh with transparent material (`transparent={true}`, `alphaTest={0.05}`, `depthWrite={true}`, `side={THREE.DoubleSide}`).
   - Support loading texture from `product.imageUrl` (or local manifest fallback if offline).
   - Compute dynamic aspect ratio from texture dimensions to ensure no image stretching.
   - Use `<meshStandardMaterial>` so the cutout catches directional sunlight and the pedestal's glowing aura point light.
   - Wrap texture-loading components in `<React.Suspense>` fallback to prevent React 18 suspension crashes.
   - CRITICAL INVARIANT: Preserve verbatim lines and functionality for test suites:
     * `const floatOffset = Math.sin(t * 1.8) * 0.12 + Math.sin(t * 3.6) * 0.025;`
     * `modelGroupRef.current.position.y = 0.85 + floatOffset;`
     * `modelGroupRef.current.rotation.y = t * 0.6 + dragRotation;`
     * `onPointerDown`, `onPointerMove`, `onPointerUp` drag rotation logic
     * `downTimer` and `upTimer` with `clearInterval` for smooth swap transitions.
2. Implement `scripts/verify-3d-billboard.mjs` verifying:
   - `LevitatingProductViewer.tsx` renders 2D transparent billboard plane instead of placeholder 3D geometries.
   - Drei `<Billboard>` and texture loading are used.
   - Material transparency (`alphaTest={0.05}`, `transparent={true}`, `side={THREE.DoubleSide}`) is configured.
   - Dual-harmonic levitation math and swap timer logic remain intact.
3. Run:
   - `npm run lint`
   - `node scripts/verify-3d-billboard.mjs`
   - `node scripts/test-challenger-m2.mjs`
   - `node scripts/verify-milestone2.mjs`
   - `node scripts/verify-about-section.mjs`
   - `node scripts/verify-background-removal.mjs`
4. Write your handoff report to C:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_worker_m3\handoff.md and notify your parent via send_message.
