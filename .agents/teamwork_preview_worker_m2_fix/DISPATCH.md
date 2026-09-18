## 2026-09-18T14:08:48Z
You are Worker M2 Fix responsible for applying targeted quality and stability remediations for Milestone 2.

Authoritative Request:
Read c:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\ORIGINAL_REQUEST.md
PROJECT Specification:
Read c:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_orchestrator_1\PROJECT.md
Challenger 1 Report (defect details and drop-in fixes):
Read c:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_challenger_m2_1\handoff.md
Reviewer 1 Report:
Read c:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_reviewer_m2_1\handoff.md

Working directory:
c:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_worker_m2_fix
Project root:
c:\Users\eranb\Documents\antigravity\wonderful-hertz

Write Ownership:
You have exclusive write ownership of:
- `src/components/scrollytelling/ScrollyCanvas.tsx`
- `src/components/scrollytelling/LevitatingProductViewer.tsx`
- `src/components/scrollytelling/PixelStorefrontLayer.tsx`
- `src/components/scrollytelling/ScrollytellingExperience.tsx`

Tasks:
1. **Camera Trajectory Continuity at `p = 0.25`**:
   In `src/components/scrollytelling/ScrollyCanvas.tsx` (around line 154):
   Fix the jump discontinuity in `targetX`. Phase 1 (`p <= 0.25`) ends at `targetX = 0`, but Phase 2 starts at `0.8`.
   Change line 154 so that Phase 1 smoothly arrives at 0.8 at `t = 1.0` (e.g. `targetX = THREE.MathUtils.lerp(0, 0.8, Math.sin(t * Math.PI * 0.5));`).
2. **Product Swapping Timer Lifecycle**:
   In `src/components/scrollytelling/LevitatingProductViewer.tsx` (around lines 45-72):
   Fix the orphaned `upInterval` timer. Hold both `downTimer` and `upTimer` in scope and ensure the `useEffect` cleanup function clears both timers if unmounted or if the product changes mid-transition.
3. **Decouple 2D Canvas Loop from Scroll Props**:
   In `src/components/scrollytelling/PixelStorefrontLayer.tsx`:
   Store `scrollProgress` and `activeProductName` in `useRef`s updated on render, and remove them from the animation `useEffect` dependency array (`[]`) so that scrolling does not repeatedly cancel `requestAnimationFrame`, restart the loop, and reset `frameCount` to 0.
4. **Defensive Fallback Guard**:
   In `src/components/scrollytelling/ScrollytellingExperience.tsx` line 46:
   Guard `products` with `Array.isArray(products) && products.length > 0`.
5. **Verification**:
   Run:
   - `node scripts/test-challenger-m2.mjs` (must pass with 0 jump discontinuity and 0 orphaned timers)
   - `node scripts/verify-milestone2.mjs` (must pass 8/8)
   - `npm run lint` (0 errors, 0 warnings)
   - `npm run build` (exit code 0)
   Document all changes and test outputs in:
   `c:\Users\eranb\Documents\antigravity\wonderful-hertz\.agents\teamwork_preview_worker_m2_fix\handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

When finished, send a completion message with summary back to parent orchestrator.
