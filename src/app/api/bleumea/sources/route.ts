import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { discoverAndValidateSources, revalidateAllSources } from "@/lib/bleumea/source-discovery";

// GET /api/bleumea/sources — list all sources
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const legality = req.nextUrl.searchParams.get("legality");

  const where: any = {};
  if (status) where.status = status;
  if (legality) where.legalityScore = legality;

  const sources = await db.source.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { poems: true } } },
  });

  return NextResponse.json({
    sources: sources.map((s) => ({
      id: s.id,
      name: s.name,
      url: s.url,
      type: s.type,
      region: s.region,
      language: s.language,
      description: s.description,
      termsUrl: s.termsUrl,
      licenseType: s.licenseType,
      legalityScore: s.legalityScore,
      licenseConfidence: s.licenseConfidence,
      copyrightPolicy: s.copyrightPolicy,
      lastLicenseScan: s.lastLicenseScan,
      licenseScanCount: s.licenseScanCount,
      status: s.status,
      healthScore: s.healthScore,
      lastCrawlAt: s.lastCrawlAt,
      crawlCount: s.crawlCount,
      itemsIngested: s.itemsIngested,
      itemsRejected: s.itemsRejected,
      errorRate: s.errorRate,
      lastHealthCheck: s.lastHealthCheck,
      poemsCount: s._count.poems,
      createdAt: s.createdAt,
    })),
  });
}

// POST /api/bleumea/sources — discover new sources or revalidate all
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action: "discover" | "revalidate" = body.action || "discover";

  if (action === "discover") {
    const result = await discoverAndValidateSources();
    return NextResponse.json({ action, result });
  } else {
    const result = await revalidateAllSources();
    return NextResponse.json({ action, result });
  }
}
