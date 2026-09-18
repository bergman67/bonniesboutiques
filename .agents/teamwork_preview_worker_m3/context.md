# Worker 3 Context: Milestone 3 (3D Billboard Rendering in LevitatingProductViewer)

## Objective
Implement Requirement R3:
Update `src/components/scrollytelling/LevitatingProductViewer.tsx` so that instead of rendering placeholder 3D geometries (`<ProceduralProductModel descriptor={displayDescriptor} />`), it renders the transparent product image as a 2D floating cutout plane/billboard.

## Key Technical Specifications
1. **Source of Image**:
   - `product.imageUrl` passed into `LevitatingProductViewer`.
   - Also fallback/lookup in `src/lib/scrollytelling/productAssetManifest.json` or local `/uploads/transparent/...` if needed.
2. **Material & Transparency**:
   - Use `useTexture` or Drei `<Image>` / `<Billboard>`.
   - Set `transparent={true}`, `alphaTest={0.05}`, `depthWrite={true}`, `side={THREE.DoubleSide}` to prevent rectangular clipping artifacts and allow the glowing pedestal aura and celestial starfield to be seen through transparent areas.
   - Use dynamic aspect ratio based on texture dimensions (`texture.image.naturalWidth / texture.image.naturalHeight`) so keychains and trinkets are never stretched.
   - Use `<meshStandardMaterial>` or illuminated material responding to scene lighting and the pedestal pointLight.
3. **Suspense Guard**:
   - Wrap the texture-loading component in `<React.Suspense fallback={<CutoutFallback />}>` so that loading textures does not trigger an uncaught React 18 suspension crash.
4. **Preserve Levitation & Swapping Invariants**:
   - In `LevitatingProductViewer.tsx`, preserve the exact levitation equation:
     `const floatOffset = Math.sin(t * 1.8) * 0.12 + Math.sin(t * 3.6) * 0.025;`
   - Preserve `modelGroupRef.current.position.y = 0.85 + floatOffset;`
   - Preserve `modelGroupRef.current.rotation.y = t * 0.6 + dragRotation;`
   - Preserve pointer drag events (`onPointerDown`, `onPointerMove`, `onPointerUp`).
   - Preserve `downTimer` and `upTimer` with `clearInterval` for smooth swap transitions.
5. **Testing & Verification**:
   - Create `scripts/verify-3d-billboard.mjs` to verify:
     - `LevitatingProductViewer.tsx` no longer uses placeholder geometries for active products.
     - Renders 2D billboard / plane with transparent product texture.
     - Transparency (`alphaTest`), `Billboard` / `DoubleSide` configured.
     - Levitation equations and timer cleanup intact.
   - Run `npm run lint`, `node scripts/verify-about-section.mjs`, `node scripts/verify-background-removal.mjs`, `node scripts/verify-3d-billboard.mjs`, `node scripts/test-challenger-m2.mjs`, and `node scripts/verify-milestone2.mjs`.
