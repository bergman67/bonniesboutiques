'use client';

import React, { useRef, useMemo, Suspense } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import LevitatingProductViewer, { ProductItem } from './LevitatingProductViewer';

interface ScrollyCanvasProps {
  scrollProgressRef: React.MutableRefObject<number>;
  activeProduct: ProductItem;
}

/**
 * Procedural celestial floating starfield and stardust.
 */
function CelestialStarfield() {
  const pointsRef = useRef<THREE.Points | null>(null);

  const [positions, colors] = useMemo(() => {
    const count = 300;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const palette = [
      new THREE.Color('#e8748a'),
      new THREE.Color('#c48b7a'),
      new THREE.Color('#fbbf24'),
      new THREE.Color('#f5efe6'),
      new THREE.Color('#a855f7'),
    ];

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 26;
      pos[i * 3 + 1] = Math.random() * 18 - 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 26;

      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return [pos, col];
  }, []);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.getElapsedTime() * 0.02;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/**
 * Drifting celestial crystals in the upper sky that pass by during descent.
 */
function CelestialDebris() {
  const groupRef = useRef<THREE.Group | null>(null);

  const debris = useMemo(() => {
    return [
      { pos: [-4, 6, -2], rot: [0.5, 0.2, 0.1], scale: 0.6, color: '#e8748a' },
      { pos: [4.5, 5.5, 1], rot: [0.1, 0.8, 0.3], scale: 0.7, color: '#8a5cf6' },
      { pos: [-3, 3.5, 2], rot: [0.3, 0.4, 0.9], scale: 0.5, color: '#fbbf24' },
      { pos: [3.5, 2.8, -1.5], rot: [0.7, 0.1, 0.4], scale: 0.55, color: '#38bdf8' },
    ];
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        child.rotation.x += 0.005 * (i + 1);
        child.rotation.y += 0.008 * (i + 1);
        child.position.y += Math.sin(t * 1.5 + i) * 0.002;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {debris.map((d, idx) => (
        <mesh
          key={idx}
          position={d.pos as [number, number, number]}
          rotation={d.rot as [number, number, number]}
          scale={d.scale}
        >
          <octahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial
            color={d.color}
            roughness={0.2}
            metalness={0.8}
            wireframe={idx % 2 === 1}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Camera Controller interpolating position and lookAt target along 4-phase descent.
 */
function ScrollyCameraRig({
  scrollProgressRef,
}: {
  scrollProgressRef: React.MutableRefObject<number>;
}) {
  const { camera } = useThree();
  const currentTargetRef = useRef(new THREE.Vector3(0, 2, 0));

  useFrame(() => {
    const p = Math.min(1, Math.max(0, scrollProgressRef.current));

    // Calculate target camera position along trajectory
    // 0.00 - 0.25: Celestial Sky viewpoint looking down [0, 8, 14]
    // 0.25 - 0.50: Cloud / village descent [0, 4.5, 8.5]
    // 0.50 - 0.75: Descending into 16-bit storefront layer [0, 2.2, 5.2]
    // 0.75 - 1.00: Showcase pedestal alignment [0, 0.75, 3.2]
    let targetX = 0;
    let targetY = 8;
    let targetZ = 14;

    const lookX = 0;
    let lookY = 2;
    const lookZ = 0;

    if (p <= 0.25) {
      const t = p / 0.25;
      targetX = THREE.MathUtils.lerp(0, 0.8, Math.sin(t * Math.PI * 0.5));
      targetY = THREE.MathUtils.lerp(8.0, 5.5, t);
      targetZ = THREE.MathUtils.lerp(14.0, 10.0, t);
      lookY = THREE.MathUtils.lerp(2.0, 1.5, t);
    } else if (p <= 0.5) {
      const t = (p - 0.25) / 0.25;
      targetX = THREE.MathUtils.lerp(0.8, -0.4, t);
      targetY = THREE.MathUtils.lerp(5.5, 3.2, t);
      targetZ = THREE.MathUtils.lerp(10.0, 6.8, t);
      lookY = THREE.MathUtils.lerp(1.5, 0.8, t);
    } else if (p <= 0.75) {
      const t = (p - 0.5) / 0.25;
      targetX = THREE.MathUtils.lerp(-0.4, 0, t);
      targetY = THREE.MathUtils.lerp(3.2, 1.6, t);
      targetZ = THREE.MathUtils.lerp(6.8, 4.4, t);
      lookY = THREE.MathUtils.lerp(0.8, 0.45, t);
    } else {
      const t = (p - 0.75) / 0.25;
      targetX = 0;
      targetY = THREE.MathUtils.lerp(1.6, 0.72, t);
      targetZ = THREE.MathUtils.lerp(4.4, 3.1, t);
      lookY = THREE.MathUtils.lerp(0.45, 0.32, t);
    }

    // Smooth lerping to targets
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.08);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.08);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.08);

    currentTargetRef.current.x = THREE.MathUtils.lerp(currentTargetRef.current.x, lookX, 0.08);
    currentTargetRef.current.y = THREE.MathUtils.lerp(currentTargetRef.current.y, lookY, 0.08);
    currentTargetRef.current.z = THREE.MathUtils.lerp(currentTargetRef.current.z, lookZ, 0.08);

    camera.lookAt(currentTargetRef.current);
  });

  return null;
}

export default function ScrollyCanvas({
  scrollProgressRef,
  activeProduct,
}: ScrollyCanvasProps) {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-auto">
      <Canvas
        shadows
        camera={{ position: [0, 8, 14], fov: 45, near: 0.1, far: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        {/* Background Atmospheric Fog */}
        <fog attach="fog" args={['#1a0f24', 6, 24]} />

        {/* Ambient & Directional Lighting */}
        <ambientLight intensity={0.9} color="#f5efe6" />
        <directionalLight
          position={[5, 8, 5]}
          intensity={1.8}
          color="#fff5ea"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.5}
          shadow-camera-far={25}
        />
        <pointLight position={[-4, 3, -2]} intensity={0.6} color="#e8748a" />
        <pointLight position={[4, 2, 2]} intensity={0.5} color="#38bdf8" />

        {/* Celestial Starfield & Drifting Sky Crystals */}
        <CelestialStarfield />
        <CelestialDebris />

        {/* Camera Rig driven by GSAP Scroll progress */}
        <ScrollyCameraRig scrollProgressRef={scrollProgressRef} />

        {/* Showcase Pedestal with Floating 3D Product */}
        <Suspense fallback={null}>
          <LevitatingProductViewer product={activeProduct} pedestalPosition={[0, -0.6, 0]} />
        </Suspense>
      </Canvas>
    </div>
  );
}
