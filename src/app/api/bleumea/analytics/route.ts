import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/bleumea/analytics — analytics panel data
export async function GET() {
  const [
    totalEvents,
    ingestEvents,
    rejectEvents,
    translateEvents,
    errorEvents,
    recoverEvents,
    authorDist,
    moodDist,
    themeDist,
    countryDist,
    genreDist,
    recentQa,
  ] = await Promise.all([
    db.analyticsEvent.count(),
    db.analyticsEvent.count({ where: { eventType: "INGEST" } }),
    db.analyticsEvent.count({ where: { eventType: "REJECT" } }),
    db.analyticsEvent.count({ where: { eventType: "TRANSLATE" } }),
    db.analyticsEvent.count({ where: { eventType: "ERROR" } }),
    db.analyticsEvent.count({ where: { eventType: "RECOVER" } }),
    db.poem.groupBy({ by: ["author"], _count: true, orderBy: { _count: { author: "desc" } }, take: 10 }),
    db.poem.groupBy({ by: ["mood"], _count: true, orderBy: { _count: { mood: "desc" } } }),
    db.poem.groupBy({ by: ["theme"], _count: true, orderBy: { _count: { theme: "desc" } } }),
    db.poem.groupBy({ by: ["country"], _count: true, orderBy: { _count: { country: "desc" } }, take: 12 }),
    db.poem.groupBy({ by: ["genre"], _count: true, orderBy: { _count: { genre: "desc" } } }),
    db.qAResult.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);

  // Avg quality per language
  const langStats = await db.poem.groupBy({
    by: ["language"],
    _avg: { qualityScore: true, poetryConfidence: true, translationQuality: true },
    _count: true,
  });

  return NextResponse.json({
    events: {
      total: totalEvents,
      ingest: ingestEvents,
      reject: rejectEvents,
      translate: translateEvents,
      error: errorEvents,
      recover: recoverEvents,
    },
    distributions: {
      topAuthors: authorDist.map((a) => ({ author: a.author, count: a._count })),
      moods: moodDist.filter((m) => m.mood).map((m) => ({ mood: m.mood, count: m._count })),
      themes: themeDist.filter((t) => t.theme).map((t) => ({ theme: t.theme, count: t._count })),
      countries: countryDist.filter((c) => c.country).map((c) => ({ country: c.country, count: c._count })),
      genres: genreDist.filter((g) => g.genre).map((g) => ({ genre: g.genre, count: g._count })),
    },
    languageStats: langStats.map((l) => ({
      language: l.language,
      count: l._count,
      avgQuality: l._avg.qualityScore,
      avgPoetryConfidence: l._avg.poetryConfidence,
      avgTranslationQuality: l._avg.translationQuality,
    })),
    recentQa: recentQa.map((q) => ({
      id: q.id,
      testSuite: q.testSuite,
      testName: q.testName,
      status: q.status,
      durationMs: q.durationMs,
      message: q.message,
      autoFix: q.autoFix,
      createdAt: q.createdAt,
    })),
  });
}
