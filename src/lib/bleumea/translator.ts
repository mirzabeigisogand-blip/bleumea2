// BLEUMEA — Persian Poetic Translation Engine
// مستقل — با هر API سازگار با OpenAI

export interface TranslationResult {
  persianTranslation: string;
  quality: number;
  model: string;
  fallbackUsed: boolean;
  durationMs: number;
}

const POETIC_TRANSLATION_SYSTEM_PROMPT = `You are a master Persian poet and translator, fluent in classical Persian verse (Rumi, Hafez, Saadi, Khayyam) and modern Persian poetry (Nima Yooshij, Forough Farrokhzad, Ahmad Shamlu).

Your task: translate the given poem into Persian.

ABSOLUTE RULES:
1. NEVER translate literally. Literal translation is FORBIDDEN.
2. Preserve the emotional tone — sorrow stays sorrow, joy stays joy.
3. Preserve the poetic rhythm — match meter where possible, or compose in free-verse meter if the source is free verse.
4. Preserve every metaphor and image — if a metaphor cannot transfer, find an equivalent Persian poetic image.
5. The output MUST read like an original Persian poem, not a translation.
6. Use elevated Persian poetic diction (subtle use of words like سکوت، شب، مهتاب، سایه، رود، آه، نگار، صنم).
7. If the source is short (haiku, couplet), keep the Persian short — match the form.
8. Output ONLY the Persian poem, no commentary, no transliteration, no original text.

Output format: just the Persian poem across as many lines as needed. Use newlines between verses.`;

const DEFAULTS = {
  LLM_API_KEY: "",
  LLM_BASE_URL: "https://open.bigmodel.cn/api/paas/v4",
  LLM_MODEL: "glm-4.6",
  LLM_PROVIDER: "glm",
};

export interface TranslateOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
}

export async function translatePoetically(
  text: string,
  sourceLanguage: string,
  title?: string,
  author?: string,
  options?: TranslateOptions
): Promise<TranslationResult> {
  const startedAt = Date.now();
  try {
    const apiKey = options?.apiKey || process.env.LLM_API_KEY || DEFAULTS.LLM_API_KEY;
    const baseURL = options?.baseURL || process.env.LLM_BASE_URL || DEFAULTS.LLM_BASE_URL;
    const model = options?.model || process.env.LLM_MODEL || DEFAULTS.LLM_MODEL;

    if (!apiKey) {
      return fallbackTranslation(text, sourceLanguage, Date.now() - startedAt, "کلید API تنظیم نشده — به تب «تنظیمات» بروید");
    }

    const userPrompt = `Source language: ${sourceLanguage}
 ${title ? `Title: ${title}` : ""}
 ${author ? `Author: ${author}` : ""}

Poem to translate:
"""
 ${text}
"""

Translate this into Persian following the rules in the system prompt. Output ONLY the Persian poem.`;

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: POETIC_TRANSLATION_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.85,
        max_tokens: 800,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      let friendlyError = `API ${response.status}`;
      if (response.status === 401) friendlyError = "کلید API نامعتبر";
      else if (response.status === 429) friendlyError = "محدودیت نرخ — بعداً تلاش کنید";
      else if (response.status === 404) friendlyError = "مدل یا آدرس اشتباه";
      return fallbackTranslation(text, sourceLanguage, Date.now() - startedAt, `${friendlyError}: ${errText.slice(0, 100)}`);
    }

    const data = await response.json();
    const persianTranslation = (data.choices?.[0]?.message?.content || "").trim();
    const quality = scoreTranslationQuality(text, persianTranslation);
    const durationMs = Date.now() - startedAt;

    if (!persianTranslation) {
      return fallbackTranslation(text, sourceLanguage, durationMs, "پاسخ خالی از LLM");
    }

    return {
      persianTranslation,
      quality,
      model,
      fallbackUsed: false,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const reason = err instanceof Error ? err.message : String(err);
    let friendlyError = reason;
    if (reason.includes("fetch failed") || reason.includes("ENOTFOUND")) {
      friendlyError = "اتصال برقرار نشد — اینترنت یا آدرس API";
    } else if (reason.includes("timeout") || reason.includes("aborted")) {
      friendlyError = "تایم‌اوت — پاسخ بیش از حد طول کشید";
    }
    return fallbackTranslation(text, sourceLanguage, durationMs, friendlyError);
  }
}

function scoreTranslationQuality(original: string, persian: string): number {
  if (!persian) return 0;
  const origWords = original.split(/\s+/).filter((w) => w.length > 0).length;
  const persianWords = persian.split(/\s+/).filter((w) => w.length > 0).length;
  const ratio = persianWords / Math.max(origWords, 1);
  let score = 0.5;
  if (ratio >= 0.6 && ratio <= 1.5) score += 0.3;
  const persianCharRatio = (persian.match(/[\u0600-\u06FF]/g) || []).length / Math.max(persian.length, 1);
  if (persianCharRatio > 0.4) score += 0.15;
  const lines = persian.split(/\n+/).filter((l) => l.trim().length > 0);
  if (lines.length >= 2) score += 0.05;
  return Math.min(1, score);
}

function fallbackTranslation(
  text: string,
  sourceLanguage: string,
  durationMs: number,
  reason: string
): TranslationResult {
  const lines = text.split(/\n+/).filter((l) => l.trim().length > 0);
  const placeholder = lines
    .map((l) => `» ${l.trim()} «`)
    .join("\n");
  return {
    persianTranslation: `[ترجمهٔ پشتیبان — سرویس ترجمه در دسترس نیست: ${reason}]\nبرای فعال‌سازی، به تب «تنظیمات» بروید و کلید API را وارد کنید.\n\n${placeholder}`,
    quality: 0.3,
    model: "fallback-heuristic-v1",
    fallbackUsed: true,
    durationMs,
  };
}
// خواندن تنظیمات از دیتابیس (با cache در حافظه برای جلوگیری از query مکرر)
let cachedSettings: { value: string; ts: number } | null = null;
const CACHE_TTL = 5000; // 5 ثانیه

async function getSettings() {
  // اگر کش هنوز معتبر است
  if (cachedSettings && Date.now() - cachedSettings.ts < CACHE_TTL) {
    try {
      const settings = await db.setting.findMany();
      const map: Record<string, string> = {};
      for (const s of settings) map[s.id] = s.value;
      return {
        LLM_API_KEY: map.LLM_API_KEY ?? DEFAULTS.LLM_API_KEY,
        LLM_BASE_URL: map.LLM_BASE_URL ?? DEFAULTS.LLM_BASE_URL,
        LLM_MODEL: map.LLM_MODEL ?? DEFAULTS.LLM_MODEL,
        LLM_PROVIDER: map.LLM_PROVIDER ?? DEFAULTS.LLM_PROVIDER,
      };
    } catch {
      return DEFAULTS;
    }
  }

  try {
    const settings = await db.setting.findMany();
    cachedSettings = { value: "", ts: Date.now() };
    const map: Record<string, string> = {};
    for (const s of settings) map[s.id] = s.value;
    return {
      LLM_API_KEY: map.LLM_API_KEY ?? DEFAULTS.LLM_API_KEY,
      LLM_BASE_URL: map.LLM_BASE_URL ?? DEFAULTS.LLM_BASE_URL,
      LLM_MODEL: map.LLM_MODEL ?? DEFAULTS.LLM_MODEL,
      LLM_PROVIDER: map.LLM_PROVIDER ?? DEFAULTS.LLM_PROVIDER,
    };
  } catch {
    // اگه دیتابیس در دسترس نبود، از .env استفاده کن
    return {
      LLM_API_KEY: process.env.LLM_API_KEY ?? "",
      LLM_BASE_URL: process.env.LLM_BASE_URL ?? DEFAULTS.LLM_BASE_URL,
      LLM_MODEL: process.env.LLM_MODEL ?? DEFAULTS.LLM_MODEL,
      LLM_PROVIDER: process.env.LLM_PROVIDER ?? DEFAULTS.LLM_PROVIDER,
    };
  }
}

export async function translatePoetically(
  text: string,
  sourceLanguage: string,
  title?: string,
  author?: string
): Promise<TranslationResult> {
  const startedAt = Date.now();
  try {
    const settings = await getSettings();
    const { LLM_API_KEY: apiKey, LLM_BASE_URL: baseURL, LLM_MODEL: model } = settings;

    if (!apiKey) {
      return fallbackTranslation(text, sourceLanguage, Date.now() - startedAt, "کلید API تنظیم نشده — به تب «تنظیمات» بروید");
    }

    const userPrompt = `Source language: ${sourceLanguage}
${title ? `Title: ${title}` : ""}
${author ? `Author: ${author}` : ""}

Poem to translate:
"""
${text}
"""

Translate this into Persian following the rules in the system prompt. Output ONLY the Persian poem.`;

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: POETIC_TRANSLATION_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.85,
        max_tokens: 800,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      let friendlyError = `API ${response.status}`;
      if (response.status === 401) friendlyError = "کلید API نامعتبر";
      else if (response.status === 429) friendlyError = "محدودیت نرخ — بعداً تلاش کنید";
      else if (response.status === 404) friendlyError = "مدل یا آدرس اشتباه";
      return fallbackTranslation(text, sourceLanguage, Date.now() - startedAt, `${friendlyError}: ${errText.slice(0, 100)}`);
    }

    const data = await response.json();
    const persianTranslation = (data.choices?.[0]?.message?.content || "").trim();
    const quality = scoreTranslationQuality(text, persianTranslation);
    const durationMs = Date.now() - startedAt;

    if (!persianTranslation) {
      return fallbackTranslation(text, sourceLanguage, durationMs, "پاسخ خالی از LLM");
    }

    return {
      persianTranslation,
      quality,
      model,
      fallbackUsed: false,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const reason = err instanceof Error ? err.message : String(err);
    let friendlyError = reason;
    if (reason.includes("fetch failed") || reason.includes("ENOTFOUND")) {
      friendlyError = "اتصال برقرار نشد — اینترنت یا آدرس API";
    } else if (reason.includes("timeout") || reason.includes("aborted")) {
      friendlyError = "تایم‌اوت — پاسخ بیش از حد طول کشید";
    }
    return fallbackTranslation(text, sourceLanguage, durationMs, friendlyError);
  }
}

// ارزیابی کیفیت ترجمه
function scoreTranslationQuality(original: string, persian: string): number {
  if (!persian) return 0;
  const origWords = original.split(/\s+/).filter((w) => w.length > 0).length;
  const persianWords = persian.split(/\s+/).filter((w) => w.length > 0).length;
  const ratio = persianWords / Math.max(origWords, 1);
  let score = 0.5;
  if (ratio >= 0.6 && ratio <= 1.5) score += 0.3;
  const persianCharRatio = (persian.match(/[\u0600-\u06FF]/g) || []).length / Math.max(persian.length, 1);
  if (persianCharRatio > 0.4) score += 0.15;
  const lines = persian.split(/\n+/).filter((l) => l.trim().length > 0);
  if (lines.length >= 2) score += 0.05;
  return Math.min(1, score);
}

// ترجمهٔ پشتیبان وقتی API در دسترس نیست
function fallbackTranslation(
  text: string,
  sourceLanguage: string,
  durationMs: number,
  reason: string
): TranslationResult {
  const lines = text.split(/\n+/).filter((l) => l.trim().length > 0);
  const placeholder = lines
    .map((l) => `» ${l.trim()} «`)
    .join("\n");
  return {
    persianTranslation: `[ترجمهٔ پشتیبان — سرویس ترجمه در دسترس نیست: ${reason}]\nبرای فعال‌سازی، به تب «تنظیمات» بروید و کلید API را وارد کنید.\n\n${placeholder}`,
    quality: 0.3,
    model: "fallback-heuristic-v1",
    fallbackUsed: true,
    durationMs,
  };
}
