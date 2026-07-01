import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { STATIC_POEMS } from "@/lib/bleumea/static-poems";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const pageSize = Math.min(parseInt(params.get("pageSize") || "20"), 100);
  const q = params.get("q")?.toLowerCase() || "";

  let dbPoems: any[] = [];

  try {
    const where: any = {};
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { author: { contains: q } },
        { persianTranslation: { contains: q } },
      ];
    }
    dbPoems = await db.poem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: pageSize,
      include: { source: { select: { name: true, url: true } } },
    });
    dbPoems = dbPoems.map((p) => ({
      id: p.id, title: p.title, author: p.author, language: p.language,
      country: p.country, licenseType: p.licenseType, legalityScore: p.legalityScore,
      sourceUrl: p.sourceUrl, originalText: p.originalText,
      persianTranslation: p.persianTranslation, qualityScore: p.qualityScore,
      createdAt: p.createdAt, discoveredAt: p.discoveredAt, isSaved: p.isSaved,
      source: p.source,
    }));
  } catch {
    dbPoems = [];
  }

  let staticPoems = STATIC_POEMS.map((p) => ({
    ...p,
    source: { name: p.sourceName, url: p.sourceUrl },
    discoveredAt: null, isSaved: true, createdAt: new Date().toISOString(),
  }));

  if (q) {
    staticPoems = staticPoems.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      p.author.toLowerCase().includes(q) ||
      p.persianTranslation.toLowerCase().includes(q)
    );
  }

  const allItems = [...dbPoems, ...staticPoems].slice(0, pageSize);
  const total = dbPoems.length + staticPoems.length;

  return NextResponse.json({
    items: allItems,
    pagination: { page: 1, pageSize, total, totalPages: 1 },
  });
}
