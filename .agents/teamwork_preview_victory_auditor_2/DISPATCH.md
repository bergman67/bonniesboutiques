## 2026-09-18T16:33:28Z

Update the storefront's 'About' section to focus on generational crafting, and replace the placeholder 3D geometries with actual isolated product images levitating as 2D paper cutouts in the 3D space.

Working directory: C:\Users\eranb\Documents\antigravity\wonderful-hertz
Integrity mode: development

## Requirements

### R1. About Section Update
Remove references to the "16-bit" style in the About section copy (in `page.tsx` or `PixelStorefrontLayer.tsx` as applicable). Rewrite the text to emphasize "generational crafting" (Bonnie & Tammy) and mention a "variety of animations."

### R2. Background Removal Script
Write a backend script (e.g., using `@imgly/background-removal-node` or similar) to automatically strip the background from the product photos. Save the processed images (transparent PNGs) back to Supabase Storage or the public directory, and update the database or asset manifest to point to these new transparent assets.

### R3. 3D Billboard Rendering
Update the React Three Fiber `LevitatingProductViewer` component. Instead of rendering placeholder geometries (like spheres or boxes), render the transparent product images as 2D planes/billboards (e.g., using Drei's `<Image>` or `<Billboard>`) that float and levitate.

## Acceptance Criteria

### Verification
- [ ] The About section text no longer contains "16-bit" and explicitly mentions "generational crafting" and "animations".
- [ ] A script exists and successfully removes backgrounds from the product images to create transparent PNGs.
- [ ] The 3D viewer renders the transparent images as levitating planes instead of primitive geometries.
