/**
 * assetManifest.ts
 * 
 * Central asset abstraction layer for Bonnie's Boutique 3D/16-Bit Scrollytelling.
 * 
 * Provides clean export interfaces separating procedural placeholder definitions
 * from production `.glb` 3D models and `.png` sprite sheets.
 * When production assets become available, simply set type to 'gltf' or 'spritesheet'
 * and provide the asset URL — no scene, camera, or cart logic needs to change.
 */

export type ModelAssetType = 'primitive' | 'gltf';

export type PrimitiveShape = 
  | 'facetedGem'
  | 'enchantedRing'
  | 'potionVial'
  | 'resinCharm'
  | 'celestialOrb'
  | 'heartPendant'
  | 'crystalKeychain'
  | 'starTalisman';

export interface PrimitiveMaterialConfig {
  color: string;
  roughness: number;
  metalness: number;
  transmission?: number;      // Glass / resin transparency (0 to 1)
  ior?: number;               // Index of refraction (1.0 to 2.33)
  thickness?: number;         // Material thickness for physical absorption
  emissive?: string;          // Subtle inner glow
  emissiveIntensity?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  wireframe?: boolean;
}

export interface ModelDescriptor {
  id: string;
  name: string;
  type: ModelAssetType;
  gltfUrl?: string; // e.g. '/models/rose_crystal_keychain.glb'
  primitiveConfig: {
    shape: PrimitiveShape;
    material: PrimitiveMaterialConfig;
    accentColor?: string;
    particleCount?: number;
  };
  scale: [number, number, number];
  pedestalAura: string; // Hex glow color cast onto the pedestal
}

export type SpriteAssetType = 'procedural' | 'spritesheet';

export interface SpriteConfig {
  id: string;
  name: string;
  type: SpriteAssetType;
  sheetUrl?: string; // e.g. '/sprites/bonnie_shopkeeper.png'
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
  fps: number;
  animations: Record<string, number[]>;
}

// ─────────────────────────────────────────────────────────────
// PRESET PROCEDURAL 3D MODELS (Tailored to Boutique Keychains & Charms)
// ─────────────────────────────────────────────────────────────

export const MODEL_PRESETS: ModelDescriptor[] = [
  {
    id: 'preset-faceted-gem',
    name: 'Faceted Rose Gemstone',
    type: 'primitive',
    primitiveConfig: {
      shape: 'facetedGem',
      material: {
        color: '#e8748a',
        roughness: 0.1,
        metalness: 0.15,
        transmission: 0.85,
        ior: 1.52,
        thickness: 0.8,
        emissive: '#5c1b29',
        emissiveIntensity: 0.25,
        clearcoat: 1.0,
      },
      accentColor: '#ffd700',
    },
    scale: [1.2, 1.2, 1.2],
    pedestalAura: '#e8748a',
  },
  {
    id: 'preset-enchanted-ring',
    name: 'Enchanted Golden Ring Keychain',
    type: 'primitive',
    primitiveConfig: {
      shape: 'enchantedRing',
      material: {
        color: '#c48b7a',
        roughness: 0.2,
        metalness: 0.85,
        clearcoat: 0.9,
      },
      accentColor: '#f5efe6',
    },
    scale: [1.1, 1.1, 1.1],
    pedestalAura: '#c48b7a',
  },
  {
    id: 'preset-potion-vial',
    name: 'Glimmering Potion Vial',
    type: 'primitive',
    primitiveConfig: {
      shape: 'potionVial',
      material: {
        color: '#8a5cf6',
        roughness: 0.12,
        metalness: 0.1,
        transmission: 0.9,
        ior: 1.45,
        thickness: 0.6,
        emissive: '#3b1d6e',
        emissiveIntensity: 0.4,
      },
      accentColor: '#c084fc',
    },
    scale: [1.15, 1.15, 1.15],
    pedestalAura: '#a855f7',
  },
  {
    id: 'preset-resin-charm',
    name: 'Botanical Resin Charm',
    type: 'primitive',
    primitiveConfig: {
      shape: 'resinCharm',
      material: {
        color: '#34d399',
        roughness: 0.08,
        metalness: 0.05,
        transmission: 0.92,
        ior: 1.49,
        thickness: 0.9,
        emissive: '#064e3b',
        emissiveIntensity: 0.15,
      },
      accentColor: '#fbbf24',
    },
    scale: [1.2, 1.2, 1.2],
    pedestalAura: '#10b981',
  },
  {
    id: 'preset-celestial-orb',
    name: 'Celestial Stardust Orb',
    type: 'primitive',
    primitiveConfig: {
      shape: 'celestialOrb',
      material: {
        color: '#60a5fa',
        roughness: 0.05,
        metalness: 0.3,
        transmission: 0.8,
        ior: 1.6,
        emissive: '#1e3a8a',
        emissiveIntensity: 0.5,
      },
      accentColor: '#93c5fd',
    },
    scale: [1.1, 1.1, 1.1],
    pedestalAura: '#3b82f6',
  },
  {
    id: 'preset-heart-pendant',
    name: 'Rose Gold Heart Talisman',
    type: 'primitive',
    primitiveConfig: {
      shape: 'heartPendant',
      material: {
        color: '#f43f5e',
        roughness: 0.25,
        metalness: 0.7,
        clearcoat: 0.8,
      },
      accentColor: '#ffe4e6',
    },
    scale: [1.15, 1.15, 1.15],
    pedestalAura: '#f43f5e',
  },
  {
    id: 'preset-crystal-keychain',
    name: 'Amethyst Crystal Cluster',
    type: 'primitive',
    primitiveConfig: {
      shape: 'crystalKeychain',
      material: {
        color: '#c084fc',
        roughness: 0.15,
        metalness: 0.2,
        transmission: 0.75,
        ior: 1.55,
        emissive: '#581c87',
        emissiveIntensity: 0.3,
      },
      accentColor: '#f3e8ff',
    },
    scale: [1.25, 1.25, 1.25],
    pedestalAura: '#c084fc',
  },
  {
    id: 'preset-star-talisman',
    name: 'Twilight Star Trinket',
    type: 'primitive',
    primitiveConfig: {
      shape: 'starTalisman',
      material: {
        color: '#fbbf24',
        roughness: 0.3,
        metalness: 0.9,
        clearcoat: 0.5,
      },
      accentColor: '#fef08a',
    },
    scale: [1.1, 1.1, 1.1],
    pedestalAura: '#f59e0b',
  },
];

/**
 * Deterministically resolve a 3D ModelDescriptor for any product
 * based on product ID or title keywords.
 */
export function getPlaceholderGeometry(productId: string, title?: string): ModelDescriptor {
  if (title) {
    const lower = title.toLowerCase();
    if (lower.includes('heart') || lower.includes('love')) {
      return { ...MODEL_PRESETS[5], id: productId, name: title };
    }
    if (lower.includes('potion') || lower.includes('bottle') || lower.includes('vial')) {
      return { ...MODEL_PRESETS[2], id: productId, name: title };
    }
    if (lower.includes('resin') || lower.includes('green') || lower.includes('flower') || lower.includes('leaf')) {
      return { ...MODEL_PRESETS[3], id: productId, name: title };
    }
    if (lower.includes('orb') || lower.includes('blue') || lower.includes('moon') || lower.includes('sky')) {
      return { ...MODEL_PRESETS[4], id: productId, name: title };
    }
    if (lower.includes('ring') || lower.includes('gold')) {
      return { ...MODEL_PRESETS[1], id: productId, name: title };
    }
    if (lower.includes('star') || lower.includes('sparkle') || lower.includes('sun')) {
      return { ...MODEL_PRESETS[7], id: productId, name: title };
    }
    if (lower.includes('amethyst') || lower.includes('purple') || lower.includes('cluster')) {
      return { ...MODEL_PRESETS[6], id: productId, name: title };
    }
  }

  // Fallback to deterministic hash of ID
  let hash = 0;
  for (let i = 0; i < productId.length; i++) {
    hash = (hash << 5) - hash + productId.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % MODEL_PRESETS.length;
  const base = MODEL_PRESETS[index];

  return {
    ...base,
    id: productId,
    name: title || base.name,
  };
}

// ─────────────────────────────────────────────────────────────
// 2D SPRITE SHEET CONFIGURATION REGISTRY
// ─────────────────────────────────────────────────────────────

export const SPRITE_CONFIGS: Record<string, SpriteConfig> = {
  shopkeeper: {
    id: 'shopkeeper',
    name: 'Shopkeeper Bonnie',
    type: 'procedural',
    sheetUrl: undefined, // Replace with '/sprites/bonnie_shopkeeper.png' when available
    width: 64,
    height: 64,
    frameWidth: 32,
    frameHeight: 32,
    fps: 4,
    animations: {
      idle: [0, 1, 2, 1],
      blink: [0, 3, 0],
      wave: [4, 5, 6, 5],
    },
  },
  counter: {
    id: 'counter',
    name: 'Wooden Store Counter & Cloth',
    type: 'procedural',
    sheetUrl: undefined,
    width: 256,
    height: 64,
    frameWidth: 256,
    frameHeight: 64,
    fps: 1,
    animations: {
      default: [0],
    },
  },
  shelves: {
    id: 'shelves',
    name: 'Potion & Trinket Display Shelves',
    type: 'procedural',
    sheetUrl: undefined,
    width: 320,
    height: 120,
    frameWidth: 320,
    frameHeight: 120,
    fps: 2,
    animations: {
      twinkle: [0, 1, 2, 1],
    },
  },
  floor: {
    id: 'floor',
    name: 'Cobblestone & Wooden Plank Flooring',
    type: 'procedural',
    sheetUrl: undefined,
    width: 480,
    height: 140,
    frameWidth: 480,
    frameHeight: 140,
    fps: 1,
    animations: {
      default: [0],
    },
  },
  banner: {
    id: 'banner',
    name: "Boutique Tapestry Banner",
    type: 'procedural',
    sheetUrl: undefined,
    width: 160,
    height: 48,
    frameWidth: 160,
    frameHeight: 48,
    fps: 2,
    animations: {
      sway: [0, 1, 2, 1],
    },
  },
};

export function getSpriteConfig(spriteId: string): SpriteConfig | undefined {
  return SPRITE_CONFIGS[spriteId];
}

export function getAllSpriteConfigs(): Record<string, SpriteConfig> {
  return SPRITE_CONFIGS;
}
