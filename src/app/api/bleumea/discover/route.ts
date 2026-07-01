import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { STATIC_POEMS } from "@/lib/bleumea/static-poems";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const excludeIds = url.searchParams.get("exclude")?.split(",").filter(Boolean) || [];

  let dbPoems: any[] = [];
  let dbTotal = 0;

  try {
    const allPoems = await db.poem.findMany({
      where: { id: { notIn: excludeIds }, status: { in: ["APPROVED", "QUARANTINE"] } },
      include: { source: { select: { name: true } } },
      take: 100,
    });
    dbPoems = allPoems.map((p: any) => ({
      id: p.id, title: p.title, author: p.author, language: p.language,
      country: p.country, persianTranslation: p.persianTranslation,
      originalText: p.originalText, licenseType: p.licenseType,
      legalityScore: p.legalityScore, qualityScore: p.qualityScore,
      sourceUrl: p.sourceUrl, sourceName: p.source?.name || null,
    }));
    dbTotal = dbPoems.length;
  } catch {
    dbPoems = [];
  }

  const staticAvailable = STATIC_POEMS.filter((p) => !excludeIds.includes(p.id));
  const allAvailable = [...dbPoems, ...staticAvailable];

  if (allAvailable.length === 0) {
    return NextResponse.json({ found: false, poem: null, totalInLibrary: 0, totalDiscovered: 0 });
  }

  const poem = allAvailable[Math.floor(Math.random() * allAvailable.length)];

  return NextResponse.json({
    found: true,
    isNewDiscovery: true,
    totalInLibrary: dbTotal + STATIC_POEMS.length,
    totalDiscovered: excludeIds.length + 1,
    poem,
  });
}
