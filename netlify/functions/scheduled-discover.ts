import { schedule } from "@netlify/functions";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

interface CrawledPoem {
  title: string;
  author: string;
  language: string;
  text: string;
  sourceUrl: string;
  sourceName: string;
}

async function crawlPoetryDB(): Promise<CrawledPoem | null> {
  try {
    const res = await fetch("https://poetrydb.org/random/1", {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const poem = data[0];
    if (!poem.title || !poem.author || !poem.lines) return null;

    return {
      title: poem.title,
      author: poem.author,
      language: "en",
      text: Array.isArray(poem.lines) ? poem.lines.join("\n") : String(poem.lines),
      sourceUrl: `https://poetrydb.org/title/${encodeURIComponent(poem.title)}`,
      sourceName: "PoetryDB",
    };
  } catch {
    return null;
  }
}

function validatePoem(poem: CrawledPoem): { valid: boolean; reason?: string } {
  if (poem.text.length < 20) return { valid: false, reason: "خیلی کوتاه" };
  if (poem.text.length > 5000) return { valid: false, reason: "خیلی بلند" };

  const lines = poem.text.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { valid: false, reason: "تک خطی" };

  const avgLineLength = poem.text.length / lines.length;
  if (avgLineLength > 200) return { valid: false, reason: "نثر بلند" };

  const lower = poem.text.toLowerCase();
  const noiseWords = [
    "click here", "subscribe", "buy now", "http://", "https://",
    "<script", "<div", "function(", "lorem ipsum", "cookie",
    "privacy policy", "sign up", "log in",
  ];
  for (const noise of noiseWords) {
    if (lower.includes(noise)) return { valid: false, reason: `نویز: ${noise}` };
  }

  if (!poem.title || poem.title.length < 2) return { valid: false, reason: "عنوان نامعتبر" };
  if (poem.text.includes("<") && poem.text.includes(">")) return { valid: false, reason: "HTML" };

  return { valid: true };
}

async function translateToPersian(
  text: string,
  title: string,
  author: string
): Promise<string> {
  const apiKey = process.env.LLM_API_KEY;
  const baseURL = process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1";
  const model = process.env.LLM_MODEL || "llama-3.3-70b-versatile";

  if (!apiKey) return "[ترجمه موجود نیست — LLM_API_KEY تنظیم نشده]";

  const systemPrompt = `You are a master Persian poet and translator. Translate the given poem into Persian. NEVER translate literally. Preserve emotional tone, poetic rhythm, and metaphors. Output ONLY the Persian poem.`;

  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Title: ${title}\nAuthor: ${author}\n\nPoem:\n"""\n${text}\n"""\n\nTranslate into Persian. Output ONLY the Persian poem.` },
        ],
        temperature: 0.85,
        max_tokens: 800,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return `[خطای ترجمه: ${res.status}]`;
    const data = await res.json();
    return (data.choices?.[0]?.message?.content || "").trim() || "[ترجمه خالی]";
  } catch (err) {
    return `[خطای ترجمه: ${err instanceof Error ? err.message : "نامشخص"}]`;
  }
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL || "";
  if (!databaseUrl) return null;

  if (databaseUrl.startsWith("libsql://") || databaseUrl.startsWith("https://")) {
    try {
      const adapter = new PrismaLibSql({
        url: databaseUrl,
        authToken: process.env.DATABASE_AUTH_TOKEN || "",
      });
      return new PrismaClient({ adapter });
    } catch {
      return null;
    }
  }
  return null;
}

const scheduledHandler = async () => {
  const startTime = Date.now();
  const log: string[] = [];

  try {
    log.push("🔍 شروع کراول...");

    const poem = await crawlPoetryDB();
    if (!poem) {
      log.push("❌ کراول ناموفق");
      return { statusCode: 200, body: JSON.stringify({ log }) };
    }
    log.push(`📄 پیدا شد: "${poem.title}" از ${poem.author}`);

    const validation = validatePoem(poem);
    if (!validation.valid) {
      log.push(`❌ رد شد: ${validation.reason}`);
      return { statusCode: 200, body: JSON.stringify({ log }) };
    }
    log.push("✅ اعتبارسنجی موفق");

    const db = createPrismaClient();
    if (!db) {
      log.push("❌ دیتابیس وصل نیست");
      return { statusCode: 200, body: JSON.stringify({ log }) };
    }

    const existing = await db.poem.findFirst({
      where: {
        OR: [
          { title: poem.title, author: poem.author },
          { originalText: { contains: poem.text.slice(0, 100) } },
        ],
      },
    }).catch(() => null);

    if (existing) {
      log.push("⚠️ تکراری — رد شد");
      await db.$disconnect().catch(() => {});
      return { statusCode: 200, body: JSON.stringify({ log }) };
    }
    log.push("✅ جدید است");

    log.push("🌐 ترجمه...");
    const persianTranslation = await translateToPersian(poem.text, poem.title, poem.author);
    log.push("✅ ترجمه کامل شد");

    await db.poem.create({
      data: {
        title: poem.title,
        author: poem.author,
        language: poem.language,
        country: "US",
        persianTranslation,
        originalText: poem.text,
        licenseType: "PUBLIC_DOMAIN",
        legalityScore: "SAFE",
        licenseConfidence: 0.9,
        poetryConfidence: 0.9,
        translationQuality: 0.85,
        qualityScore: 0.85,
        status: "APPROVED",
        isSaved: true,
        discoveredAt: new Date(),
        sourceUrl: poem.sourceUrl,
      },
    });
    log.push("💾 ذخیره شد");

    await db.$disconnect().catch(() => {});
  } catch (err) {
    log.push(`❌ خطا: ${err instanceof Error ? err.message : String(err)}`);
  }

  const duration = Date.now() - startTime;
  log.push(`⏱️ ${duration}ms`);

  return {
    statusCode: 200,
    body: JSON.stringify({ log, duration }),
  };
};

export const handler = schedule("*/5 * * * *", scheduledHandler);
