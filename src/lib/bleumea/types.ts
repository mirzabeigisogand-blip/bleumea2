// BLEUMEA — Pipeline types & constants

export const PIPELINE_STAGES = [
  "CRAWLER",
  "PREFILTER",
  "LANG_DETECT",
  "POETRY_CLASSIFIER",
  "LICENSE_CHECKER",
  "DEDUP",
  "TRANSLATION",
  "EMBEDDING",
  "STORAGE",
] as const;

export type PipelineStageName = (typeof PIPELINE_STAGES)[number];

export type LegalityScore = "SAFE" | "LIMITED" | "BLOCKED";
export type LicenseType =
  | "PUBLIC_DOMAIN"
  | "CC0"
  | "CC_BY"
  | "CC_BY_SA"
  | "CC_BY_NC"
  | "CC_BY_ND"
  | "RESTRICTED"
  | "UNKNOWN";

export type ApiName = "CLASSIFICATION" | "TRANSLATION" | "EMBEDDING" | "ANALYTICS";

export type ApiStatus = "HEALTHY" | "DEGRADED" | "DOWN" | "FALLBACK";

export interface ApiHealth {
  name: ApiName;
  status: ApiStatus;
  latencyMs: number;
  successRate: number; // 0..1
  lastCheckedAt: string;
  fallbackActive: boolean;
  primaryModel: string;
  fallbackModel?: string;
}

export interface StageStat {
  success: number;
  failed: number;
  skipped: number;
  avgMs: number;
}

export interface StageResultDTO {
  stageName: PipelineStageName;
  status: "SUCCESS" | "FAILED" | "SKIPPED" | "RETRY";
  confidence?: number;
  durationMs?: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface PipelineItemInput {
  rawText: string;
  sourceUrl: string;
  title?: string;
  author?: string;
  language?: string;
  country?: string;
}

export interface PoemDTO {
  id: string;
  title: string;
  author: string;
  language: string;
  country: string | null;
  genre: string | null;
  mood: string | null;
  theme: string | null;
  licenseType: string;
  licenseConfidence: number;
  legalityScore: string;
  sourceUrl: string | null;
  originalText: string | null;
  persianTranslation: string;
  poetryConfidence: number;
  translationQuality: number;
  duplicateScore: number;
  qualityScore: number;
  status: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  sourceId: string | null;
}

export const LICENSE_RANK: Record<LicenseType, number> = {
  PUBLIC_DOMAIN: 5,
  CC0: 5,
  CC_BY: 4,
  CC_BY_SA: 4,
  CC_BY_NC: 2,
  CC_BY_ND: 2,
  RESTRICTED: 0,
  UNKNOWN: 0,
};

export const LICENSE_LABELS: Record<LicenseType, string> = {
  PUBLIC_DOMAIN: "Public Domain",
  CC0: "CC0 (No Rights Reserved)",
  CC_BY: "CC BY 4.0",
  CC_BY_SA: "CC BY-SA 4.0",
  CC_BY_NC: "CC BY-NC 4.0",
  CC_BY_ND: "CC BY-ND 4.0",
  RESTRICTED: "Restricted / All Rights Reserved",
  UNKNOWN: "Unknown — Needs Review",
};

export const POETRY_CONFIDENCE_THRESHOLD = 0.85;

// Persian moods & themes for translation engine
export const MOOD_PRESETS = [
  "melancholic",
  "ecstatic",
  "romantic",
  "elegiac",
  "mystical",
  "rebellious",
  "contemplative",
  "joyful",
];

export const THEME_PRESETS = [
  "love",
  "loss",
  "nature",
  "mysticism",
  "war",
  "exile",
  "identity",
  "time",
  "death",
  "beauty",
];
