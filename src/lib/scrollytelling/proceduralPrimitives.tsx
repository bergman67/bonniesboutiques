'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { ModelDescriptor } from './assetManifest';

interface ProceduralModelProps {
  descriptor: ModelDescriptor;
}

/**
 * Creates a 2D Heart THREE.Shape for extrusion.
 */
function createHeartShape() {
  const heartShape = new THREE.Shape();
  const x = 0, y = 0;
  heartShape.moveTo(x + 0.25, y + 0.25);
  heartShape.bezierCurveTo(x + 0.25, y + 0.25, x + 0.2, y, x, y);
  heartShape.bezierCurveTo(x - 0.3, y, x - 0.3, y + 0.35, x - 0.3, y + 0.35);
  heartShape.bezierCurveTo(x - 0.3, y + 0.55, x - 0.1, y + 0.77, x + 0.25, y + 1.0);
  heartShape.bezierCurveTo(x + 0.6, y + 0.77, x + 0.8, y + 0.55, x + 0.8, y + 0.35);
  heartShape.bezierCurveTo(x + 0.8, y + 0.35, x + 0.8, y, x + 0.5, y);
  heartShape.bezierCurveTo(x + 0.35, y, x + 0.25, y + 0.25, x + 0.25, y + 0.25);
  return heartShape;
}

/**
 * Creates a 5-pointed Star THREE.Shape for extrusion.
 */
function createStarShape() {
  const shape = new THREE.Shape();
  const points = 5;
  const outerRadius = 0.5;
  const innerRadius = 0.22;
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

/**
 * Production GLTF Loader wrapper.
 */
function GLTFModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene.clone()} />;
}

/**
 * Procedural 3D Model Component.
 * Renders high-fidelity handcrafted jewelry/keychain models or drops in GLTF if configured.
 */
export function ProceduralProductModel({ descriptor }: ProceduralModelProps) {
  const { type, gltfUrl, primitiveConfig, scale } = descriptor;
  const { shape, material, accentColor = '#ffd700' } = primitiveConfig;

  // Heart and Star geometries
  const heartGeometry = useMemo(() => {
    const heart = createHeartShape();
    return new THREE.ExtrudeGeometry(heart, {
      depth: 0.2,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.05,
      bevelThickness: 0.05,
    });
  }, []);

  const starGeometry = useMemo(() => {
    const star = createStarShape();
    return new THREE.ExtrudeGeometry(star, {
      depth: 0.15,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.04,
      bevelThickness: 0.04,
    });
  }, []);

  if (type === 'gltf' && gltfUrl) {
    return (
      <group scale={scale}>
        <GLTFModel url={gltfUrl} />
      </group>
    );
  }

  return (
    <group scale={scale}>
      {shape === 'facetedGem' && (
        <group>
          {/* Main Faceted Gem (Octahedron with bevel-like segments) */}
          <mesh castShadow receiveShadow>
            <octahedronGeometry args={[0.55, 0]} />
            <meshPhysicalMaterial
              color={material.color}
              roughness={material.roughness}
              metalness={material.metalness}
              transmission={material.transmission ?? 0.8}
              ior={material.ior ?? 1.5}
              thickness={material.thickness ?? 0.5}
              emissive={material.emissive ?? '#000000'}
              emissiveIntensity={material.emissiveIntensity ?? 0}
              clearcoat={material.clearcoat ?? 1.0}
              clearcoatRoughness={0.1}
            />
          </mesh>

          {/* Top Keychain Gold Cap & Ring */}
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.12, 0.18, 0.1, 16]} />
            <meshStandardMaterial color={accentColor} metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.72, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.15, 0.03, 16, 32]} />
            <meshStandardMaterial color={accentColor} metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      )}

      {shape === 'enchantedRing' && (
        <group>
          {/* Main Metal Band */}
          <mesh castShadow rotation={[Math.PI / 3, 0, 0]}>
            <torusGeometry args={[0.5, 0.08, 24, 48]} />
            <meshPhysicalMaterial
              color={material.color}
              metalness={material.metalness}
              roughness={material.roughness}
              clearcoat={material.clearcoat ?? 0.8}
            />
          </mesh>
          {/* Embedded Gem Claws and Stone */}
          <mesh position={[0, 0.56, 0.2]}>
            <coneGeometry args={[0.12, 0.16, 6]} />
            <meshStandardMaterial color={accentColor} metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.65, 0.2]}>
            <sphereGeometry args={[0.14, 16, 16]} />
            <meshPhysicalMaterial
              color="#e8748a"
              roughness={0.1}
              metalness={0.1}
              transmission={0.9}
              ior={1.6}
            />
          </mesh>
        </group>
      )}

      {shape === 'potionVial' && (
        <group position={[0, -0.2, 0]}>
          {/* Glass Vial Body */}
          <mesh castShadow>
            <cylinderGeometry args={[0.25, 0.28, 0.6, 24]} />
            <meshPhysicalMaterial
              color={material.color}
              transmission={material.transmission ?? 0.9}
              roughness={material.roughness}
              ior={1.45}
              transparent
              opacity={0.85}
              depthWrite={false}
            />
          </mesh>
          {/* Vial Neck */}
          <mesh position={[0, 0.38, 0]}>
            <cylinderGeometry args={[0.12, 0.22, 0.18, 24]} />
            <meshPhysicalMaterial
              color={material.color}
              transmission={0.9}
              roughness={0.1}
              transparent
              opacity={0.85}
            />
          </mesh>
          {/* Cork Stopper */}
          <mesh position={[0, 0.52, 0]}>
            <cylinderGeometry args={[0.14, 0.11, 0.14, 16]} />
            <meshStandardMaterial color="#8b5a2b" roughness={0.9} metalness={0.05} />
          </mesh>
          {/* Glowing Inner Elixir Liquid */}
          <mesh position={[0, -0.05, 0]}>
            <cylinderGeometry args={[0.22, 0.24, 0.45, 20]} />
            <meshStandardMaterial
              color={accentColor}
              emissive={material.color}
              emissiveIntensity={0.6}
              roughness={0.2}
            />
          </mesh>
        </group>
      )}

      {shape === 'resinCharm' && (
        <group>
          {/* Clear Resin Slab */}
          <mesh castShadow>
            <cylinderGeometry args={[0.42, 0.42, 0.22, 32]} />
            <meshPhysicalMaterial
              color={material.color}
              transmission={material.transmission ?? 0.9}
              roughness={0.08}
              ior={1.5}
              thickness={0.8}
              transparent
              opacity={0.88}
            />
          </mesh>
          {/* Preserved Botanical / Flower Core */}
          <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusKnotGeometry args={[0.18, 0.05, 48, 8, 2, 3]} />
            <meshStandardMaterial color={accentColor} roughness={0.4} metalness={0.2} />
          </mesh>
          {/* Golden Bail Top Loop */}
          <mesh position={[0, 0.48, 0]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.1, 0.025, 16, 24]} />
            <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      )}

      {shape === 'celestialOrb' && (
        <group>
          {/* Outer Translucent Glass Sphere */}
          <mesh castShadow>
            <sphereGeometry args={[0.45, 32, 32]} />
            <meshPhysicalMaterial
              color={material.color}
              transmission={material.transmission ?? 0.85}
              roughness={0.08}
              ior={1.6}
              thickness={0.6}
            />
          </mesh>
          {/* Inner Glowing Core */}
          <mesh>
            <sphereGeometry args={[0.22, 20, 20]} />
            <meshStandardMaterial
              color={accentColor}
              emissive={material.color}
              emissiveIntensity={0.8}
            />
          </mesh>
          {/* Planetary Orbital Ring */}
          <mesh rotation={[Math.PI / 4, Math.PI / 6, 0]}>
            <torusGeometry args={[0.65, 0.02, 16, 48]} />
            <meshStandardMaterial color={accentColor} metalness={0.9} roughness={0.1} />
          </mesh>
        </group>
      )}

      {shape === 'heartPendant' && (
        <group position={[-0.25, -0.45, 0]}>
          {/* Extruded Heart Shape */}
          <mesh castShadow geometry={heartGeometry}>
            <meshStandardMaterial
              color={material.color}
              metalness={material.metalness}
              roughness={material.roughness}
            />
          </mesh>
          {/* Top Hanging Loop */}
          <mesh position={[0.25, 1.05, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.1, 0.03, 16, 24]} />
            <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      )}

      {shape === 'crystalKeychain' && (
        <group>
          {/* Cluster of crystal pillars */}
          <mesh position={[-0.12, 0, 0]} rotation={[0.08, 0, -0.15]} castShadow>
            <cylinderGeometry args={[0.12, 0.16, 0.75, 6]} />
            <meshPhysicalMaterial
              color={material.color}
              roughness={0.1}
              transmission={0.8}
              ior={1.55}
            />
          </mesh>
          <mesh position={[0.14, 0.05, 0.04]} rotation={[-0.05, 0, 0.18]} castShadow>
            <cylinderGeometry args={[0.1, 0.14, 0.85, 6]} />
            <meshPhysicalMaterial
              color={material.color}
              roughness={0.1}
              transmission={0.8}
              ior={1.55}
            />
          </mesh>
          <mesh position={[0, -0.1, 0.12]} rotation={[0.2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.12, 0.55, 6]} />
            <meshPhysicalMaterial
              color={accentColor}
              roughness={0.1}
              transmission={0.8}
              ior={1.55}
            />
          </mesh>
          {/* Golden base clasp */}
          <mesh position={[0, -0.38, 0.04]}>
            <cylinderGeometry args={[0.22, 0.2, 0.14, 16]} />
            <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      )}

      {shape === 'starTalisman' && (
        <group position={[0, 0, -0.07]}>
          {/* Extruded 5-pointed Star */}
          <mesh castShadow geometry={starGeometry}>
            <meshStandardMaterial
              color={material.color}
              metalness={material.metalness}
              roughness={material.roughness}
            />
          </mesh>
          {/* Center Gem Inset */}
          <mesh position={[0, 0, 0.16]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshPhysicalMaterial
              color="#e8748a"
              emissive="#831843"
              emissiveIntensity={0.5}
              roughness={0.1}
              metalness={0.1}
              transmission={0.85}
            />
          </mesh>
          {/* Top Hanging Ring */}
          <mesh position={[0, 0.56, 0.07]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.09, 0.025, 16, 24]} />
            <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      )}
    </group>
  );
}
