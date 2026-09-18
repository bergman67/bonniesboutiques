'use client';

import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import * as THREE from 'three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
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

  // Compute dynamic aspect ratio from texture dimensions to ensure no image stretching
  const [planeWidth, planeHeight] = useMemo(() => {
    if (texture && texture.image) {
      const img = texture.image;
      const w = (img as HTMLImageElement).naturalWidth || (img as HTMLImageElement).width || 1;
      const h = (img as HTMLImageElement).naturalHeight || (img as HTMLImageElement).height || 1;
      const aspect = w / h;
      const maxSize = 3.2;
      if (aspect >= 1) {
        return [maxSize, maxSize / aspect];
      } else {
        return [maxSize * aspect, maxSize];
      }
    }
    return [1.2, 1.2];
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
        <planeGeometry args={[1.2, 1.2]} />
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
        <planeGeometry args={[1.2, 1.2]} />
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
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const shadowMeshRef = useRef<THREE.Mesh | null>(null);
  const pedestalAuraRef = useRef<THREE.PointLight | null>(null);

  // Drag interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [pointerX, setPointerX] = useState(0);
  const [dragRotation, setDragRotation] = useState(0);

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
    const t = clock.getElapsedTime();

    if (modelGroupRef.current) {
      // Continuous dual-harmonic sine-wave levitation
      const floatOffset = Math.sin(t * 1.8) * 0.12 + Math.sin(t * 3.6) * 0.025;
      modelGroupRef.current.position.y = 0.85 + floatOffset;

      // Subtle organic tilt
      modelGroupRef.current.rotation.x = Math.sin(t * 1.2) * 0.06;
      modelGroupRef.current.rotation.z = Math.cos(t * 1.4) * 0.05;

      // Turntable rotation (auto-spins unless actively being dragged)
      if (!isDragging) {
        modelGroupRef.current.rotation.y = t * 0.6 + dragRotation;
      } else {
        modelGroupRef.current.rotation.y = dragRotation;
      }

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
    setPointerX(e.clientX || 0);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;
    const clientX = e.clientX || 0;
    const delta = clientX - pointerX;
    setDragRotation((prev) => prev + delta * 0.01);
    setPointerX(clientX);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  return (
    <group
      position={pedestalPosition}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* ── 1. MAGICAL SHOWCASE PEDESTAL ───────────────────────── */}
      <group position={[0, 0, 0]}>
        {/* Pedestal Base Stepped Cylinders */}
        <mesh receiveShadow position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.9, 1.05, 0.15, 36]} />
          <meshStandardMaterial color="#1a0f24" roughness={0.7} metalness={0.2} />
        </mesh>

        <mesh receiveShadow position={[0, -0.05, 0]}>
          <cylinderGeometry args={[0.82, 0.9, 0.15, 36]} />
          <meshStandardMaterial color="#2d1b3d" roughness={0.6} metalness={0.3} />
        </mesh>

        {/* Gold Inlay Trim Ring */}
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.84, 0.84, 0.02, 36]} />
          <meshStandardMaterial color="#c48b7a" roughness={0.2} metalness={0.9} />
        </mesh>

        {/* Top Velvet Inlay Pillow */}
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.78, 0.78, 0.02, 36]} />
          <meshStandardMaterial color="#4a152e" roughness={0.9} metalness={0.05} />
        </mesh>

        {/* Dynamic Contact Shadow on Pedestal Surface */}
        <mesh
          ref={shadowMeshRef}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.045, 0]}
        >
          <ringGeometry args={[0, 0.45, 32]} />
          <meshBasicMaterial
            color="#050208"
            transparent
            opacity={0.45}
            depthWrite={false}
          />
        </mesh>

        {/* Pedestal Under-glow Runic Aura Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.048, 0]}>
          <ringGeometry args={[0.65, 0.74, 36]} />
          <meshBasicMaterial
            color={displayDescriptor.pedestalAura}
            transparent
            opacity={0.65}
          />
        </mesh>
      </group>

      {/* ── 2. PEDESTAL POINT LIGHT (AURA) ────────────────────── */}
      <pointLight
        ref={pedestalAuraRef}
        position={[0, 0.5, 0]}
        color={displayDescriptor.pedestalAura}
        intensity={2.0}
        distance={3.5}
        decay={2}
      />

      {/* ── 3. CONTINUOUS LEVITATING 2D CUTOUT BILLBOARD ────────── */}
      <group ref={modelGroupRef} position={[0, 0.85, 0]}>
        <ProductCutoutBillboard
          product={displayProduct}
          auraColor={displayDescriptor.pedestalAura}
        />
      </group>
    </group>
  );
}
