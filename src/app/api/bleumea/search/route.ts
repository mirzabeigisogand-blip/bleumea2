import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cosineSimilarity } from "@/lib/bleumea/embedding";

// GET /api/bleumea/search?q=... — semantic + full-text search
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const language = req.nextUrl.searchParams.get("language");
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "20"), 50);

  if (!q.trim()) {
    return NextResponse.json({ results: [], query: q });
  }

  // 1. Fetch all poems (SQLite `contains` is case-sensitive — we filter in JS instead)
  const where: any = {};
  if (language) where.language = language;

  const candidates = await db.poem.findMany({
    where,
    take: 500,
    select: {
      id: true,
      title: true,
      author: true,
      language: true,
      persianTranslation: true,
      originalText: true,
      embeddingVector: true,
      qualityScore: true,
      licenseType: true,
      legalityScore: true,
      sourceUrl: true,
      createdAt: true,
    },
  });

  // 2. Score by relevance — Persian translation match boosts rank
  const ql = q.toLowerCase();
  const results = candidates
    .filter((c) => {
      return (
        c.title.toLowerCase().includes(ql) ||
        c.author.toLowerCase().includes(ql) ||
        (c.persianTranslation || "").toLowerCase().includes(ql) ||
        (c.originalText || "").toLowerCase().includes(ql)
      );
    })
    .map((c) => {
      const persianMatchCount = countMatches(c.persianTranslation || "", q);
      const titleMatch = c.title.toLowerCase().includes(ql) ? 5 : 0;
      const authorMatch = c.author.toLowerCase().includes(ql) ? 3 : 0;
      const score = persianMatchCount * 2 + titleMatch + authorMatch + c.qualityScore * 0.5;
      return { ...c, _score: score };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);

  return NextResponse.json({
    query: q,
    results: results.map((r) => ({
      id: r.id,
      title: r.title,
      author: r.author,
      language: r.language,
      persianTranslation: r.persianTranslation,
      qualityScore: r.qualityScore,
      licenseType: r.licenseType,
      legalityScore: r.legalityScore,
      sourceUrl: r.sourceUrl,
      relevanceScore: r._score,
      createdAt: r.createdAt,
    })),
  });
}

function countMatches(haystack: string, needle: string): number {
  if (!needle) return 0;
  const lower = haystack.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  let count = 0;
  let idx = lower.indexOf(lowerNeedle);
  while (idx !== -1) {
    count++;
    idx = lower.indexOf(lowerNeedle, idx + lowerNeedle.length);
  }
  return count;
}
