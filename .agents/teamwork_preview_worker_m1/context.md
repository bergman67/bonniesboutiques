# Worker 1 Context: Milestone 1 (About Section Update)

## Objective
Implement Requirement R1:
1. Remove all occurrences of "16-bit" in storefront copy (`src/components/scrollytelling/ScrollytellingExperience.tsx` lines 156, 193).
2. Rewrite the `#about` section in `src/app/page.tsx` (lines 96-111):
   - Eyebrow: `✦ Generational Crafting ✦`
   - Heading: Celebrate mother-daughter duo Bonnie & Tammy with heart
   - Body copy: Emphasize "generational crafting" passed between mother Bonnie and daughter Tammy, and explicitly mention the "variety of animations" (such as waving Bonnie & Tammy, flickering lanterns, and floating charms) that bring the boutique to life.
3. In `src/components/scrollytelling/ProductHUD.tsx` line 83, update fallback from "by Bonnie" to "by Bonnie & Tammy".
4. Ensure `src/components/scrollytelling/PixelStorefrontLayer.tsx` line 124 retains `✦ B&T TRINKETS & BOUTIQUE ✦` (or contains `"BOUTIQUE"`) to keep existing acceptance checks green.
5. Create an automated test/verification script `scripts/verify-about-section.mjs` asserting:
   - No "16-bit" in `page.tsx` and `ScrollytellingExperience.tsx`.
   - "generational crafting" and "animations" and "Bonnie & Tammy" exist in `page.tsx`.
6. Run `npm run lint` and `node scripts/verify-about-section.mjs` and report full results in `handoff.md`.
