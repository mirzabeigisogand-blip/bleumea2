import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/bleumea/pipeline/[id] — get a single pipeline run with all stage results
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const run = await db.pipelineRun.findUnique({
    where: { id },
    include: {
      poems: {
        select: {
          id: true,
          title: true,
          author: true,
          language: true,
          status: true,
          qualityScore: true,
          licenseType: true,
          legalityScore: true,
          pipelineStages: {
            select: {
              stageName: true,
              status: true,
              confidence: true,
              durationMs: true,
              message: true,
              metadata: true,
              createdAt: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
        take: 50,
      },
    },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json({
    run: {
      id: run.id,
      status: run.status,
      trigger: run.trigger,
      inputCount: run.inputCount,
      outputCount: run.outputCount,
      rejectedCount: run.rejectedCount,
      quarantineCount: run.quarantineCount,
      stageStats: JSON.parse(run.stageStats || "{}"),
      degradedApis: JSON.parse(run.degradedApis || "[]"),
      fallbacksUsed: JSON.parse(run.fallbacksUsed || "[]"),
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      durationMs: run.durationMs,
      poems: run.poems,
    },
  });
}
