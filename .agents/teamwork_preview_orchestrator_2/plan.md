# Implementation Plan: Generational Crafting & 3D Levitating Cutouts

## Overview
Update the storefront to highlight generational crafting (Bonnie & Tammy) with animations, create a background removal tool for product images, and render transparent cutout billboards in the React Three Fiber LevitatingProductViewer.

## Steps
1. **Survey & Discovery**:
   - Survey the codebase for About section copy (`page.tsx`, `PixelStorefrontLayer.tsx`, etc.).
   - Survey product images location, Supabase setup or local asset manifests, and `@imgly/background-removal-node` dependencies.
   - Survey `LevitatingProductViewer.tsx` component implementation and Drei/Three.js usage.
2. **Milestone 1: About Section Update**:
   - Remove "16-bit" references.
   - Emphasize "generational crafting" (Bonnie & Tammy) and mention "variety of animations".
3. **Milestone 2: Background Removal Script & Transparent Assets**:
   - Implement backend background removal script using `@imgly/background-removal-node` or equivalent supported library.
   - Process product images to generate transparent PNGs.
   - Store transparent PNGs in public/assets or storage and update asset manifest / DB references.
4. **Milestone 3: 3D Levitating Product Viewer Billboard Rendering**:
   - Update `LevitatingProductViewer` to use transparent product cutouts as 2D billboard/plane cutouts floating/levitating in 3D space.
   - Ensure animation / levitation behavior is maintained and aesthetically pleasing.
5. **Verification & Forensic Audit**:
   - Verify all acceptance criteria.
   - Review and test build/lint/runtime.
   - Forensic audit for integrity.
