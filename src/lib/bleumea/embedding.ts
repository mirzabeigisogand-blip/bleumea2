// BLEUMEA — Embedding & Deduplication Engine
// Generates semantic vectors and detects duplicates.

import { db } from "@/lib/db";

export interface EmbeddingResult {
  vector: string; // base64 of Float32Array
  dim: number;
  model: string;
  durationMs: number;
  fallbackUsed: boolean;
}

// Deterministic lightweight hash-based embedding (384-dim placeholder).
// In production this would call the EMBEDDING API.
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const startedAt = Date.now();
  const dim = 384;
  const vec = new Float32Array(dim);
  // Hash each token, distribute across dim
  const tokens = text.toLowerCase().split(/\W+/).filter((t) => t.length > 1);
  for (const token of tokens) {
    let h = 5381;
    for (let i = 0; i < token.length; i++) h = (h * 33) ^ token.charCodeAt(i);
    const idx = Math.abs(h) % dim;
    vec[idx] += 1;
  }
  // Normalize
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < dim; i++) vec[i] /= norm;

  // Pack to base64
  const buf = Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
  return {
    vector: buf.toString("base64"),
    dim,
    model: "bleumea-hash-384",
    durationMs: Date.now() - startedAt,
    fallbackUsed: false,
  };
}

// Cosine similarity between two base64-encoded Float32 vectors
export function cosineSimilarity(a: string, b: string): number {
  const va = new Float32Array(Buffer.from(a, "base64").buffer);
  const vb = new Float32Array(Buffer.from(b, "base64").buffer);
  if (va.length !== vb.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < va.length; i++) {
    dot += va[i] * vb[i];
    na += va[i] * va[i];
    nb += vb[i] * vb[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

// Quick exact-duplicate check via text hash (fast pre-filter)
function textHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return Math.abs(h).toString(16);
}

// Find duplicates against existing poems
export async function findDuplicate(
  text: string,
  embedding: string
): Promise<{ duplicateScore: number; matchedPoemId: string | null }> {
  // 1. Fast hash check
  const hash = textHash(text);
  // Look at recent poems for hash match (cheap pre-filter)
  const candidates = await db.poem.findMany({
    where: { status: "APPROVED" },
    select: { id: true, embeddingVector: true, originalText: true, persianTranslation: true },
    take: 500,
    orderBy: { createdAt: "desc" },
  });

  let bestScore = 0;
  let matchedPoemId: string | null = null;

  for (const c of candidates) {
    if (!c.embeddingVector) continue;
    const sim = cosineSimilarity(embedding, c.embeddingVector);
    if (sim > bestScore) {
      bestScore = sim;
      matchedPoemId = sim > 0.92 ? c.id : null;
    }
  }

  // Exact text hash check
  for (const c of candidates) {
    if (c.originalText && textHash(c.originalText) === hash) {
      return { duplicateScore: 1.0, matchedPoemId: c.id };
    }
  }

  return { duplicateScore: bestScore, matchedPoemId };
}
