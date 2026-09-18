# Reviewer 2 Context: Reviewing M3 (3D Billboard Rendering) & Overall Project Integrity

## Scope
1. Review Milestone 3:
   - `src/components/scrollytelling/LevitatingProductViewer.tsx`
   - `src/components/scrollytelling/ScrollyCanvas.tsx`
   - Verify replacement of 3D placeholder geometries with 2D transparent product cutouts/billboards.
   - Verify Drei `<Billboard>`, `<meshStandardMaterial>`, `transparent={true}`, `alphaTest={0.05}`, `depthWrite={true}`, `side={THREE.DoubleSide}`.
   - Verify dynamic aspect ratio sizing and `<React.Suspense>` fallback wrapper.
   - Verify preservation of dual-harmonic levitation math and swap timer lifecycle.
   - Run `node scripts/verify-3d-billboard.mjs`.
2. Overall Integration & Regression:
   - Run `npx next build`
   - Run `node scripts/test-challenger-m2.mjs`
   - Run `node scripts/verify-milestone2.mjs`
   - Run `npm run lint`
3. Provide structured verdict (APPROVE or REQUEST_CHANGES) in `handoff.md`.
