import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runPipeline } from "@/lib/bleumea/pipeline";
import type { PipelineItemInput } from "@/lib/bleumea/types";

// GET /api/bleumea/pipeline — list recent pipeline runs
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const limit = Math.min(parseInt(params.get("limit") || "20"), 100);

  const runs = await db.pipelineRun.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
    include: { _count: { select: { poems: true } } },
  });

  return NextResponse.json({
    runs: runs.map((r) => ({
      id: r.id,
      status: r.status,
      trigger: r.trigger,
      inputCount: r.inputCount,
      outputCount: r.outputCount,
      rejectedCount: r.rejectedCount,
      quarantineCount: r.quarantineCount,
      stageStats: JSON.parse(r.stageStats || "{}"),
      degradedApis: JSON.parse(r.degradedApis || "[]"),
      fallbacksUsed: JSON.parse(r.fallbacksUsed || "[]"),
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      durationMs: r.durationMs,
      poemsStored: r._count.poems,
    })),
  });
}

// POST /api/bleumea/pipeline — run pipeline on raw text items
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const items: PipelineItemInput[] = body.items || [];
  const trigger: "MANUAL" | "SCHEDULED" | "BACKFILL" | "RETRY" = body.trigger || "MANUAL";
  const sourceId: string | undefined = body.sourceId;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items[] required" }, { status: 400 });
  }

  const result = await runPipeline(items, trigger, sourceId);
  return NextResponse.json({ run: result });
}
