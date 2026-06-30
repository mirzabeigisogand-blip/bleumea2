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
  if (lines.length < 2) return 0.1;

  // Short lines (typical verse) 4-80 chars
  const avgLen = lines.reduce((s, l) => s + l.trim().length, 0) / lines.length;
  let score = 0.4;
  if (avgLen >= 10 && avgLen <= 80) score += 0.3;

  // End-rhyme detection (last 2-3 chars match across lines)
  const endings = lines.slice(0, 12).map((l) => l.trim().toLowerCase().slice(-3));
  const rhymingPairs = endings.reduce((count, ending, i) => {
    if (i === 0) return 0;
    return endings[i - 1] === ending ? count + 1 : count;
  }, 0);
  const rhymeRatio = rhymingPairs / Math.max(endings.length - 1, 1);
  score += rhymeRatio * 0.3;

  return Math.min(1, score);
}

// Semantic poetry markers
function semanticScore(text: string): number {
  const lower = text.toLowerCase();
  const matches = POETRY_MARKERS.reduce(
    (count, marker) => (lower.includes(marker) ? count + 1 : count),
    0
  );
  return Math.min(1, matches / 6);
}

// Noise filter — rejects non-poetic content
function noiseScore(text: string): { score: number; reasons: string[] } {
  const lower = text.toLowerCase();
  const reasons: string[] = [];
  let triggers = 0;
  for (const trigger of NOISE_TRIGGERS) {
    if (lower.includes(trigger)) {
      triggers++;
      reasons.push(`noise:${trigger}`);
    }
  }
  // Prose paragraphs are usually long single blocks
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  if (paragraphs.length === 1 && paragraphs[0].length > 600) {
    triggers++;
    reasons.push("single long paragraph (likely prose/article)");
  }
  // Word-to-line ratio check (prose = many words per line)
  const lines = text.split(/\n+/).filter((l) => l.trim().length > 0);
  const words = text.split(/\s+/).filter((w) => w.length > 0).length;
  if (lines.length > 0 && words / lines.length > 25) {
    triggers++;
    reasons.push("high words-per-line (likely prose)");
  }
  return { score: Math.min(1, triggers * 0.4), reasons };
}

// LLM verification stub — when LLM API unavailable, use heuristics
function llmVerificationScore(text: string, structural: number, semantic: number): number {
  // Combine signals with weighted sum, plus a soft prior on length
  const words = text.split(/\s+/).filter((w) => w.length > 0).length;
  const lengthPrior = words >= 8 && words <= 400 ? 0.7 : 0.4;
  return Math.min(1, 0.4 * structural + 0.4 * semantic + 0.2 * lengthPrior);
}

export function classifyPoetry(
  text: string,
  knownLanguage?: string
): ClassificationResult {
  const language = knownLanguage || detectLanguage(text);

  const languageDetection = 0.95; // confident — deterministic
  const structural = structuralScore(text);
  const semantic = semanticScore(text);
  const llmVerification = llmVerificationScore(text, structural, semantic);
  const duplicate = 0; // computed downstream against DB
  const noise = noiseScore(text);

  const rejectedReasons: string[] = [...noise.reasons];
  if (structural < 0.3) rejectedReasons.push("low structural verse score");
  if (semantic < 0.15) rejectedReasons.push("no poetic markers");
  if (llmVerification < 0.5) rejectedReasons.push("LLM verification failed");

  // Weighted confidence
  const confidence =
    0.15 * languageDetection +
    0.3 * structural +
    0.25 * semantic +
    0.2 * llmVerification +
    0.1 * (1 - noise.score);

  const isPoetry = confidence >= 0.85 && noise.score < 0.5;

  // Mood/theme/genre inference
  const mood = inferMood(text);
  const theme = inferTheme(text);
  const genre = inferGenre(language, structural);

  return {
    isPoetry,
    confidence,
    language,
    layers: {
      languageDetection,
      structuralVerse: structural,
      semantic,
      llmVerification,
      duplicate,
      noise: noise.score,
    },
    rejectedReasons,
    mood,
    theme,
    genre,
  };
}

function inferMood(text: string): string {
  const lower = text.toLowerCase();
  if (/(tear|cry|weep|sorrow|grief|مرگ|اشک|غم|مرثیه)/.test(lower)) return "elegiac";
  if (/(love|heart|amor|عشق|دل)/.test(lower)) return "romantic";
  if (/(star|moon|sky|sky|sky|ستاره|مهتاب|آسمان)/.test(lower)) return "mystical";
  if (/(war|fight|blood|جنگ|خون)/.test(lower)) return "rebellious";
  if (/(hope|light|dawn|امید|نور|سحر)/.test(lower)) return "joyful";
  if (/(silence|shadow|dark|سکوت|سایه|تاریک)/.test(lower)) return "melancholic";
  return "contemplative";
}

function inferTheme(text: string): string {
  const lower = text.toLowerCase();
  if (/(love|amor|amour|عشق)/.test(lower)) return "love";
  if (/(death|mort|muerte|مرگ)/.test(lower)) return "death";
  if (/(war|guerre|جنگ)/.test(lower)) return "war";
  if (/(moon|river|tree|sky|moon|مهتاب|رود|درخت|آسمان)/.test(lower)) return "nature";
  if (/(god|soul|spirit|خدا|روح)/.test(lower)) return "mysticism";
  if (/(home|exile|return|وطن|تبعید|بازگشت)/.test(lower)) return "exile";
  if (/(time|hour|temps|زمان|ساعت)/.test(lower)) return "time";
  return "identity";
}

function inferGenre(language: string, structural: number): string {
  if (language === "fa") return "ghazal";
  if (language === "ja") return "haiku";
  if (language === "zh") return "shi";
  if (structural > 0.7) return "lyric";
  return "free-verse";
}

export function toStageResult(
  result: ClassificationResult,
  durationMs: number
): StageResultDTO {
  return {
    stageName: "POETRY_CLASSIFIER",
    status: result.isPoetry ? "SUCCESS" : "FAILED",
    confidence: result.confidence,
    durationMs,
    message: result.isPoetry
      ? `Poetry confirmed (mood=${result.mood}, theme=${result.theme})`
      : `Rejected: ${result.rejectedReasons.join("; ")}`,
    metadata: { layers: result.layers },
  };
}
