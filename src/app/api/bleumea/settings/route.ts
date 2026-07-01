import { NextRequest, NextResponse } from "next/server";

// GET — تنظیمات پیش‌فرض (بدون دیتابیس)
export async function GET() {
  return NextResponse.json({
    settings: {
      LLM_PROVIDER: "glm",
      LLM_BASE_URL: "https://open.bigmodel.cn/api/paas/v4",
      LLM_MODEL: "glm-4.6",
      LLM_API_KEY_MASKED: "",
      LLM_API_KEY_SET: false,
    },
    providers: {
      glm: {
        label: "GLM (智谱) — پیش‌فرض",
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
        label: "OpenRouter",
        baseURL: "https://openrouter.ai/api/v1",
        models: ["anthropic/claude-3.5-sonnet", "openai/gpt-4o", "google/gemini-flash-1.5"],
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

// POST — فقط برای سازگاری
export async function POST(req: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "تنظیمات در مرورگر ذخیره می‌شوند",
  });
}
