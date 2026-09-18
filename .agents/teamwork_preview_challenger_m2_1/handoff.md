# Handoff Report: Milestone 2 Empirical Review & Adversarial Challenge

**Agent:** Challenger 1 (`teamwork_preview_challenger_m2_1`)  
**Role:** Empirical Challenger / Critic  
**Date:** 2026-09-18T14:07:30Z  
**Target:** Parent Orchestrator (`865d87ee-c5c8-419a-99a5-435791cbb37a`)  
**Verdict:** **REQUEST_CHANGES**  

---

## 1. Observation

### 1.1 Baseline Build & Verification Runs
1. Ran `npm run lint`:
   ```
   ✔ No ESLint warnings or errors
   Exit code: 0
   ```
2. Ran `npm run build`:
   ```
   ✔ Generated Prisma Client (v5.22.0) to .\node_modules\@prisma\client in 52ms
   ✓ Compiled successfully
   ✓ Generating static pages (10/10)
   Route (app)                              Size     First Load JS
   ┌ ƒ /                                    52.3 kB         154 kB
   ├ ○ /_not-found                          138 B          87.6 kB
   ├ ○ /admin                               2.9 kB          104 kB
   ├ ƒ /api/checkout                        0 B                0 B
   ├ ƒ /api/products                        0 B                0 B
   ├ ƒ /api/products/[id]                   0 B                0 B
   ├ ƒ /api/upload                          0 B                0 B
   ├ ○ /checkout                            5.19 kB         107 kB
   └ ƒ /products/[id]                       2.76 kB         104 kB
   Exit code: 0
   ```
3. Ran `node scripts/verify-milestone2.mjs`:
   ```
   ALL MILESTONE 2 ARCHITECTURE & CODE CHECKS PASSED (8/8)
   Exit code: 0
   ```

### 1.2 Empirical Stress-Test Execution (`node scripts/test-challenger-m2.mjs`)
Ran independent empirical suite across all 4 scope dimensions:
```
===============================================================
  MILESTONE 2 EMPIRICAL CHALLENGER VERIFICATION & STRESS TEST
===============================================================

--- 1. Camera Trajectory Math & Boundary Stress Tests ---
  ✔ Negative out-of-bounds correctly clamped to p=0
  ✔ Positive out-of-bounds correctly clamped to p=1
  🔍 Continuity at p=0.25: targetX delta = 0.799952 (at 0.25: 0.000000, at 0.25001: 0.799952)
     ⚠️ JUMP DISCONTINUITY DETECTED: targetX abruptly jumps ~0.8 units crossing p=0.25!
  ✔ Continuity at p=0.5:  targetX delta = 0.000016 (smooth)
  ✔ Continuity at p=0.75: targetX delta = 0.000000 (smooth)

--- 2. Levitation Physics & Contact Shadow Scaling ---
  ✔ Levitation offset bounds: [-0.1289, 0.1288]
  ✔ Non-zero periodic amplitude: 0.1288
  ✔ Contact shadow inverse scaling: 125/125 (100.0%)

--- 3. Product Swapping & Navigation Bounds ---
  ✔ Wrap-around cyclic navigation (forward & backward): PASS
  ✔ 5,000 rapid randomized navigation clicks: PASS

--- 4. Empty & Malformed Product List Fallback ---
  ✔ Empty product list fallback ([]) produces safe placeholder: PASS
  ✔ Undefined product list fallback produces safe placeholder: PASS

--- 5. Empirical Test of LevitatingProductViewer Timer Lifecycle ---
  ⚠️ ORPHANED TIMER RACE CONDITION CONFIRMED:
     Old click-1 upInterval continued firing after click-2 started down-interval!
     transitionScale suffered conflicting updates between scale-down and scale-up.
```

### 1.3 Exact Code Findings
1. **Camera Trajectory Jump at `p = 0.25`** (`src/components/scrollytelling/ScrollyCanvas.tsx`, lines 152–163):
   ```tsx
   152: if (p <= 0.25) {
   153:   const t = p / 0.25;
   154:   targetX = THREE.MathUtils.lerp(0, 0.8 * Math.sin(t * Math.PI), t);
   155:   targetY = THREE.MathUtils.lerp(8.0, 5.5, t);
   156:   targetZ = THREE.MathUtils.lerp(14.0, 10.0, t);
   157:   lookY = THREE.MathUtils.lerp(2.0, 1.5, t);
   158: } else if (p <= 0.5) {
   159:   const t = (p - 0.25) / 0.25;
   160:   targetX = THREE.MathUtils.lerp(0.8, -0.4, t);
   161:   targetY = THREE.MathUtils.lerp(5.5, 3.2, t);
   162:   targetZ = THREE.MathUtils.lerp(10.0, 6.8, t);
   163:   lookY = THREE.MathUtils.lerp(1.5, 0.8, t);
   ```
   At `p = 0.25` (`t = 1.0`), `0.8 * Math.sin(1.0 * Math.PI)` equals `0`, so `targetX` evaluates to `0.0`.  
   Immediately at `p = 0.25001` (`t = 0.0`), line 160 executes `lerp(0.8, -0.4, 0) = 0.8`.  
   This causes `targetX` to step instantly from `0.0` to `0.8` (step magnitude `0.799952`).

2. **Orphaned `upInterval` Timer in Product Swapping** (`src/components/scrollytelling/LevitatingProductViewer.tsx`, lines 45–72):
   ```tsx
   45: useEffect(() => {
   46:   const newDesc = getPlaceholderGeometry(product.id, product.title);
   47:   targetDescriptorRef.current = newDesc;
   48: 
   49:   let progress = 1;
   50:   const interval = setInterval(() => {
   51:     progress -= 0.15;
   52:     if (progress <= 0) {
   53:       clearInterval(interval);
   54:       setDisplayDescriptor(newDesc);
   55:       // Animate back up
   56:       let upProgress = 0;
   57:       const upInterval = setInterval(() => {
   58:         upProgress += 0.15;
   59:         if (upProgress >= 1) {
   60:           clearInterval(upInterval);
   61:           setTransitionScale(1);
   62:         } else {
   63:           setTransitionScale(upProgress);
   64:         }
   65:       }, 16);
   66:     } else {
   67:       setTransitionScale(progress);
   68:     }
   69:   }, 16);
   70: 
   71:   return () => clearInterval(interval);
   72: }, [product.id, product.title]);
   ```
   `upInterval` (line 57) is instantiated inside the callback of `interval` after `progress <= 0`.  
   The cleanup function (line 71) only executes `clearInterval(interval)`. It has no reference to `upInterval`.  
   When a user navigates products rapidly while `upInterval` is ticking (between ~120ms and 240ms), the new effect starts decrementing `transitionScale` while the orphaned `upInterval` continues setting `transitionScale = upProgress` and `1.0`, resulting in conflicting state updates and scale flickering.

3. **Potential Null Dereference in Fallback** (`src/components/scrollytelling/ScrollytellingExperience.tsx`, line 46):
   ```tsx
   46: const activeProducts = products.length > 0
   47:   ? products
   48:   : [ ... fallback ... ];
   ```
   If a consumer explicitly passes `products={null as any}`, accessing `products.length` will throw `TypeError: Cannot read properties of null (reading 'length')`.

---

## 2. Logic Chain

1. **Camera Trajectory Continuity**:
   - *From Observation 1.2 & 1.3.1*, evaluating the piecewise camera trajectory function reveals `targetX(0.25) = 0.000000` and `targetX(0.25001) = 0.799952`.
   - In `ScrollyCanvas.tsx`, camera motion is smoothed using `camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.08)`.
   - Although the lerp dampens instantaneous teleportation, an un-smoothed jump of 0.8 units in the setpoint causes the camera to jerk horizontally toward +0.8 when scrolling across the 25% threshold, contradicting the intended seamless celestial descent into the boutique.

2. **Transition Timer Lifecycle & Race Condition**:
   - *From Observation 1.2 & 1.3.2*, the down-animation interval takes `ceil(1 / 0.15) * 16ms = ~112ms`, and the up-animation interval takes an additional `~112ms` (total transition time `~224ms`).
   - If a product change event occurs while `upInterval` is running, React runs the previous effect's cleanup.
   - Because `return () => clearInterval(interval)` cannot clear `upInterval`, `upInterval` remains alive in the JavaScript event loop.
   - The new effect starts a new interval decrementing `progress` from 1.0 downward, while `upInterval` concurrently increments `upProgress` upward, creating an interleaved race condition on `setTransitionScale`.

3. **Baseline Strengths**:
   - The production build passes with 0 errors and generates all 10 App Router routes.
   - Levitation equation achieves non-zero amplitude (0.1288) with 100% inverse contact shadow scaling.
   - Empty product list fallback is robust when given `[]` or omitted parameters.
   - CartContext integration correctly passes `{ id, title, imageUrl, price }` without modifying any backend checkout routes.

---

## 3. Caveats

- WebGL rendering behavior was tested via Next.js SSR build compilation, Three.js headless mathematical evaluations, and Node timer harnesses. Browser GPU rasterization was not tested on physical mobile hardware.
- The 0.8 `targetX` discontinuity does not crash the application, but it creates a visible camera hitch during scroll scrubbing.

---

## 4. Conclusion & Required Changes

**Verdict:** **REQUEST_CHANGES**

To ensure high visual fidelity and eliminate animation race conditions before Milestone 3, the following two targeted fixes are requested from Worker M2:

### Required Change 1: Fix Camera Trajectory Continuity at `p = 0.25`
In `src/components/scrollytelling/ScrollyCanvas.tsx`:
Modify line 154 so that Phase 1 smoothly arrives at the Phase 2 starting position (`targetX = 0.8`), or align Phase 2 to start at the Phase 1 endpoint:
```tsx
// Option A: Arc out and arrive at 0.8 at t=1.0:
targetX = THREE.MathUtils.lerp(0, 0.8, Math.sin(t * Math.PI * 0.5));
// Or Option B: Smooth linear/cubic transition to 0.8:
targetX = THREE.MathUtils.lerp(0, 0.8, t);
```
*Result*: Eliminates the 0.8 unit jump at `p = 0.25` and ensures smooth continuous camera trajectory.

### Required Change 2: Fix `upInterval` Timer Cleanup in `LevitatingProductViewer.tsx`
In `src/components/scrollytelling/LevitatingProductViewer.tsx`:
Store both timer IDs in outer closure scope or refs so that the cleanup clears both:
```tsx
useEffect(() => {
  const newDesc = getPlaceholderGeometry(product.id, product.title);
  targetDescriptorRef.current = newDesc;

  let downTimer: NodeJS.Timeout | null = null;
  let upTimer: NodeJS.Timeout | null = null;

  let progress = 1;
  downTimer = setInterval(() => {
    progress -= 0.15;
    if (progress <= 0) {
      if (downTimer) clearInterval(downTimer);
      downTimer = null;
      setDisplayDescriptor(newDesc);
      
      let upProgress = 0;
      upTimer = setInterval(() => {
        upProgress += 0.15;
        if (upProgress >= 1) {
          if (upTimer) clearInterval(upTimer);
          upTimer = null;
          setTransitionScale(1);
        } else {
          setTransitionScale(upProgress);
        }
      }, 16);
    } else {
      setTransitionScale(progress);
    }
  }, 16);

  return () => {
    if (downTimer) clearInterval(downTimer);
    if (upTimer) clearInterval(upTimer);
  };
}, [product.id, product.title]);
```
*Result*: Guarantees zero orphaned timers and prevents `transitionScale` jitter during rapid switching.

### Optional Defensive Enhancement: Guard `products` Array
In `src/components/scrollytelling/ScrollytellingExperience.tsx`, line 46:
```tsx
const activeProducts = Array.isArray(products) && products.length > 0
  ? products
  : [ ... ];
```

---

## 5. Verification Method

To verify these fixes after Worker M2 applies them:

1. **Run Production Build & Verification Suite**:
   ```powershell
   npm run build
   node scripts/verify-milestone2.mjs
   ```
2. **Run Empirical Challenger Stress Suite**:
   ```powershell
   node scripts/test-challenger-m2.mjs
   ```
   *Expected Result*: TargetX delta at `p = 0.25` drops to `0.000000`, and timer lifecycle check confirms no interleaved events during rapid transitions.
