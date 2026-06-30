import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// تنظیمات پیش‌فرض — GLM به‌عنوان پیش‌فرض
const DEFAULTS = {
  LLM_API_KEY: "",
  LLM_BASE_URL: "https://open.bigmodel.cn/api/paas/v4",
  LLM_MODEL: "glm-4.6",
  LLM_PROVIDER: "glm",
};

// GET /api/bleumea/settings — خواندن تنظیمات
// توجه: کلید API به‌صورت ماسک‌شده برمی‌گردد برای امنیت
export async function GET() {
  const settings = await db.setting.findMany();
  const map: Record<string, string> = {};
  for (const s of settings) {
    map[s.id] = s.value;
  }

  // ترکیب با پیش‌فرض‌ها
  const result: Record<string, string> = {};
  for (const key of Object.keys(DEFAULTS)) {
    result[key] = map[key] ?? (DEFAULTS as any)[key];
  }

  // ماسک‌کردن کلید API برای امنیت — فقط نشان بده آیا ست شده یا نه
  const apiKeySet = !!result.LLM_API_KEY && result.LLM_API_KEY.length > 0;
  const maskedKey = apiKeySet
    ? result.LLM_API_KEY.slice(0, 6) + "••••••••••••••••" + result.LLM_API_KEY.slice(-4)
    : "";

  return NextResponse.json({
    settings: {
      LLM_PROVIDER: result.LLM_PROVIDER,
      LLM_BASE_URL: result.LLM_BASE_URL,
      LLM_MODEL: result.LLM_MODEL,
      LLM_API_KEY_MASKED: maskedKey,
      LLM_API_KEY_SET: apiKeySet,
    },
    providers: {
      glm: {
        label: "GLM (智谱)",
        baseURL: "https://open.bigmodel.cn/api/paas/v4",
        models: ["glm-4.6", "glm-4-plus", "glm-4-flash", "glm-4"],
        signupUrl: "https://open.bigmodel.cn/usercenter/apikeys",
        free: false,
      },
      groq: {
        label: "Groq (رایگان و سریع)",
        baseURL: "https://api.groq.com/openai/v1",
        models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
        signupUrl: "https://console.groq.com/keys",
        free: true,
      },
      openai: {
        label: "OpenAI",
        baseURL: "https://api.openai.com/v1",
        models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
        signupUrl: "https://platform.openai.com/api-keys",
        free: false,
      },
      openrouter: {
        label: "OpenRouter (چندین مدل)",
        baseURL: "https://openrouter.ai/api/v1",
        models: ["anthropic/claude-3.5-sonnet", "openai/gpt-4o", "google/gemini-flash-1.5", "meta-llama/llama-3.1-70b-instruct"],
        signupUrl: "https://openrouter.ai/keys",
        free: false,
      },
      together: {
        label: "Together AI",
        baseURL: "https://api.together.xyz/v1",
        models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo"],
        signupUrl: "https://api.together.xyz/settings/api-keys",
        free: false,
      },
      ollama: {
        label: "Ollama (محلی — رایگان)",
        baseURL: "http://localhost:11434/v1",
        models: ["llama3.1:8b", "llama3.1:70b", "qwen2.5:7b", "mistral:7b"],
        signupUrl: "https://ollama.com/download",
        free: true,
      },
    },
  });
}

// POST /api/bleumea/settings — ذخیره تنظیمات
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { LLM_API_KEY, LLM_BASE_URL, LLM_MODEL, LLM_PROVIDER } = body;

  // اعتبارسنجی ساده
  if (LLM_PROVIDER && !["glm", "groq", "openai", "openrouter", "together", "ollama"].includes(LLM_PROVIDER)) {
    return NextResponse.json({ error: "Provider نامعتبر" }, { status: 400 });
  }

  const updates: Array<{ id: string; value: string }> = [];

  // فقط کلید API رو ذخیره کن اگه ارسال شده باشه (و خالی نباشد — خالی یعنی حذف نکن)
  if (LLM_API_KEY !== undefined && LLM_API_KEY !== null) {
    // اگه رشته ماسک‌شده بود (دارای •••)، کلید قبلی رو نگه دار
    if (LLM_API_KEY.includes("••••")) {
      // نگه‌داشتن کلید قبلی — چیزی ذخیره نکن
    } else if (LLM_API_KEY === "") {
      // پاک کردن کلید
      updates.push({ id: "LLM_API_KEY", value: "" });
    } else {
      updates.push({ id: "LLM_API_KEY", value: LLM_API_KEY });
    }
  }

  if (LLM_BASE_URL) updates.push({ id: "LLM_BASE_URL", value: LLM_BASE_URL });
  if (LLM_MODEL) updates.push({ id: "LLM_MODEL", value: LLM_MODEL });
  if (LLM_PROVIDER) updates.push({ id: "LLM_PROVIDER", value: LLM_PROVIDER });

  // upsert هر تنظیم
  for (const u of updates) {
    await db.setting.upsert({
      where: { id: u.id },
      update: { value: u.value },
      create: { id: u.id, value: u.value },
    });
  }

  return NextResponse.json({
    success: true,
    updated: updates.length,
    message: updates.length > 0 ? "تنظیمات ذخیره شد" : "هیچ تغییری اعمال نشد",
  });
}

// تابع کمکی برای استفادهٔ داخلی — خواندن تنظیمات واقعی (بدون ماسک)
export async function getSettings() {
  const settings = await db.setting.findMany();
  const map: Record<string, string> = {};
  for (const s of settings) {
    map[s.id] = s.value;
  }
  return {
    LLM_API_KEY: map.LLM_API_KEY ?? DEFAULTS.LLM_API_KEY,
    LLM_BASE_URL: map.LLM_BASE_URL ?? DEFAULTS.LLM_BASE_URL,
    LLM_MODEL: map.LLM_MODEL ?? DEFAULTS.LLM_MODEL,
    LLM_PROVIDER: map.LLM_PROVIDER ?? DEFAULTS.LLM_PROVIDER,
  };
}
