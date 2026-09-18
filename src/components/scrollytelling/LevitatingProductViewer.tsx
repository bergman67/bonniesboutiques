'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { ProceduralProductModel } from '@/lib/scrollytelling/proceduralPrimitives';
import { getPlaceholderGeometry, ModelDescriptor } from '@/lib/scrollytelling/assetManifest';

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
  }, [product.id, product.title]);

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

      {/* ── 3. CONTINUOUS LEVITATING 3D MODEL ──────────────────── */}
      <group ref={modelGroupRef} position={[0, 0.85, 0]}>
        <ProceduralProductModel descriptor={displayDescriptor} />
      </group>
    </group>
  );
}
