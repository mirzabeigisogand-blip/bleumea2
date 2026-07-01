import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

// GET /api/bleumea/seed-db — وارد کردن دیتای اولیه (۱۴ شعر)
export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!databaseUrl) {
    return NextResponse.json({
      success: false,
      error: "DATABASE_URL تنظیم نشده",
    }, { status: 500 });
  }

  try {
    const client = createClient({
      url: databaseUrl,
      authToken: authToken || "",
    });

    // چک کن جدول Poem وجود داره
    try {
      await client.execute("SELECT COUNT(*) FROM Poem");
    } catch {
      return NextResponse.json({
        success: false,
        error: "جدول Poem وجود ندارد. اول به /api/bleumea/init-db برو",
      }, { status: 500 });
    }

    // چک کن خالی هست یا نه
    const existing = await client.execute("SELECT COUNT(*) as count FROM Poem");
    const existingCount = Number(existing.rows[0].count);

    if (existingCount > 0) {
      return NextResponse.json({
        success: true,
        message: `دیتابیس از قبل ${existingCount} شعر دارد — نیازی به seed نیست`,
        count: existingCount,
      });
    }

    // دیتای اولیه
    const poems = [
      ["The Road Not Taken", "Robert Frost", "en", "US", "در جنگلی زرد، دو راه از هم جدا شد\nو من اندوهگین که نمی‌توانستم هر دو را بپویم", "Two roads diverged in a yellow wood,\nAnd sorry I could not travel both", "PUBLIC_DOMAIN", "SAFE", 0.92],
      ["Hope is the thing with feathers", "Emily Dickinson", "en", "US", "امید آن چیز پربال است\nکه در جان می‌نشیند", "Hope is the thing with feathers\nThat perches in the soul", "PUBLIC_DOMAIN", "SAFE", 0.88],
      ["Demain dès l'aube", "Victor Hugo", "fr", "FR", "فردا، به سپیده‌دم، در ساعتی که دشت سفید می‌شود،\nمی‌روم.", "Demain, dès l'aube, à l'heure où blanchit la campagne,\nJe partirai.", "PUBLIC_DOMAIN", "SAFE", 0.90],
      ["Der Panther", "Rainer Maria Rilke", "de", "DE", "نگاهش از رفت‌و‌آمدِ میله‌ها\nچنان خسته شده که چیزی نگه نمی‌دارد.", "Sein Blick ist vom Vorübergehn der Stäbe\nso müd geworden.", "PUBLIC_DOMAIN", "SAFE", 0.89],
      ["Noche de verano", "Antonio Machado", "es", "ES", "شبی است از تابستان.\nهوا بوی شکوفه می‌دهد.", "Es una noche de verano.\nEl aire huele a azahar y a mujer.", "PUBLIC_DOMAIN", "SAFE", 0.87],
      ["Я вас любил", "Alexander Pushkin", "ru", "RU", "دوستتان داشتم: عشق، شاید،\nدر جانم هنوز کاملاً نبوده است.", "Я вас любил: любовь еще, быть может,\nВ душе моей угасла не совсем.", "PUBLIC_DOMAIN", "SAFE", 0.91],
      ["Old Pond", "Matsuo Bashō", "ja", "JP", "برکه‌ی کهنه\nقورباغه‌ای در جهید\nصدای آب.", "古池や\n蛙飛び込む\n水の音", "PUBLIC_DOMAIN", "SAFE", 0.85],
      ["Quiet Night Thought", "Li Bai", "zh", "CN", "پیشِ بستر، نورِ ماهِ روشن\nگمان برف‌وزر بر زمین است", "床前明月光\n疑是地上霜", "PUBLIC_DOMAIN", "SAFE", 0.86],
      ["Fire and Ice", "Robert Frost", "en", "US", "بعضی می‌گویند جهان در آتش فرو خواهد رفت،\nبعضی در یخ.", "Some say the world will end in fire,\nSome say in ice.", "PUBLIC_DOMAIN", "SAFE", 0.91],
      ["Sonnet 18", "William Shakespeare", "en", "GB", "آیا تو را با روز تابستانی مقایسه کنم؟\nتو زیباتر و معتدل‌تری.", "Shall I compare thee to a summer's day?\nThou art more lovely and more temperate.", "PUBLIC_DOMAIN", "SAFE", 0.94],
      ["Dreams", "Langston Hughes", "en", "US", "به رویاهایت پایبند باش\nزیرا اگر رویا بمیرد،\nزندگی پرنده‌ای است با بال‌های شکسته.", "Hold fast to dreams\nFor if dreams die\nLife is a broken-winged bird", "PUBLIC_DOMAIN", "SAFE", 0.88],
      ["از غزل‌های شمس", "Jalaluddin Rumi", "fa", "IR", "بشنو این نی چون شکایت می‌کند\nاز جدایی‌ها حکایت می‌کند", "بشنو این نی چون شکایت می‌کند\nاز جدایی‌ها حکایت می‌کند", "PUBLIC_DOMAIN", "SAFE", 0.95],
      ["The Fog", "Carl Sandburg", "en", "US", "مه می‌آید\nبا پاهای بچه‌گربه.", "The fog comes\non little cat feet.", "PUBLIC_DOMAIN", "SAFE", 0.83],
      ["Ozymandias", "Percy Bysshe Shelley", "en", "GB", "به مسافری از سرزمینی باستانی برخوردم\nکه گفت: دو پا بی‌تنِ سنگی\nدر بیابان ایستاده‌اند.", "I met a traveller from an antique land,\nWho said—\"Two vast and trunkless legs of stone", "PUBLIC_DOMAIN", "SAFE", 0.93],
    ];

    let inserted = 0;
    for (const p of poems) {
      const id = `seed-${Date.now()}-${inserted}`;
      await client.execute({
        sql: `INSERT INTO Poem (id, title, author, language, country, persianTranslation, originalText, licenseType, legalityScore, licenseConfidence, poetryConfidence, translationQuality, qualityScore, status, isSaved, "createdAt", "updatedAt", "discoveredAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], 0.9, 0.9, 0.85, p[8], "APPROVED", true, new Date().toISOString(), new Date().toISOString(), new Date().toISOString()],
      });
      inserted++;
    }

    return NextResponse.json({
      success: true,
      message: `${inserted} شعر با موفقیت وارد شد!`,
      count: inserted,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
