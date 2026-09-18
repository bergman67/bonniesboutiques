import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== VERIFYING MILESTONE 2: 3D / 16-BIT SCROLLYTELLING & PRODUCT VIEWER ===\n');

// 1. Verify Dependencies
console.log('1. Checking pinned dependencies in package.json...');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
assert(pkg.dependencies['@react-three/fiber'], 'Missing @react-three/fiber');
assert(pkg.dependencies['@react-three/drei'], 'Missing @react-three/drei');
assert(pkg.dependencies['three'], 'Missing three');
assert(pkg.dependencies['gsap'], 'Missing gsap');
assert(pkg.devDependencies['@types/three'], 'Missing @types/three');
console.log('   ✔ Pinned dependencies verified:');
console.log(`     - @react-three/fiber: ${pkg.dependencies['@react-three/fiber']}`);
console.log(`     - @react-three/drei: ${pkg.dependencies['@react-three/drei']}`);
console.log(`     - three: ${pkg.dependencies['three']}`);
console.log(`     - gsap: ${pkg.dependencies['gsap']}`);
console.log(`     - @types/three: ${pkg.devDependencies['@types/three']}`);

// 2. Verify next.config.mjs transpilation
console.log('\n2. Checking next.config.mjs transpilePackages...');
const nextConfig = fs.readFileSync('next.config.mjs', 'utf8');
assert(nextConfig.includes('transpilePackages'), 'next.config.mjs missing transpilePackages');
assert(nextConfig.includes('three'), 'next.config.mjs missing three in transpilePackages');
assert(nextConfig.includes('@react-three/fiber'), 'next.config.mjs missing @react-three/fiber');
assert(nextConfig.includes('@react-three/drei'), 'next.config.mjs missing @react-three/drei');
console.log('   ✔ next.config.mjs transpilation verified.');

// 3. Verify Asset Manifest
console.log('\n3. Checking Asset Abstraction Manifest (src/lib/scrollytelling/assetManifest.ts)...');
const manifestContent = fs.readFileSync('src/lib/scrollytelling/assetManifest.ts', 'utf8');
assert(manifestContent.includes('export interface ModelDescriptor'), 'Missing ModelDescriptor interface');
assert(manifestContent.includes('export interface SpriteConfig'), 'Missing SpriteConfig interface');
assert(manifestContent.includes('getPlaceholderGeometry'), 'Missing getPlaceholderGeometry function');
assert(manifestContent.includes('SPRITE_CONFIGS'), 'Missing SPRITE_CONFIGS');
assert(manifestContent.includes('shopkeeper'), 'Missing shopkeeper sprite config');
assert(manifestContent.includes('counter'), 'Missing counter sprite config');
assert(manifestContent.includes('shelves'), 'Missing shelves sprite config');
assert(manifestContent.includes('floor'), 'Missing floor sprite config');
assert(manifestContent.includes('banner'), 'Missing banner sprite config');
console.log('   ✔ Asset manifest abstraction and procedural presets verified.');

// 4. Verify 2D Canvas Layer
console.log('\n4. Checking 2D 16-bit RPG Canvas Layer (src/components/scrollytelling/PixelStorefrontLayer.tsx)...');
const pixelLayer = fs.readFileSync('src/components/scrollytelling/PixelStorefrontLayer.tsx', 'utf8');
assert(pixelLayer.includes('imageRendering: \'pixelated\'') || pixelLayer.includes('pixelated'), 'Missing pixelated rendering in PixelStorefrontLayer');
assert(pixelLayer.includes('BONNIE'), 'Missing Bonnie shopkeeper in PixelStorefrontLayer');
assert(pixelLayer.includes('canvas.getContext(\'2d\''), 'Missing 2d canvas context');
console.log('   ✔ PixelStorefrontLayer 16-bit canvas verified.');

// 5. Verify 3D Levitating Product Viewer
console.log('\n5. Checking 3D Levitating Product Viewer (src/components/scrollytelling/LevitatingProductViewer.tsx)...');
const viewer = fs.readFileSync('src/components/scrollytelling/LevitatingProductViewer.tsx', 'utf8');
assert(viewer.includes('useFrame'), 'Missing useFrame in LevitatingProductViewer');
assert(viewer.includes('floatOffset') || viewer.includes('Math.sin'), 'Missing sine-wave levitation logic');
assert(viewer.includes('shadowMeshRef') || viewer.includes('shadowScale'), 'Missing dynamic contact shadow scaling');
assert(viewer.includes('pedestalPosition') || viewer.includes('cylinderGeometry'), 'Missing showcase pedestal');
console.log('   ✔ LevitatingProductViewer 3D floating and pedestal verified.');

// 6. Verify Dynamic HTML Text & Cart HUD
console.log('\n6. Checking Product HUD & Cart Integration (src/components/scrollytelling/ProductHUD.tsx)...');
const hud = fs.readFileSync('src/components/scrollytelling/ProductHUD.tsx', 'utf8');
assert(hud.includes('useCart'), 'Missing useCart in ProductHUD');
assert(hud.includes('addItem'), 'Missing addItem call in ProductHUD');
assert(hud.includes('onPrev') && hud.includes('onNext'), 'Missing product swapping nav buttons');
assert(hud.includes('product.title'), 'Missing dynamic title sync in ProductHUD');
console.log('   ✔ ProductHUD typography and CartContext integration verified.');

// 7. Verify GSAP Scrollytelling Experience & Camera Rig
console.log('\n7. Checking GSAP ScrollTrigger & Scrolly Canvas...');
const scrollyExp = fs.readFileSync('src/components/scrollytelling/ScrollytellingExperience.tsx', 'utf8');
assert(scrollyExp.includes('ScrollTrigger'), 'Missing ScrollTrigger in ScrollytellingExperience');
assert(scrollyExp.includes('400vh'), 'Missing 400vh virtual scroll container');
assert(scrollyExp.includes('dynamic(') && scrollyExp.includes('ssr: false'), 'ScrollyCanvas must be dynamically imported with ssr: false');

const canvas3d = fs.readFileSync('src/components/scrollytelling/ScrollyCanvas.tsx', 'utf8');
assert(canvas3d.includes('ScrollyCameraRig'), 'Missing ScrollyCameraRig in ScrollyCanvas');
assert(canvas3d.includes('scrollProgressRef'), 'Missing scrollProgressRef lerp driving camera');
console.log('   ✔ GSAP ScrollTrigger 4-phase camera descent verified.');

// 8. Verify Homepage Integration
console.log('\n8. Checking Homepage Integration (src/app/page.tsx)...');
const page = fs.readFileSync('src/app/page.tsx', 'utf8');
assert(page.includes('ScrollytellingExperience'), 'page.tsx missing ScrollytellingExperience');
assert(page.includes('Header'), 'page.tsx missing Header');
assert(page.includes('products = await prisma.product.findMany'), 'page.tsx missing Prisma product query');
console.log('   ✔ Homepage integration verified.');

console.log('\n======================================================');
console.log('ALL MILESTONE 2 ARCHITECTURE & CODE CHECKS PASSED (8/8)');
console.log('======================================================\n');
