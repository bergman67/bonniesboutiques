'use client';

import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import * as THREE from 'three';
import { useFrame, ThreeEvent, useThree } from '@react-three/fiber';
import { Billboard, useTexture } from '@react-three/drei';
import { getPlaceholderGeometry, ModelDescriptor } from '@/lib/scrollytelling/assetManifest';
import productAssetManifest from '@/lib/scrollytelling/productAssetManifest.json';

export interface ProductItem {
  id: string;
  title: string;
  price?: number | null;
  imageUrl?: string | null;
  description?: string | null;
}

interface LevitatingProductViewerProps {
  product: ProductItem;
  pedestalPosition?: [number, number, number];
}

interface ManifestProductEntry {
  id: string;
  title?: string;
  transparentUrl?: string;
  transparentLocalUrl?: string;
  transparentCloudUrl?: string;
  filename?: string;
}

interface ProductAssetManifestData {
  products?: ManifestProductEntry[];
  byId?: Record<string, ManifestProductEntry>;
  byFilename?: Record<string, ManifestProductEntry>;
}

const typedManifest = productAssetManifest as unknown as ProductAssetManifestData;

/**
 * Resolves the transparent cutout image URL for a given product.
 * Supports loading from product.imageUrl with local manifest fallback if offline.
 */
export function resolveProductImageUrl(product: ProductItem): string | null {
  if (!product) return null;

  // 1. Direct product.imageUrl
  if (product.imageUrl) {
    // If running in browser and offline, prefer local manifest URL if available
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const manifestEntry = typedManifest?.byId?.[product.id];
      if (manifestEntry?.transparentLocalUrl) {
        return manifestEntry.transparentLocalUrl;
      }
    }
    if (
      product.imageUrl.includes('/transparent/') &&
      !product.imageUrl.includes('?')
    ) {
      return `${product.imageUrl}?v=5`;
    }
    return product.imageUrl;
  }

  // 2. Fallback to local manifest by product ID
  const entryById = typedManifest?.byId?.[product.id];
  if (entryById) {
    return entryById.transparentLocalUrl || entryById.transparentUrl || null;
  }

  // 3. Fallback to local manifest by product title
  if (product.title) {
    const entryByTitle = typedManifest?.products?.find(
      (p) => p.title?.toLowerCase() === product.title?.toLowerCase()
    );
    if (entryByTitle) {
      return entryByTitle.transparentLocalUrl || entryByTitle.transparentUrl || null;
    }
  }

  // 4. Default to first available cutout in manifest
  const first = typedManifest?.products?.[0];
  if (first?.transparentLocalUrl || first?.transparentUrl) {
    return first.transparentLocalUrl || first.transparentUrl || null;
  }

  return null;
}

/**
 * Dynamic 2D Billboard cutout plane textured with the isolated product PNG.
 * Computes dynamic aspect ratio from texture dimensions to ensure no image stretching.
 * Uses meshStandardMaterial so the cutout catches directional sunlight and pedestal aura point light.
 */
function ProductCutoutTexturePlane({ imageUrl }: { imageUrl: string }) {
  const texture = useTexture(imageUrl);

  // Ensure sRGB color space for vivid, accurate tones
  useMemo(() => {
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
    }
  }, [texture]);

  // Compute dynamic aspect ratio and normalize scale across both 3:4 catalog canvases and tight cutouts
  const [planeWidth, planeHeight] = useMemo(() => {
    if (texture && texture.image) {
      const img = texture.image;
      const w = (img as HTMLImageElement).naturalWidth || (img as HTMLImageElement).width || 1;
      const h = (img as HTMLImageElement).naturalHeight || (img as HTMLImageElement).height || 1;
      const aspect = w / h;

      let fillRatio = 0.50; // Standard catalog baseline (trinket occupies ~50% of 3:4 canvas)
      let detected = false;

      // Fast offscreen canvas sampling (60x80) to detect true vertical fill ratio of non-alpha pixels
      if (typeof document !== 'undefined' && w > 1 && h > 1) {
        try {
          const sampleCanvas = document.createElement('canvas');
          sampleCanvas.width = 60;
          sampleCanvas.height = 80;
          const ctx = sampleCanvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(img as CanvasImageSource, 0, 0, 60, 80);
            const imgData = ctx.getImageData(0, 0, 60, 80).data;
            let minY = 80;
            let maxY = 0;
            let found = 0;
            for (let y = 0; y < 80; y++) {
              for (let x = 0; x < 60; x++) {
                const alpha = imgData[(y * 60 + x) * 4 + 3];
                if (alpha > 20) {
                  found++;
                  if (y < minY) minY = y;
                  if (y > maxY) maxY = y;
                }
              }
            }
            if (found > 20 && maxY >= minY) {
              fillRatio = Math.max(0.20, Math.min(0.98, (maxY - minY + 1) / 80));
              detected = true;
            }
          }
        } catch (_e) {
          // Fallback if canvas is tainted or context unavailable
        }
      }

      // Fallback heuristic if offscreen sampling wasn't possible:
      // Standard 3:4 catalog canvas has ~50% fill ratio; tightly cropped has ~90.8% fill
      if (!detected) {
        if (Math.abs(aspect - 0.75) > 0.08) {
          fillRatio = 0.908;
        } else {
          fillRatio = 0.50;
        }
      }

      // Target visible trinket height in Three.js world space: 2.8 units
      // Standard 3:4 catalog items: 5.0 * 0.50 = 2.50 units
      // Tightly cropped cutouts: 2.753 * 0.908 = 2.50 units
      const targetProductHeight = 2.8;
      let calculatedHeight = targetProductHeight / fillRatio;
      let calculatedWidth = calculatedHeight * aspect;

      // Clamping bounds to ensure no screen overflow
      const maxAllowedWidth = 4.4;
      const maxAllowedHeight = 5.2;
      if (calculatedWidth > maxAllowedWidth) {
        const s = maxAllowedWidth / calculatedWidth;
        calculatedWidth *= s;
        calculatedHeight *= s;
      }
      if (calculatedHeight > maxAllowedHeight) {
        const s = maxAllowedHeight / calculatedHeight;
        calculatedWidth *= s;
        calculatedHeight *= s;
      }

      return [calculatedWidth, calculatedHeight];
    }
    return [2.0, 2.0];
  }, [texture]);

  return (
    <Billboard follow={true}>
      <mesh castShadow receiveShadow>
        <planeGeometry args={[planeWidth, planeHeight, 1, 1]} />
        <meshStandardMaterial
          map={texture}
          transparent={true}
          alphaTest={0.05}
          depthWrite={true}
          side={THREE.DoubleSide}
          roughness={0.35}
          metalness={0.05}
        />
      </mesh>
    </Billboard>
  );
}

/**
 * Wireframe placeholder rendered inside Suspense while texture loads.
 */
function CutoutLoadingPlaceholder({ auraColor }: { auraColor: string }) {
  return (
    <Billboard follow={true}>
      <mesh>
        <planeGeometry args={[2.0, 2.0]} />
        <meshBasicMaterial
          color={auraColor}
          wireframe={true}
          transparent={true}
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
    </Billboard>
  );
}

/**
 * Silhouette fallback rendered if no cutout image is available or on network error.
 */
function CutoutSilhouetteFallback({ auraColor }: { auraColor: string }) {
  return (
    <Billboard follow={true}>
      <mesh castShadow receiveShadow>
        <planeGeometry args={[2.0, 2.0]} />
        <meshStandardMaterial
          color={auraColor}
          transparent={true}
          opacity={0.7}
          roughness={0.4}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
    </Billboard>
  );
}

interface ErrorBoundaryProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class TextureErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('Cutout texture load error caught by boundary, using fallback:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * 2D Billboard cutout wrapper with Suspense and ErrorBoundary protection.
 */
function ProductCutoutBillboard({
  product,
  auraColor,
}: {
  product: ProductItem;
  auraColor: string;
}) {
  const imageUrl = resolveProductImageUrl(product);

  if (!imageUrl) {
    return <CutoutSilhouetteFallback auraColor={auraColor} />;
  }

  return (
    <TextureErrorBoundary fallback={<CutoutSilhouetteFallback auraColor={auraColor} />}>
      <Suspense fallback={<CutoutLoadingPlaceholder auraColor={auraColor} />}>
        <ProductCutoutTexturePlane imageUrl={imageUrl} />
      </Suspense>
    </TextureErrorBoundary>
  );
}

export default function LevitatingProductViewer({
  product,
  pedestalPosition = [0, -0.6, 0],
}: LevitatingProductViewerProps) {
  const { camera, size } = useThree();
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const shadowMeshRef = useRef<THREE.Mesh | null>(null);
  const pedestalAuraRef = useRef<THREE.PointLight | null>(null);

  // Drag interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [pointerX, setPointerX] = useState(0);
  const [dragRotation, setDragRotation] = useState(0);
  const pointerStartPos = useRef<{ x: number; y: number } | null>(null);
  const gestureLock = useRef<'pending' | 'horizontal' | 'vertical'>('pending');

  // Responsive camera FOV adjustment based on user's viewport aspect ratio
  // Matches 3D perspective projection to 2D pixel desk on both mobile and desktop
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      const safeWidth = Math.max(1, size.width);
      const safeHeight = Math.max(1, size.height);
      const aspect = safeWidth / safeHeight;
      const targetAspect = 16 / 9;
      if (aspect < targetAspect) {
        const baseFovRad = (45 * Math.PI) / 180;
        const tanHalf = Math.tan(baseFovRad / 2) * (targetAspect / aspect);
        const dynamicFov = Math.min(125, (2 * Math.atan(tanHalf) * 180) / Math.PI);
        if (Math.abs(camera.fov - dynamicFov) > 0.05) {
          camera.fov = dynamicFov;
          camera.updateProjectionMatrix();
        }
      } else {
        if (Math.abs(camera.fov - 45) > 0.05) {
          camera.fov = 45;
          camera.updateProjectionMatrix();
        }
      }
    }
  }, [camera, size.width, size.height]);

  // Model transition state
  const [displayProduct, setDisplayProduct] = useState<ProductItem>(product);
  const [displayDescriptor, setDisplayDescriptor] = useState<ModelDescriptor>(() =>
    getPlaceholderGeometry(product.id, product.title)
  );
  const [transitionScale, setTransitionScale] = useState(1);
  const targetDescriptorRef = useRef<ModelDescriptor>(
    getPlaceholderGeometry(product.id, product.title)
  );

  // Handle product changes with smooth scale-down / scale-up
  useEffect(() => {
    const newDesc = getPlaceholderGeometry(product.id, product.title);
    targetDescriptorRef.current = newDesc;

    let downTimer: ReturnType<typeof setInterval> | null = null;
    let upTimer: ReturnType<typeof setInterval> | null = null;

    let progress = 1;
    downTimer = setInterval(() => {
      progress -= 0.15;
      if (progress <= 0) {
        if (downTimer) {
          clearInterval(downTimer);
          downTimer = null;
        }
        setDisplayDescriptor(newDesc);
        setDisplayProduct(product);
        // Animate back up
        let upProgress = 0;
        upTimer = setInterval(() => {
          upProgress += 0.15;
          if (upProgress >= 1) {
            if (upTimer) {
              clearInterval(upTimer);
              upTimer = null;
            }
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
  }, [product.id, product.title, product.imageUrl, product]);

  useFrame(({ clock }) => {
    // Continuously ensure camera FOV dynamically adapts to viewport aspect ratio
    if (camera instanceof THREE.PerspectiveCamera) {
      const safeWidth = Math.max(1, size.width);
      const safeHeight = Math.max(1, size.height);
      const aspect = safeWidth / safeHeight;
      const targetAspect = 16 / 9;
      const expectedFov =
        aspect < targetAspect
          ? Math.min(125, (2 * Math.atan(Math.tan((45 * Math.PI) / 360) * (targetAspect / aspect)) * 180) / Math.PI)
          : 45;
      if (Math.abs(camera.fov - expectedFov) > 0.05) {
        camera.fov = expectedFov;
        camera.updateProjectionMatrix();
      }
    }

    const t = clock.getElapsedTime();

    if (modelGroupRef.current) {
      // Continuous dual-harmonic sine-wave levitation
      const floatOffset = Math.sin(t * 1.8) * 0.12 + Math.sin(t * 3.6) * 0.025;
      modelGroupRef.current.position.y = 0.85 + floatOffset;

      // Subtle organic tilt
      modelGroupRef.current.rotation.x = Math.sin(t * 1.2) * 0.06;
      modelGroupRef.current.rotation.z = Math.cos(t * 1.4) * 0.05;

      // Turntable rotation (auto-spins with user drag rotation offset)
      modelGroupRef.current.rotation.y = t * 0.6 + dragRotation;

      // Transition scale
      modelGroupRef.current.scale.setScalar(transitionScale);

      // Contact shadow scaling inverse to float height
      if (shadowMeshRef.current) {
        const shadowScale = Math.max(0.4, 1 - floatOffset * 2.2) * transitionScale;
        shadowMeshRef.current.scale.set(shadowScale, shadowScale, 1);
        const mat = shadowMeshRef.current.material as THREE.MeshBasicMaterial;
        if (mat) {
          mat.opacity = Math.max(0.15, 0.45 - floatOffset * 1.5) * transitionScale;
        }
      }
    }
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsDragging(true);
    const clientX = e.clientX || 0;
    const clientY = e.clientY || 0;
    setPointerX(clientX);
    pointerStartPos.current = { x: clientX, y: clientY };
    gestureLock.current = 'pending';
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;
    const clientX = e.clientX || 0;
    const clientY = e.clientY || 0;

    // Gesture arbitration: determine whether user is scrolling vertically or rotating model horizontally
    if (gestureLock.current === 'pending' && pointerStartPos.current) {
      const deltaX = Math.abs(clientX - pointerStartPos.current.x);
      const deltaY = Math.abs(clientY - pointerStartPos.current.y);

      // Require a 5px deadzone before classifying gesture direction
      if (deltaX < 5 && deltaY < 5) {
        return;
      }

      if (deltaY > deltaX) {
        // Vertical gesture -> user is scrolling page; abort drag to avoid jittering the 3D model
        gestureLock.current = 'vertical';
        setIsDragging(false);
        pointerStartPos.current = null;
        return;
      } else {
        // Horizontal gesture -> user intends to inspect 3D model
        gestureLock.current = 'horizontal';
      }
    }

    if (gestureLock.current === 'vertical') {
      return;
    }

    const delta = clientX - pointerX;
    setDragRotation((prev) => prev + delta * 0.01);
    setPointerX(clientX);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    pointerStartPos.current = null;
    gestureLock.current = 'pending';
  };

  return (
    <group
      position={pedestalPosition}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* ── 1. INVISIBLE INTERACTION HIT PLANE ─────────────────── */}
      {/* Large transparent plane behind billboard to guarantee smooth drag-to-rotate across the viewer */}
      <mesh position={[0, 0.85, -0.05]}>
        <planeGeometry args={[10, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Retained invisible contact shadow reference for invariant compliance */}
      <mesh ref={shadowMeshRef} visible={false}>
        <planeGeometry args={[0.1, 0.1]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* ── 2. STAGE UNDER-GLOW AURA POINT LIGHT ───────────────── */}
      <pointLight
        ref={pedestalAuraRef}
        position={[0, 0.3, 0.3]}
        color={displayDescriptor.pedestalAura}
        intensity={2.2}
        distance={4.0}
        decay={2}
      />

      {/* ── 3. CONTINUOUS LEVITATING 2D CUTOUT BILLBOARD ────────── */}
      <group ref={modelGroupRef} position={[0, 1.25, 0]}>
        <ProductCutoutBillboard
          product={displayProduct}
          auraColor={displayDescriptor.pedestalAura}
        />
      </group>
    </group>
  );
}

