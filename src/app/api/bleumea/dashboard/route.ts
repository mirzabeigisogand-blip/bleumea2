import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/bleumea/dashboard — aggregated KPIs + chart data
export async function GET() {
  const [
    totalPoems,
    approvedPoems,
    quarantinedPoems,
    rejectedPoems,
    totalSources,
    safeSources,
    limitedSources,
    blockedSources,
    recentRuns,
    recentLogs,
    languageDist,
    licenseDist,
    qualityBuckets,
    apiHealthEvents,
  ] = await Promise.all([
    db.poem.count(),
    db.poem.count({ where: { status: "APPROVED" } }),
    db.poem.count({ where: { status: "QUARANTINE" } }),
    db.poem.count({ where: { status: "REJECTED" } }),
    db.source.count(),
    db.source.count({ where: { legalityScore: "SAFE" } }),
    db.source.count({ where: { legalityScore: "LIMITED" } }),
    db.source.count({ where: { legalityScore: "BLOCKED" } }),
    db.pipelineRun.findMany({ orderBy: { startedAt: "desc" }, take: 10 }),
    db.systemLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    db.poem.groupBy({ by: ["language"], _count: true, orderBy: { _count: { language: "desc" } } }),
    db.poem.groupBy({ by: ["licenseType"], _count: true }),
    db.poem.findMany({ select: { qualityScore: true }, take: 500 }),
    db.analyticsEvent.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
  ]);

  // Build language distribution
  const langDist = languageDist.map((l) => ({ language: l.language, count: l._count }));

  // Build license distribution
  const licDist = licenseDist.map((l) => ({ license: l.licenseType, count: l._count }));

  // Quality buckets: 0..0.2, 0.2..0.4, 0.4..0.6, 0.6..0.8, 0.8..1.0
  const buckets = [0, 0, 0, 0, 0];
  for (const p of qualityBuckets) {
    const idx = Math.min(4, Math.floor(p.qualityScore * 5));
    buckets[idx]++;
  }
  const qualityDist = buckets.map((count, i) => ({
    bucket: `${(i * 0.2).toFixed(1)}–${((i + 1) * 0.2).toFixed(1)}`,
    count,
  }));

  // Ingestion timeline (last 14 days, buckets by day)
  const timeline: Array<{ date: string; count: number }> = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    day.setHours(0, 0, 0, 0);
    const next = new Date(day);
    next.setDate(day.getDate() + 1);
    const events = apiHealthEvents.filter(
      (e) => e.createdAt >= day && e.createdAt < next && e.eventType === "INGEST"
    );
    timeline.push({ date: day.toISOString().slice(0, 10), count: events.length });
  }

  // Pipeline success rate (last 10 runs)
  const successRuns = recentRuns.filter((r) => r.status === "SUCCESS").length;
  const pipelineSuccessRate = recentRuns.length > 0 ? successRuns / recentRuns.length : 0;

  return NextResponse.json({
    kpis: {
      totalPoems,
      approvedPoems,
      quarantinedPoems,
      rejectedPoems,
      totalSources,
      safeSources,
      limitedSources,
      blockedSources,
      pipelineRuns24h: recentRuns.length,
      pipelineSuccessRate,
    },
    charts: {
      languageDistribution: langDist,
      licenseDistribution: licDist,
      qualityDistribution: qualityDist,
      ingestionTimeline: timeline,
    },
    recentRuns: recentRuns.map((r) => ({
      id: r.id,
      status: r.status,
      trigger: r.trigger,
      inputCount: r.inputCount,
      outputCount: r.outputCount,
      rejectedCount: r.rejectedCount,
      quarantineCount: r.quarantineCount,
      durationMs: r.durationMs,
      degradedApis: JSON.parse(r.degradedApis || "[]"),
      fallbacksUsed: JSON.parse(r.fallbacksUsed || "[]"),
      startedAt: r.startedAt,
    })),
    recentLogs: recentLogs.map((l) => ({
      id: l.id,
      level: l.level,
      category: l.category,
      message: l.message,
      autoRecovered: l.autoRecovered,
      createdAt: l.createdAt,
    })),
  });
}
