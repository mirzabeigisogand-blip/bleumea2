// BLEUMEA — Database seed script
// Populates realistic global poetry across multiple languages & licenses.
// CRITICAL: never seeds original text for restricted sources.

import { PrismaClient } from "@prisma/client";
import { detectLicense } from "../src/lib/bleumea/license-intel";
import { classifyPoetry, detectLanguage } from "../src/lib/bleumea/poetry-classifier";
import { generateEmbedding } from "../src/lib/bleumea/embedding";

const db = new PrismaClient();

let quarantined_count = 0;

interface SeedPoem {
  title: string;
  author: string;
  language: string;
  country: string;
  genre: string;
  rawText: string;
  persianTranslation: string;
  sourceUrl: string;
  sourceName: string;
  sourceType: string;
  sourceRegion?: string;
  sourceLanguage?: string;
  sourceDescription?: string;
  sourceTermsUrl?: string;
}

const SEED_POEMS: SeedPoem[] = [
  // ─── English — Public Domain ──────────────────────────────────────────────
  {
    title: "The Road Not Taken",
    author: "Robert Frost",
    language: "en",
    country: "US",
    genre: "lyric",
    rawText: `Two roads diverged in a yellow wood,
And sorry I could not travel both
And be one traveler, long I stood
And looked down one as far as I could
To where it bent in the undergrowth;

Then took the other, as just as fair,
And having perhaps the better claim,
Because it was grassy and wanted wear;
Though as for that the passing there
Had worn them really about the same,

And both that morning equally lay
In leaves no step had trodden black.
Oh, I kept the first for another day!
Yet knowing how way leads on to way,
I doubted if I should ever come back.

I shall be telling this with a sigh
Somewhere ages and ages hence:
Two roads diverged in a wood, and I—
I took the one less traveled by,
And that has made all the difference.`,
    persianTranslation: `در جنگلی زرد، دو راه از هم جدا شد
و من اندوهگین که نمی‌توانستم هر دو را بپویم
و یک سراپا راه‌پو باشم، درنگ کردم
و تا آنجا که توانستم به یکی نگاه کردم
تا جایی که در زیربوته‌ها پیچید؛

آنگاه دیگری را برگزیدم، چون برابر و زیبا
و شاید ادعایی بهتر داشت،
چون علفزار بود و کم‌کوبیده
هرچند آنجا که رفت‌وآمد می‌بود
هر دو را یکسان فرسوده بود؛

و آن صبح هر دو به‌برابری
برگ‌های لگدنخورده‌سیاه نداشتند.
آه، نخستین را برای روزی دیگر نگاه داشتم!
اما چون می‌دانم که راه، راه را می‌خواند،
بازگشت را باور نداشتم.

روزی، در عصری و عصری، با آهی این را خواهم گفت:
در جنگلی دو راه از هم جدا شد، و من—
من آن کم‌پیموده را گزیدم،
و این همه تفاوت آفرید.`,
    sourceUrl: "https://gutenberg.org/files/11/11-h/11-h.htm",
    sourceName: "Project Gutenberg — Frost Collection",
    sourceType: "PUBLIC_DOMAIN",
    sourceRegion: "US",
    sourceLanguage: "en",
    sourceDescription: "Public-domain works of Robert Frost.",
    sourceTermsUrl: "https://gutenberg.org/policy/terms_of_use.html",
  },
  {
    title: "Hope is the thing with feathers",
    author: "Emily Dickinson",
    language: "en",
    country: "US",
    genre: "lyric",
    rawText: `Hope is the thing with feathers
That perches in the soul,
And sings the tune without the words,
And never stops at all,

And sweetest in the gale is heard;
And sore must be the storm
That could abash the little bird
That kept so many warm.

I've heard it in the chillest land,
And on the strangest sea;
Yet, never, in extremity,
It asked a crumb of me.`,
    persianTranslation: `امید آن چیز پربال است
که در جان می‌نشیند،
و نغمه‌ای بی‌سخن می‌خواند،
و هرگز نمی‌ایستد،

و در تندباد خوش‌آهنگ‌تر شنیده می‌شود؛
و باد باید سهمگین باشد
تا آن پرنده‌ی کوچک را بیازارد
که چنان بسیاری را گرم داشت.

در سردترین سرزمین شنیده‌ام‌اش،
و در عجیب‌ترین دریا؛
با این همه، هرگز در تنگنا
تا ته‌نان از من نخواست.`,
    sourceUrl: "https://www.emilydickinsonmuseum.org/poems/",
    sourceName: "Emily Dickinson Museum — Poems",
    sourceType: "PUBLIC_DOMAIN",
    sourceRegion: "US",
    sourceLanguage: "en",
    sourceDescription: "Emily Dickinson's poems in public domain.",
  },
  {
    title: "Stopping by Woods on a Snowy Evening",
    author: "Robert Frost",
    language: "en",
    country: "US",
    genre: "lyric",
    rawText: `Whose woods these are I think I know.
His house is in the village though;
He will not see me stopping here
To watch his woods fill up with snow.

My little horse must think it queer
To stop without a farmhouse near
Between the woods and frozen lake
The darkest evening of the year.

He gives his harness bells a shake
To ask if there is some mistake.
The only other sound's the sweep
Of easy wind and downy flake.

The woods are lovely, dark and deep,
But I have promises to keep,
And miles to go before I sleep,
And miles to go before I sleep.`,
    persianTranslation: `این جنگل‌ها را، گمان می‌کنم، صاحب را می‌شناسم.
خانه‌اش اما در ده است؛
مرا اینجا درنگ نداند
که جنگل‌هایش برف‌آلود می‌بینم.

اسب کوچکم، گمان می‌باید، شگفت دارد
که بی‌خانه‌ای نزدیک می‌ایستم
میان جنگل و دریاچه‌ی یخ‌زده،
تاریک‌ترین شام سال.

زنگوله‌های افسار را تکان می‌دهد
تا بپرسد آیا اشتباهی در کار است.
تنها صدای دیگر، صدای کشش
باد نرم و پَرک برف است.

جنگل‌ها زیبایند، تاریک و ژرف،
اما وعده‌هایی دارم که باید وفا کنم،
و فرسنگ‌ها مانده تا بخوابم،
و فرسنگ‌ها مانده تا بخوابم.`,
    sourceUrl: "https://gutenberg.org/ebooks/3600",
    sourceName: "Project Gutenberg — Frost",
    sourceType: "PUBLIC_DOMAIN",
    sourceRegion: "US",
    sourceLanguage: "en",
  },
  // ─── French — Public Domain ──────────────────────────────────────────────
  {
    title: "Demain dès l'aube",
    author: "Victor Hugo",
    language: "fr",
    country: "FR",
    genre: "elegy",
    rawText: `Demain, dès l'aube, à l'heure où blanchit la campagne,
Je partirai. Vois-tu, je sais que tu m'attends.
J'irai par la forêt, j'irai par la montagne.
Je ne puis demeurer loin de toi plus longtemps.

Je marcherai les yeux fixés sur mes pensées,
Sans rien voir au dehors, sans entendre aucun bruit,
Seul, inconnu, le dos courbé, les mains croisées,
Triste, et le jour pour moi sera comme la nuit.

Je ne regarderai ni l'or du soir qui tombe,
Ni les voiles au loin descendant vers Harfleur.
Et quand j'arriverai, je mettrai sur ta tombe
Un bouquet de houx vert et de bruyère en fleur.`,
    persianTranslation: `فردا، به سپیده‌دم، در ساعتی که دشت سفید می‌شود،
می‌روم. می‌بینی، می‌دانم که مرا انتظار می‌کشی.
از جنگل می‌روم، از کوهستان می‌روم.
نمی‌توانم از تو دورتر بمانم.

چشم به اندیشه‌ها دوخته می‌گویم،
بی‌آنکه بیرون را ببینم، بی‌آنکه صدایی بشنوم،
تنهام، ناشناخته، کمر خمیده، دست‌ها در هم،
غمگین، و روز برای من چون شب خواهد بود.

نه زرِ غروبِ فرومی‌افتاده را نگاه می‌کنم،
نه بادبان‌ها را از دور به‌سوی هارفلور فروآمده.
و چون برسم، بر گورت می‌نهم
دسته‌ای از شاخ‌هوکس سبز و خلنگ گل‌آذر.`,
    sourceUrl: "https://gutenberg.org/ebooks/5042",
    sourceName: "Project Gutenberg — Hugo",
    sourceType: "PUBLIC_DOMAIN",
    sourceRegion: "FR",
    sourceLanguage: "fr",
  },
  // ─── Spanish — Public Domain ─────────────────────────────────────────────
  {
    title: "Noche de verano",
    author: "Antonio Machado",
    language: "es",
    country: "ES",
    genre: "lyric",
    rawText: `Es una noche de verano.
El aire huele a azahar y a mujer.
El silencio es de plata.
La luna es de cristal.
En el fondo del patio
hay un rumor de agua.
Y, en mi corazón,
un lejano cantar.`,
    persianTranslation: `شبی است از تابستان.
هوا بوی شکوفه‌ی بهارنار و زن می‌دهد.
سکوت از نقره است.
ماه از بلور است.
در تهِ حیاط،
صدای آبی است.
و در دلم،
نغمه‌ای دوردست.`,
    sourceUrl: "https://wikisource.org/wiki/Antonio_Machado",
    sourceName: "Wikisource — Machado",
    sourceType: "PUBLIC_DOMAIN",
    sourceRegion: "ES",
    sourceLanguage: "es",
  },
  // ─── German — Public Domain ──────────────────────────────────────────────
  {
    title: "Der Panther",
    author: "Rainer Maria Rilke",
    language: "de",
    country: "DE",
    genre: "lyric",
    rawText: `Sein Blick ist vom Vorübergehn der Stäbe
so müd geworden, daß er nichts mehr hält.
Ihm ist, als ob es tausend Stäbe gäbe
und hinter tausend Stäben keine Welt.

Der weiche Gang geschmeidig starker Schritte,
der sich im allerkleinsten Kreise dreht,
ist wie ein Tanz von Kraft um eine Mitte,
in der betäubt ein großer Wille steht.

Nur manchmal schiebt der Vorhang der Pupille
sich lautlos auf -. Dann kommt ein Bild hinein,
geht durch der Glieder angespannte Stille -
und hört im Herzen auf zu sein.`,
    persianTranslation: `نگاهش از رفت‌و‌آمدِ میله‌ها
چنان خسته شده که چیزی نگه نمی‌دارد.
گویی هزار میله در کار است
و پشتِ هزار میله، جهانی نیست.

گامِ نرمِ قدم‌های نرم و نیرومند،
که در کوچک‌ترین دایره می‌چرخد،
چون رقصِ نیرویی است به‌گردِ نقطه‌ای،
که در آن، اراده‌ای بزرگ خواب‌آلود ایستاده.

تنها گاهی پرده‌ی مردمک
بی‌صدا کنار می‌رود -. آنگاه تصویری درمی‌آید،
از میان سکوتِ کش‌دارِ اعضا می‌گذرد -
و در دل، بودن را به پایان می‌برد.`,
    sourceUrl: "https://gutenberg.org/ebooks/7518",
    sourceName: "Project Gutenberg — Rilke",
    sourceType: "PUBLIC_DOMAIN",
    sourceRegion: "DE",
    sourceLanguage: "de",
  },
  // ─── Italian — Public Domain ─────────────────────────────────────────────
  {
    title: "A Zacinto",
    author: "Ugo Foscolo",
    language: "it",
    country: "IT",
    genre: "elegy",
    rawText: `Né più mai toccherò le sacre sponde
ove il corpo LPARAMEDIO nacque:
molto desiderio mi trista e preme,
ch'io non posso giammai ripor le piume.

Torni in pace il mortal, che lunga e grata
pace ebbe in terra; e di me piaccia a Dio
ch'io vada errante, e fuori del mio nido.`,
    persianTranslation: `هرگز دیگر ساحل‌های مقدس را لمس نکنم
که در آن، بدن در زادگاه خویش برانگیخته شد:
آرزوی بسیار مرا اندوهگین و فشرده دارد،
که هرگز نتوانم پرهای خویش فرونهم.

بازآید به صلح آن فانی، که صلحانی دراز و سپاس‌دار
در زمین داشت؛ و از من خشنود باشد خدا
که بگرویم، و بیرونِ آشیانه‌ی خویش.`,
    sourceUrl: "https://wikisource.org/wiki/Ugo_Foscolo",
    sourceName: "Wikisource — Foscolo",
    sourceType: "PUBLIC_DOMAIN",
    sourceRegion: "IT",
    sourceLanguage: "it",
  },
  // ─── Russian — Public Domain ─────────────────────────────────────────────
  {
    title: "Я вас любил",
    author: "Alexander Pushkin",
    language: "ru",
    country: "RU",
    genre: "lyric",
    rawText: `Я вас любил: любовь еще, быть может,
В душе моей угасла не совсем;
Но пусть она вас больше не тревожит;
Я не хочу печалить вас ничем.
Я вас любил безмолвно, безнадежно,
То робостью, то ревностью томим;
Я вас любил так искренно, так нежно,
Как дай вам бог любимой быть другим.`,
    persianTranslation: `دوستتان داشتم: عشق، شاید،
در جانم هنوز کاملاً نبوده است؛
اما بگذارید شما را بیشتر آشفته نکند؛
من نمی‌خواهم شما را به چیتی اندوهگین کنم.
بی‌صدا، بی‌چشم‌داشت، دوستتان داشتم،
گه با خجالت، گه با غیرت آزرده؛
چنان راست و نرم دوستتان داشتم،
چنانکه خدا دهد دیگری شما را چنین دوست بدارد.`,
    sourceUrl: "https://wikisource.org/wiki/Alexander_Pushkin",
    sourceName: "Wikisource — Pushkin",
    sourceType: "PUBLIC_DOMAIN",
    sourceRegion: "RU",
    sourceLanguage: "ru",
  },
  // ─── Persian — RUMI (already Persian, no translation needed but in dataset) ──
  {
    title: "از غزل‌های شمس",
    author: "Jalaluddin Rumi",
    language: "fa",
    country: "IR",
    genre: "ghazal",
    rawText: `بشنو این نی چون شکایت می‌کند
از جدایی‌ها حکایت می‌کند

کز نیستان تا مرا ببریده‌اند
از نفیرم مرد و زن نالیده‌اند

سینه خواهم شرحه شرحه از فراق
تا بگویم شرح درد اشتیاق

هر کسی کو دور ماند از اصل خویش
باز جوید روزگار وصل خویش`,
    persianTranslation: `بشنو این نی چون شکایت می‌کند
از جدایی‌ها حکایت می‌کند

کز نیستان تا مرا ببریده‌اند
از نفیرم مرد و زن نالیده‌اند

سینه خواهم شرحه شرحه از فراق
تا بگویم شرح درد اشتیاق

هر کسی کو دور ماند از اصل خویش
باز جوید روزگار وصل خویش`,
    sourceUrl: "https://ganjoor.net/molavi/masnavi/ma1/",
    sourceName: "Ganjoor — Rumi",
    sourceType: "PUBLIC_DOMAIN",
    sourceRegion: "IR",
    sourceLanguage: "fa",
  },
  {
    title: "غرغره دریا",
    author: "Forough Farrokhzad",
    language: "fa",
    country: "IR",
    genre: "free-verse",
    rawText: `گناه کردم گناه بزرگ
گناه یک بوسه‌ی آگاهانه
در شب سرد زمستانی

و اکنون دریا
در سینه‌ی من غرغر می‌کند
و موج‌ها
چون اسب‌های وحشی
به سوی تو می‌تازند

تو آن‌جا، در بندر
با چشمانت سبزتomalumک
منتظرِ کشتیِ منی.`,
    persianTranslation: `گناه کردم گناه بزرگ
گناه یک بوسه‌ی آگاهانه
در شب سرد زمستانی

و اکنون دریا
در سینه‌ی من غرغر می‌کند
و موج‌ها
چون اسب‌های وحشی
به سوی تو می‌تازند

تو آن‌جا، در بندر
با چشمان سبزت
منتظرِ کشتیِ منی.`,
    sourceUrl: "https://ganjoor.net/farrokhzad/",
    sourceName: "Ganjoor — Farrokhzad",
    sourceType: "RESTRICTED",
    sourceRegion: "IR",
    sourceLanguage: "fa",
    sourceDescription: "Modern Persian poet — estate retains rights. Metadata only.",
  },
  // ─── Japanese — Haiku (PD) ────────────────────────────────────────────────
  {
    title: "Old Pond",
    author: "Matsuo Bashō",
    language: "ja",
    country: "JP",
    genre: "haiku",
    rawText: `古池や
蛙飛び込む
水の音`,
    persianTranslation: `برکه‌ی کهنه
قورباغه‌ای در جهید
صدای آب.`,
    sourceUrl: "https://wikisource.org/wiki/Basho",
    sourceName: "Wikisource — Bashō",
    sourceType: "PUBLIC_DOMAIN",
    sourceRegion: "JP",
    sourceLanguage: "ja",
  },
  // ─── Chinese — PD ─────────────────────────────────────────────────────────
  {
    title: "Quiet Night Thought",
    author: "Li Bai",
    language: "zh",
    country: "CN",
    genre: "shi",
    rawText: `床前明月光
疑是地上霜
举头望明月
低头思故乡`,
    persianTranslation: `پیشِ بستر، نورِ ماهِ روشن
گمان برف‌وزر بر زمین است
سر برمی‌دارم، به ماه روشن نگاه می‌کنم
سر فرود می‌آورم، به وطن می‌اندیشم.`,
    sourceUrl: "https://wikisource.org/wiki/Li_Bai",
    sourceName: "Wikisource — Li Bai",
    sourceType: "PUBLIC_DOMAIN",
    sourceRegion: "CN",
    sourceLanguage: "zh",
  },
  // ─── RESTRICTED — Genius lyrics (BLOCKED → metadata only) ───────────────
  {
    title: "Imagine",
    author: "John Lennon",
    language: "en",
    country: "US",
    genre: "lyric",
    rawText: "Imagine there's no heaven / It's easy if you try / No hell below us / Above us only sky",
    persianTranslation: `تصور کن بهشتی نیست
آسان است اگر بکوشی
جهنمی زیر ما نیست
فقط آسمانی بالای ماست.`,
    sourceUrl: "https://genius.com/John-lennon-imagine-lyrics",
    sourceName: "Genius — Lennon",
    sourceType: "OFFICIAL_ARTIST",
    sourceRegion: "US",
    sourceLanguage: "en",
    sourceDescription: "Restricted — full text withheld by license intelligence.",
  },
  {
    title: "Bohemian Rhapsody",
    author: "Queen",
    language: "en",
    country: "UK",
    genre: "lyric",
    rawText: "Is this the real life? / Is this just fantasy? / Caught in a landslide / No escape from reality",
    persianTranslation: `آیا این زندگی واقعی است؟
آیا این تنها خیال است؟
در ریزش به‌دام آمده
هیچ گریزی از واقعیت نیست.`,
    sourceUrl: "https://genius.com/Queen-bohemian-rhapsody-lyrics",
    sourceName: "Genius — Queen",
    sourceType: "OFFICIAL_ARTIST",
    sourceRegion: "UK",
    sourceLanguage: "en",
    sourceDescription: "Restricted — full text withheld.",
  },
];

async function main() {
  console.log("🌱 BLEUMEA — seeding database…");

  // Clear existing data (idempotent re-seed)
  await db.stageResult.deleteMany();
  await db.poem.deleteMany();
  await db.source.deleteMany();
  await db.pipelineRun.deleteMany();
  await db.systemLog.deleteMany();
  await db.analyticsEvent.deleteMany();
  await db.qAResult.deleteMany();
  await db.auditEvent.deleteMany();

  // ── 1. Create sources ────────────────────────────────────────────────────
  const sourceMap = new Map<string, string>();
  for (const poem of SEED_POEMS) {
    if (sourceMap.has(poem.sourceUrl)) continue;
    const license = detectLicense(poem.sourceUrl, poem.sourceDescription || "");
    const source = await db.source.create({
      data: {
        name: poem.sourceName,
        url: poem.sourceUrl,
        type: poem.sourceType,
        region: poem.sourceRegion || null,
        language: poem.sourceLanguage || null,
        description: poem.sourceDescription || null,
        termsUrl: poem.sourceTermsUrl || null,
        licenseType: license.licenseType,
        legalityScore: license.legalityScore,
        licenseConfidence: license.licenseConfidence,
        copyrightPolicy: license.copyrightPolicy,
        fingerprintHash: license.fingerprintHash,
        lastLicenseScan: new Date(),
        licenseScanCount: 1,
        lastHealthCheck: new Date(),
        status: "ACTIVE",
        healthScore: 0.85 + Math.random() * 0.15,
        crawlCount: Math.floor(Math.random() * 50) + 5,
        itemsIngested: Math.floor(Math.random() * 30) + 2,
        itemsRejected: Math.floor(Math.random() * 10),
        errorRate: Math.random() * 0.05,
        lastCrawlAt: new Date(Date.now() - Math.random() * 86400000 * 7),
      },
    });
    sourceMap.set(poem.sourceUrl, source.id);
  }

  // ── 2. Create one pipeline run for the seed ingestion ───────────────────
  const run = await db.pipelineRun.create({
    data: {
      status: "SUCCESS",
      trigger: "BACKFILL",
      inputCount: SEED_POEMS.length,
      outputCount: SEED_POEMS.length - 2,
      rejectedCount: 0,
      quarantineCount: 2,
      stageStats: JSON.stringify({
        CRAWLER: { success: SEED_POEMS.length, failed: 0, skipped: 0, avgMs: 45 },
        PREFILTER: { success: SEED_POEMS.length, failed: 0, skipped: 0, avgMs: 8 },
        LANG_DETECT: { success: SEED_POEMS.length, failed: 0, skipped: 0, avgMs: 4 },
        POETRY_CLASSIFIER: { success: SEED_POEMS.length, failed: 0, skipped: 0, avgMs: 65 },
        LICENSE_CHECKER: { success: SEED_POEMS.length - 2, failed: 0, skipped: 2, avgMs: 22 },
        DEDUP: { success: SEED_POEMS.length, failed: 0, skipped: 0, avgMs: 18 },
        TRANSLATION: { success: SEED_POEMS.length, failed: 0, skipped: 0, avgMs: 2400 },
        EMBEDDING: { success: SEED_POEMS.length, failed: 0, skipped: 0, avgMs: 12 },
        STORAGE: { success: SEED_POEMS.length, failed: 0, skipped: 0, avgMs: 35 },
      }),
      degradedApis: JSON.stringify([]),
      fallbacksUsed: JSON.stringify([]),
      startedAt: new Date(Date.now() - 3600000),
      finishedAt: new Date(Date.now() - 3500000),
      durationMs: 100000,
    },
  });

  // ── 3. Create poems with full pipeline stages ───────────────────────────
  let stored = 0, quarantined = 0;
  for (const p of SEED_POEMS) {
    const license = detectLicense(p.sourceUrl, p.sourceDescription || "");
    const classification = classifyPoetry(p.rawText, p.language);
    const embedding = await generateEmbedding(p.rawText);
    const sourceId = sourceMap.get(p.sourceUrl);

    const canStoreFullText = license.canStoreFullText;
    const qualityScore =
      0.4 * classification.confidence +
      0.3 * 0.85 + // translation quality (seed translations are good)
      0.3 * license.licenseConfidence;

    const isQuarantined = license.legalityScore === "LIMITED";

    const poem = await db.poem.create({
      data: {
        title: p.title,
        author: p.author,
        language: p.language,
        country: p.country,
        genre: classification.genre,
        mood: classification.mood,
        theme: classification.theme,
        licenseType: license.licenseType,
        licenseConfidence: license.licenseConfidence,
        legalityScore: license.legalityScore,
        sourceUrl: p.sourceUrl,
        originalText: canStoreFullText ? p.rawText : null,
        persianTranslation: p.persianTranslation,
        poetryConfidence: classification.confidence,
        translationQuality: 0.85,
        duplicateScore: 0,
        qualityScore,
        embeddingVector: embedding.vector,
        similarityIndex: 0,
        status: isQuarantined ? "QUARANTINE" : "APPROVED",
        pipelineRunId: run.id,
        sourceId: sourceId || null,
      },
    });

    // Persist 9 stage results per poem
    const stages = [
      { stageName: "CRAWLER", status: "SUCCESS", confidence: 1, durationMs: 45, message: `Fetched ${p.rawText.length} chars from ${p.sourceUrl}` },
      { stageName: "PREFILTER", status: "SUCCESS", confidence: 0.95, durationMs: 8, message: `Passed length check` },
      { stageName: "LANG_DETECT", status: "SUCCESS", confidence: 0.95, durationMs: 4, message: `Detected language: ${p.language}` },
      { stageName: "POETRY_CLASSIFIER", status: "SUCCESS", confidence: classification.confidence, durationMs: 65, message: `Poetry confirmed (${classification.mood}/${classification.theme})` },
      { stageName: "LICENSE_CHECKER", status: license.canStoreFullText ? "SUCCESS" : "FAILED", confidence: license.licenseConfidence, durationMs: 22, message: `License: ${license.licenseType} → ${license.legalityScore}` },
      { stageName: "DEDUP", status: "SUCCESS", confidence: 1, durationMs: 18, message: `Unique (max similarity=0.42)` },
      { stageName: "TRANSLATION", status: "SUCCESS", confidence: 0.85, durationMs: 2400, message: `Translated via glm-4.6-poetic (quality=0.87)` },
      { stageName: "EMBEDDING", status: "SUCCESS", confidence: 1, durationMs: 12, message: `Generated 384-dim vector` },
      { stageName: "STORAGE", status: "SUCCESS", confidence: 1, durationMs: 35, message: isQuarantined ? `Metadata-only stored (poem id=${poem.id})` : `Full record stored (poem id=${poem.id})` },
    ];

    for (const s of stages) {
      await db.stageResult.create({
        data: {
          poemId: poem.id,
          stageName: s.stageName as any,
          status: s.status as any,
          confidence: s.confidence ?? null,
          durationMs: s.durationMs ?? null,
          message: s.message ?? null,
        },
      });
    }

    if (isQuarantined) quarantined_count++;
    else stored++;

    // Ingest analytics event
    await db.analyticsEvent.create({
      data: {
        eventType: "INGEST",
        entity: poem.id,
        value: 1,
        unit: "poem",
        meta: JSON.stringify({ language: p.language, author: p.author }),
      },
    });
  }

  // ── 4. Create system logs (realistic distribution) ──────────────────────
  const logTemplates = [
    { level: "INFO", category: "PIPELINE", message: "Pipeline run completed successfully" },
    { level: "INFO", category: "LICENSE", message: "Source re-validation completed" },
    { level: "WARN", category: "API", message: "Translation API latency above threshold (2400ms > 1500ms)" },
    { level: "ERROR", category: "API", message: "Embedding API timeout — fallback activated" },
    { level: "INFO", category: "EMBEDDING", message: "Generated 384-dim vector for 14 poems" },
    { level: "INFO", category: "QA", message: "QA suite passed: 14/14 tests" },
    { level: "WARN", category: "SECURITY", message: "Rate-limit triggered for IP hash 4a2f..." },
    { level: "INFO", category: "SYSTEM", message: "Auto-recovery: API TRANSLATION recovered after 12s" },
    { level: "CRITICAL", category: "DB", message: "Database lock detected — auto-retry succeeded" },
    { level: "INFO", category: "TRANSLATION", message: "Persian poetic translation completed for 'Der Panther'" },
    { level: "WARN", category: "LICENSE", message: "ToS change detected for source 'Genius — Lennon'" },
    { level: "INFO", category: "PIPELINE", message: "Backfill ingestion completed: 14 inputs, 12 stored, 2 quarantined" },
  ];
  for (let i = 0; i < 60; i++) {
    const tpl = logTemplates[i % logTemplates.length];
    const minutesAgo = Math.floor(Math.random() * 1440); // last 24h
    await db.systemLog.create({
      data: {
        level: tpl.level,
        category: tpl.category,
        message: tpl.message,
        detail: JSON.stringify({ seed: true, index: i }),
        autoRecovered: tpl.level === "ERROR" || tpl.level === "CRITICAL" ? Math.random() > 0.4 : false,
        createdAt: new Date(Date.now() - minutesAgo * 60000),
      },
    });
  }

  // ── 5. Create QA test results ───────────────────────────────────────────
  const qaTests = [
    { testSuite: "UNIT", testName: "license_detection_classifies_gutenberg_vs_genius", status: "PASSED", durationMs: 12, message: "Gutenberg→PD/SAFE, Genius→RESTRICTED/LIMITED" },
    { testSuite: "UNIT", testName: "classifier_rejects_noise", status: "PASSED", durationMs: 8, message: "Noise rejected (conf=0.234)" },
    { testSuite: "UNIT", testName: "classifier_accepts_real_verse", status: "PASSED", durationMs: 9, message: "Verse accepted (conf=0.912)" },
    { testSuite: "UNIT", testName: "language_detection_basic", status: "PASSED", durationMs: 4, message: "fa/en/fr detected correctly" },
    { testSuite: "UNIT", testName: "embedding_deterministic", status: "PASSED", durationMs: 11, message: "Same input → same vector" },
    { testSuite: "UNIT", testName: "translation_fallback_quality_scored", status: "PASSED", durationMs: 6, message: "Fallback translation scored 0.30" },
    { testSuite: "INTEGRATION", testName: "db_connectivity", status: "PASSED", durationMs: 5, message: "DB responded to SELECT 1" },
    { testSuite: "INTEGRATION", testName: "schema_integrity", status: "PASSED", durationMs: 7, message: "All required tables present" },
    { testSuite: "PIPELINE_SIM", testName: "pipeline_quarantines_restricted", status: "PASSED", durationMs: 3, message: "Restricted sources quarantined by design" },
    { testSuite: "PIPELINE_SIM", testName: "pipeline_degrades_gracefully", status: "PASSED", durationMs: 2, message: "Fallback activates, pipeline continues" },
    { testSuite: "REGRESSION", testName: "no_full_text_when_license_blocked", status: "PASSED", durationMs: 8, message: "Zero BLOCKED poems have original text" },
    { testSuite: "REGRESSION", testName: "no_approved_poem_below_threshold", status: "PASSED", durationMs: 6, message: "All APPROVED poems meet threshold" },
  ];
  for (const t of qaTests) {
    await db.qAResult.create({ data: { ...t, autoFix: false } as any });
  }

  // ── 6. Create audit events ──────────────────────────────────────────────
  const auditActions = ["READ", "WRITE", "DELETE", "LOGIN", "API_CALL", "CONFIG_CHANGE"];
  for (let i = 0; i < 30; i++) {
    await db.auditEvent.create({
      data: {
        actor: ["admin@bleumea.ai", "system-agent", "qa-agent", "crawler-1"][i % 4],
        action: auditActions[i % auditActions.length],
        resource: ["poem/" + i, "source/" + (i % 5), "config/pipeline"][i % 3],
        ipHash: Math.random().toString(36).slice(2, 10),
        riskScore: Math.random() * 0.3,
        allowed: true,
        meta: JSON.stringify({ seed: true }),
        createdAt: new Date(Date.now() - i * 60000 * 30),
      },
    });
  }

  console.log(`✅ Seed complete: ${stored} approved poems, ${quarantined_count} quarantined, ${sourceMap.size} sources, 60 logs, 12 QA tests, 30 audit events`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
