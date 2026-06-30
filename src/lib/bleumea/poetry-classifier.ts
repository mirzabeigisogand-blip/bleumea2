// BLEUMEA — Poetry Classification & Validation Engine
// Multi-layer validation: language detection, structural verse detection,
// semantic poetry classifier, LLM verification, duplicate detection, noise filtering,
// confidence scoring. Threshold: ≥ 0.85 to store.

import type { StageResultDTO } from "./types";

export interface ClassificationResult {
  isPoetry: boolean;
  confidence: number; // 0..1
  language: string;
  layers: {
    languageDetection: number;
    structuralVerse: number;
    semantic: number;
    llmVerification: number;
    duplicate: number;
    noise: number;
  };
  rejectedReasons: string[];
  mood: string;
  theme: string;
  genre: string;
}

const NOISE_TRIGGERS = [
  "lorem ipsum",
  "click here",
  "subscribe now",
  "buy now",
  "free shipping",
  "limited time offer",
  "https://",
  "http://",
  "<script",
  "<div",
  "function(",
  "return ",
  "console.log",
  "var ",
  "const ",
  "import ",
];

const POETRY_MARKERS = [
  "love", "moon", "tear", "shadow", "silence", "river", "heart", "dream",
  "wind", "sky", "star", "rain", "song", "soul", "death", "hope",
  "amour", "lune", "ciel", "âme", "mort", "lumière", "nuit",
  "amor", "luna", "cielo", "alma", "muerte", "noche", "luz",
  "مو", "عشق", "مهتاب", "روح", "مرگ", "آسمان", "ابر", "باران",
];

// Detect language from text (very lightweight heuristic — fallback when no API)
export function detectLanguage(text: string): string {
  if (/[\u0600-\u06FF]/.test(text)) return "fa";
  if (/[\u4e00-\u9fff]/.test(text)) return "zh";
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return "ja";
  if (/[\uac00-\ud7af]/.test(text)) return "ko";
  if (/[\u0400-\u04FF]/.test(text)) return "ru";
  if (/[\u00C0-\u024F]/.test(text) && /le|la|les|une|est|que|qui|dans/.test(text.toLowerCase())) return "fr";
  if (/[\u00C0-\u024F]/.test(text) && /el|la|los|las|una|es|que|en|con/.test(text.toLowerCase())) return "es";
  if (/[\u00C0-\u024F]/.test(text) && /der|die|das|und|ist|nicht|ein/.test(text.toLowerCase())) return "de";
  if (/[\u00C0-\u024F]/.test(text) && /il|che|non|una|sono|amore/.test(text.toLowerCase())) return "it";
  return "en";
}

// Structural verse detection — looks for line breaks, rhymes, meter hints
function structuralScore(text: string): number {
  const lines = text.split(/\n+/).filter((l) => l.trim().length > 0);
  if (lines.length
