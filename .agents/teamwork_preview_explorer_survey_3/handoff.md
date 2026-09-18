# Handoff Report: 3D Levitating Product Viewer Survey

## 1. Observation

1. **File Locations and Component Hierarchy**:
   - `src/components/scrollytelling/LevitatingProductViewer.tsx` (214 lines) renders the interactive 3D product showcase.
   - `src/components/scrollytelling/ScrollyCanvas.tsx` instantiates `<LevitatingProductViewer product={activeProduct} pedestalPosition={[0, -0.6, 0]} />` inside a `<Canvas>` (line 230).
   - `src/app/page.tsx` maps database products (`prisma.product.findMany`) to `{ id, title, price, imageUrl, description }` and passes them to `<ScrollytellingExperience>`.
   - `LevitatingProductViewer.tsx` defines:
     ```typescript
     export interface ProductItem {
       id: string;
       title: string;
       price?: number | null;
       imageUrl?: string | null;
       description?: string | null;
     }
     ```
     However, `product.imageUrl` is completely unused in the component! Lines 36–42 resolve:
     ```typescript
     const [displayDescriptor, setDisplayDescriptor] = useState<ModelDescriptor>(() =>
       getPlaceholderGeometry(product.id, product.title)
     );
     ```
     And lines 208–210 render:
     ```tsx
     <group ref={modelGroupRef} position={[0, 0.85, 0]}>
       <ProceduralProductModel descriptor={displayDescriptor} />
     </group>
     ```

2. **Placeholder Geometries**:
   - `src/lib/scrollytelling/assetManifest.ts` (lines 72–274) defines 8 procedural presets: `facetedGem`, `enchantedRing`, `potionVial`, `resinCharm`, `celestialOrb`, `heartPendant`, `crystalKeychain`, `starTalisman`.
   - `src/lib/scrollytelling/proceduralPrimitives.tsx` (lines 60–349) renders these as 3D extruded shapes, octahedrons, and cylinders using Three.js `MeshPhysicalMaterial`.

3. **Dependencies & Versions**:
   - `package.json` contains:
     - `@react-three/drei`: `^9.122.0`
     - `@react-three/fiber`: `^8.18.0`
     - `three`: `^0.170.0`
     - `next`: `14.2.35`
     - `react`: `^18`
   - Node execution test confirmed:
     `Billboard: object, Image: object, Float: object, useTexture: function`.

4. **Missing React Suspense in Canvas**:
   - In `src/components/scrollytelling/ScrollyCanvas.tsx`, the R3F `<Canvas>` does not wrap its children in `<Suspense>`. Calling `useTexture` or Drei's `<Image>` without a `<Suspense>` boundary triggers an uncaught suspension in React 18 and unmounts/crashes the canvas.

5. **Existing Acceptance Test Constraints**:
   - `scripts/verify-all-acceptance-criteria.mjs` (lines 356–410) and `scripts/test-challenger-m2.mjs` (lines 289–291) assert verbatim strings:
     - `const floatOffset = Math.sin(t * 1.8) * 0.12 + Math.sin(t * 3.6) * 0.025`
     - `modelGroupRef.current.position.y = 0.85 + floatOffset`
     - `modelGroupRef.current.rotation.y = t * 0.6 + dragRotation`
     - `onPointerDown`, `onPointerMove`, `onPointerUp`
     - `let downTimer: ReturnType<typeof setInterval> | null = null;`
     - `let upTimer: ReturnType<typeof setInterval> | null = null;`
     - `clearInterval(downTimer)` and `clearInterval(upTimer)`

---

## 2. Logic Chain

1. **R3 Goal**: The user request and Requirement R3 mandate replacing placeholder 3D geometries with 2D transparent product cutouts/billboards levitating in 3D space.
2. **Data Availability**: The database and `src/app/page.tsx` already supply `imageUrl` in `ProductItem`, but `LevitatingProductViewer.tsx` ignores it in favor of `getPlaceholderGeometry`.
3. **Transparency & Depth Sorting**:
   - Using standard `transparent={true}` alone causes WebGL depth-buffer conflicts: transparent pixels (alpha = 0) write to the Z-buffer, causing rectangular clipping boxes around the cutout that occlude the pedestal, aura, velvet pillow, and celestial starfield.
   - Adding `alphaTest={0.05}` discards transparent fragments (`discard;`), leaving the depth buffer clean for background objects while allowing opaque cutout pixels to write depth, receive light, and cast shadows.
   - Adding `side={THREE.DoubleSide}` allows the cutout to be visible from both sides during 3D turntable rotation.
4. **Lighting**:
   - Drei's `<Image>` uses an unlit custom `shaderMaterial` that does not respond to scene lights.
   - Using `<mesh>` with `<planeGeometry>` and `<meshStandardMaterial map={texture} transparent alphaTest={0.05} side={THREE.DoubleSide} roughness={0.35} metalness={0.05} />` integrates directly with the existing `directionalLight` and the pedestal's colored `pointLight` aura (`displayDescriptor.pedestalAura`).
5. **Orientation & Billboarding**:
   - Wrapping the plane in Drei's `<Billboard follow={true}>` ensures the cutout faces the camera throughout the 4-phase GSAP scroll descent.
6. **Sizing & Aspect Ratio**:
   - Reading `texture.image.naturalWidth` and `naturalHeight` on load enables dynamic calculation of plane dimensions (`args={[w, h]}`), guaranteeing trinkets and keychains are never stretched or distorted.
7. **Crash Prevention**:
   - Wrapping the cutout component in `<React.Suspense fallback={<CutoutLoadingFallback />}>` prevents React 18 suspension crashes in `ScrollyCanvas`.

---

## 3. Caveats

1. **Background Removal Script Dependency**: The 2D cutout plane expects transparent PNG assets. If original JPEG photos (with background) are fed into the cutout before background removal (R2) is completed, they will render as rectangular photos rather than isolated cutouts.
2. **CORS on Remote Images**: When loading remote Supabase images via `useTexture` / WebGL, the server must support `crossOrigin = 'anonymous'`. Local assets stored in `public/` (e.g. `/uploads/...` or `/cutouts/...`) avoid CORS concerns entirely.
3. **Test Suite Invariants**: The existing verification scripts enforce exact string matches in `LevitatingProductViewer.tsx` for levitation equations, rotation, and timer cleanup. The implementer must keep those exact lines intact while swapping only the inner model group.

---

## 4. Conclusion

1. The 3D viewer pipeline is well-structured and fully functional.
2. Replacing placeholder geometries with 2D levitating cutouts is cleanly achievable by substituting `<ProceduralProductModel descriptor={displayDescriptor} />` in `LevitatingProductViewer.tsx` with a `<ProductCutoutPlane>` component.
3. The replacement should use:
   - Drei's `<Billboard>` for camera-facing orientation.
   - `meshStandardMaterial` with `transparent={true}`, `alphaTest={0.05}`, `side={THREE.DoubleSide}`, `depthWrite={true}` for physical lighting and artifact-free depth sorting.
   - Dynamic aspect ratio sizing from `texture.image`.
   - `<React.Suspense>` fallback wrapper for crash-proof asset loading.
   - Existing dual-harmonic levitation math and dual-timer swap lifecycle to preserve all automated test criteria.

---

## 5. Verification Method

1. **Inspect Analysis Report**:
   - View `C:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_explorer_survey_3\analysis.md`.
2. **Run Existing Test Suite**:
   ```powershell
   node scripts/verify-all-acceptance-criteria.mjs
   ```
   Confirm that AC4 (Levitating 3D models and smooth swapping) verifies the required timer and levitation equations.
3. **Verify Drei Exports**:
   ```powershell
   node -e "const d = require('@react-three/drei'); console.log(!!d.Billboard, !!d.Image, !!d.Float, !!d.useTexture);"
   ```
   Expected output: `true true true true`.
4. **Check Build Integrity**:
   ```powershell
   npm run build
   ```
   Confirm Next.js route generation and compilation succeed.
