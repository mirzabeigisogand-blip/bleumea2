import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "../settings/route";

// POST /api/bleumea/test-api — تست اتصال به API با یه پیام ساده
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    // اگه تنظیمات تستی ارسال شده باشه، از اونا استفاده کن؛ وگرنه از تنظیمات ذخیره‌شده
    const saved = await getSettings();

    const apiKey = body.LLM_API_KEY && !body.LLM_API_KEY.includes("••••")
      ? body.LLM_API_KEY
      : saved.LLM_API_KEY;
    const baseURL = body.LLM_BASE_URL || saved.LLM_BASE_URL;
    const model = body.LLM_MODEL || saved.LLM_MODEL;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "کلید API تنظیم نشده. ابتدا یک کلید API وارد کنید.",
      }, { status: 400 });
    }

    const startedAt = Date.now();
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are a helpful assistant. Reply in one short sentence." },
          { role: "user", content: "Hello, please confirm you are working." },
        ],
        max_tokens: 50,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      let errorMessage = `HTTP ${response.status}`;
      if (response.status === 401) errorMessage = "کلید API نامعتبر است (۴۰۱)";
      else if (response.status === 403) errorMessage = "دسترسی ممنوع (۴۰۳) — شما اجازه دسترسی ندارید";
      else if (response.status === 404) errorMessage = "آدرس یا مدل اشتباه است (۴۰۴)";
      else if (response.status === 429) errorMessage = "محدودیت نرخ (۴۲۹) — بعداً دوباره امتحان کنید";
      else if (response.status >= 500) errorMessage = `خطای سرور (${response.status})`;
      return NextResponse.json({
        success: false,
        error: errorMessage,
        detail: errText.slice(0, 300),
        durationMs,
      }, { status: 200 }); // 200 برمی‌گردونیم تا فرانت‌اند بتونه خطا رو نمایش بده
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({
      success: true,
      message: "اتصال موفق بود!",
      reply: reply.slice(0, 200),
      model,
      durationMs,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    let friendlyError = reason;
    if (reason.includes("fetch failed") || reason.includes("ENOTFOUND")) {
      friendlyError = "اتصال برقرار نشد — آدرس API یا اینترنت رو بررسی کنید";
    } else if (reason.includes("timeout") || reason.includes("aborted")) {
      friendlyError = "پاسخ بیش از حد طول کشید (تایم‌اوت)";
    }
    return NextResponse.json({
      success: false,
      error: friendlyError,
      detail: reason,
    }, { status: 200 });
  }
}
