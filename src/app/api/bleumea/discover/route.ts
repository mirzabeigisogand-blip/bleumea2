import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/bleumea/discover — کشف یک شعر جدید (بدون تکرار) + ذخیره خودکار در کتابخانه
//
// منطق:
// ۱. اگه اشعاری هستن که هنوز «کشف» نشده‌اند (discoveredAt = null) → یکی از اونا رو برگردون و علامت بزن
// ۲. اگه همه کشف شده‌اند → یه شعر تصادفی از کتابخانه برگردون (جلوگیری از تکرار در نشانه‌گذاری)
// ۳. هر شعری که «کشف» می‌شه، discoveredAt رو ست می‌کنیم تا دوباره کشف نشه
export async function GET(req: Request) {
  const url = new URL(req.url);
  const excludeIds = url.searchParams.get("exclude")?.split(",").filter(Boolean) || [];

  // مرحله ۱: شعرهایی که هنوز کشف نشدن (discoveredAt = null) — یعنی تازه وارد کتابخانه شدن
  const undiscovered = await db.poem.count({
    where: {
      id: { notIn: excludeIds },
      discoveredAt: null,
      status: { in: ["APPROVED", "QUARANTINE"] },
    },
  });

  let poem;
  let isNewDiscovery = false;

  if (undiscovered > 0) {
    // یه شعر پیدا کن که هنوز کشف نشده
    const skip = Math.floor(Math.random() * undiscovered);
    poem = await db.poem.findFirst({
      where: {
        id: { notIn: excludeIds },
        discoveredAt: null,
        status: { in: ["APPROVED", "QUARANTINE"] },
      },
      skip,
      include: { source: { select: { name: true } } },
    });

    if (poem) {
      // علامت‌گذاری به‌عنوان کشف‌شده
      await db.poem.update({
        where: { id: poem.id },
        data: {
          discoveredAt: new Date(),
          isSaved: true,
        },
      });
      isNewDiscovery = true;
    }
  } else {
    // مرحله ۲: همه کشف شده‌اند → یه شعر تصادفی از کتابخانه برگردون
    // این فقط برای جلوگیری از خرابی رادار وقتی منبع تموم شده
    const total = await db.poem.count({
      where: { id: { notIn: excludeIds }, status: { in: ["APPROVED", "QUARANTINE"] } },
    });

    if (total === 0) {
      return NextResponse.json({ found: false, poem: null });
    }

    const skip = Math.floor(Math.random() * total);
    poem = await db.poem.findFirst({
      where: { id: { notIn: excludeIds }, status: { in: ["APPROVED", "QUARANTINE"] } },
      skip,
      include: { source: { select: { name: true } } },
    });
  }

  if (!poem) {
    return NextResponse.json({ found: false, poem: null });
  }

  return NextResponse.json({
    found: true,
    isNewDiscovery,
    totalInLibrary: await db.poem.count({ where: { isSaved: true } }),
    totalDiscovered: await db.poem.count({ where: { discoveredAt: { not: null } } }),
    poem: {
      id: poem.id,
      title: poem.title,
      author: poem.author,
      language: poem.language,
      country: poem.country,
      persianTranslation: poem.persianTranslation,
      originalText: poem.originalText,
      licenseType: poem.licenseType,
      legalityScore: poem.legalityScore,
      qualityScore: poem.qualityScore,
      sourceUrl: poem.sourceUrl,
      sourceName: poem.source?.name || null,
      discoveredAt: poem.discoveredAt,
    },
  });
}

// POST /api/bleumea/discover — افزودن دستی یه شعر جدید به کتابخانه
// این endpoint برای اضافه‌کردن شعر از منابع خارجی استفاده می‌شه
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // اگه شعر خام ارسال شده (از رادار خارجی)، اول چک کن تکراری نباشه
    if (body.rawText) {
      const { rawText, title, author, language, sourceUrl, persianTranslation } = body;

      // جلوگیری از تکرار — بر اساس عنوان + نویسنده + ۱۰۰ کاراکتر اول متن
      const textHash = rawText.trim().slice(0, 100).toLowerCase();
      const existing = await db.poem.findFirst({
        where: {
          OR: [
            { title, author },
            { originalText: { contains: textHash } },
          ],
        },
      });

      if (existing) {
        return NextResponse.json({
          success: false,
          error: "این شعر قبلاً در کتابخانه وجود دارد",
          existingId: existing.id,
        }, { status: 409 });
      }

      // شعر جدید رو اضافه کن
      const poem = await db.poem.create({
        data: {
          title: title || "Untitled",
          author: author || "Anonymous",
          language: language || "en",
          country: body.country || null,
          persianTranslation: persianTranslation || "",
          originalText: rawText,
          licenseType: body.licenseType || "UNKNOWN",
          legalityScore: body.legalityScore || "BLOCKED",
          licenseConfidence: 0,
          poetryConfidence: 0.9,
          translationQuality: persianTranslation ? 0.85 : 0,
          qualityScore: 0.8,
          status: "APPROVED",
          isSaved: true,
          discoveredAt: new Date(),
          sourceUrl,
        },
      });

      return NextResponse.json({
        success: true,
        message: "شعر جدید به کتابخانه اضافه شد",
        poemId: poem.id,
      });
    }

    return NextResponse.json({ error: "rawText لازم است" }, { status: 400 });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: reason }, { status: 500 });
  }
}
