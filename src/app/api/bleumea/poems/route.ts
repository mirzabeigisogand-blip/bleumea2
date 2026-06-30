import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/bleumea/poems — paginated dataset explorer
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const page = parseInt(params.get("page") || "1");
  const pageSize = Math.min(parseInt(params.get("pageSize") || "20"), 100);
  const language = params.get("language");
  const licenseType = params.get("licenseType");
  const legalityScore = params.get("legalityScore");
  const status = params.get("status");
  const author = params.get("author");
  const q = params.get("q");

  const where: any = {};
  if (language) where.language = language;
  if (licenseType) where.licenseType = licenseType;
  if (legalityScore) where.legalityScore = legalityScore;
  if (status) where.status = status;
  if (author) where.author = { contains: author };
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { author: { contains: q } },
      { persianTranslation: { contains: q } },
    ];
  }

  const sort = params.get("sort") || "newest"; // newest | discovered | quality
  const orderBy: any =
    sort === "discovered"
      ? [{ discoveredAt: "desc" }, { createdAt: "desc" }]
      : sort === "quality"
        ? { qualityScore: "desc" }
        : { createdAt: "desc" };

  const [items, total] = await Promise.all([
    db.poem.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { source: { select: { name: true, url: true } } },
    }),
    db.poem.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map((p) => ({
      id: p.id,
      title: p.title,
      author: p.author,
      language: p.language,
      country: p.country,
      genre: p.genre,
      mood: p.mood,
      theme: p.theme,
      licenseType: p.licenseType,
      licenseConfidence: p.licenseConfidence,
      legalityScore: p.legalityScore,
      sourceUrl: p.sourceUrl,
      originalText: p.originalText,
      persianTranslation: p.persianTranslation,
      poetryConfidence: p.poetryConfidence,
      translationQuality: p.translationQuality,
      duplicateScore: p.duplicateScore,
      qualityScore: p.qualityScore,
      status: p.status,
      version: p.version,
      createdAt: p.createdAt,
      discoveredAt: p.discoveredAt,
      isSaved: p.isSaved,
      source: p.source,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}
