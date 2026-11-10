/**
 * src/lib/studio/commentary/types.ts
 *
 * Core Types & Interface Contracts for the Multi-Format Commentary Engine
 * & Persistent Anti-Repetition Ledger.
 */

import type { SkitTemplate } from '../skitTemplates';
import type { CatalogProduct } from '../rpgAppraisal';
import type { BackdropId } from '../backdrops';

export type ShowFormatId =
  | 'wild_nature_commentary'
  | 'chaotic_grandma_hot_takes'
  | 'cozy_boutique_lore'
  | 'vintage_relic_debates'
  | 'gen_z_culture_clash'
  | 'craft_breakdown_asmr';

export const ALL_SHOW_FORMATS: readonly ShowFormatId[] = [
  'wild_nature_commentary',
  'chaotic_grandma_hot_takes',
  'cozy_boutique_lore',
  'vintage_relic_debates',
  'gen_z_culture_clash',
  'craft_breakdown_asmr',
] as const;

export interface ShowFormatMetadata {
  id: ShowFormatId;
  displayName: string;
  tagline: string;
  defaultBackdrop: BackdropId;
  usesVideoClip: boolean;
  requiresAppraisalCard: boolean;
  description: string;
}

export interface CommentaryGenerationOptions {
  format?: ShowFormatId;
  productId?: string;
  product?: CatalogProduct;
  videoClipPath?: string;
  customTopic?: string;
  forceProcedural?: boolean;
  targetDurationSec?: number;
}

export interface EpisodeLedgerEntry {
  id: string;
  timestamp: string;
  format: ShowFormatId;
  title: string;
  productId: string;
  productTitle: string;
  clipFile?: string;
  openingHook: string;
  punchline: string;
  trigrams: string[];
  trigramCount: number;
  source: 'llm' | 'procedural';
}

export interface AntiRepetitionLedger {
  version: string;
  lastUpdated: string;
  rollingWindowSize: number; // default: 12
  episodes: EpisodeLedgerEntry[];
  stats: {
    totalGenerated: number;
    formatCounts: Record<ShowFormatId, number>;
    maxRecordedOverlap: number;
  };
}

export interface TrigramOverlapReport {
  passed: boolean;
  maxOverlap: number;
  offendingTrigrams: string[];
  overlappingEpisodeId?: string;
  titleCollision?: boolean;
}

export interface CommentaryGenerationResult {
  skit: SkitTemplate;
  format: ShowFormatId;
  source: 'llm' | 'procedural';
  trigramOverlapMax: number;
  ledgerEntry: EpisodeLedgerEntry;
}

export interface ProceduralSlotContext {
  product: CatalogProduct;
  format: ShowFormatId;
  clipFile?: string;
  customTopic?: string;
  reactionLabel?: string;
  seed?: number;
  excludeTitles?: string[];
  recentScenarioKeys?: string[];
  scenarioOffset?: number;
}
