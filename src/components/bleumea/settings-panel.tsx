"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Loader2, CheckCircle2, XCircle, KeyRound, Save, TestTube, Eye, EyeOff,
} from "lucide-react";

const STORAGE_KEY = "bleumea-api-key";

// تشخیص خودکار ارائه‌دهنده از روی کلید
function detectProvider(key: string): { baseURL: string; model: string; name: string } {
  if (key.startsWith("gsk_")) {
    return { baseURL: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile", name: "Groq" };
  }
  if (key.startsWith("sk-or-v1-")) {
    return { baseURL: "https://openrouter.ai/api/v1", model: "anthropic/claude-3.5-sonnet", name: "OpenRouter" };
  }
  if (key.startsWith("sk-")) {
    return { baseURL: "https://api.openai.com/v1", model: "gpt-4o-mini", name: "OpenAI" };
  }
  // پیش‌فرض: GLM
  return { baseURL: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4.6", name: "GLM" };
}

export function SettingsPanel() {
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(STORAGE_KEY) || "";
  });
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const detected = apiKey ? detectProvider(apiKey) : null;

  function save() {
    setSaving(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, apiKey);
    }
    setTimeout(() => {
      setSaving(false);
      toast.success("کلید ذخیره شد");
    }, 300);
  }

  async function testConnection() {
    if (!apiKey) {
      toast.error("کلید API را وارد کنید");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const provider = detectProvider(apiKey);
      const res = await fetch("/api/bleumea/test-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          LLM_API_KEY: apiKey,
          LLM_BASE_URL: provider.baseURL,
          LLM_MODEL: provider.model,
        }),
      });
      const d = await res.json();
      setTestResult({ ...d, provider: provider.name });
      if (d.success) {
        toast.success("اتصال موفق بود!");
      } else {
        toast.error(d.error || "اتصال ناموفق بود");
      }
    } catch {
      setTestResult({ success: false, error: "خطای شبکه" });
      toast.error("خطای شبکه");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto" dir="rtl">
      {/* عنوان */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-5 w-5" /> کلید API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* کادر کلید */}
          <div>
            <Label className="flex items-center justify-between">
              <span>کلید API خود را وارد کنید</span>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                {showKey ? <><EyeOff className="h-3 w-3" /> پنهان</> : <><Eye className="h-3 w-3" /> نمایش</>}
              </button>
            </Label>
            <Input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="کلید API اینجا..."
              className="mt-1 font-mono text-sm h-12"
              dir="ltr"
            />
            <p className="text-[10px] text-muted-foreground mt-2">
              کلید فقط در مرورگر شما ذخیره می‌شود. خودش می‌فهمد مال کدوم سایت است.
            </p>
          </div>

          {/* تشخیص خودکار */}
          {detected && (
            <div className="p-3 rounded-md bg-muted/50 text-xs">
              <span className="text-muted-foreground">تشخیص خودکار: </span>
              <strong>{detected.name}</strong>
              <span className="text-muted-foreground mr-2" dir="ltr">({detected.model})</span>
            </div>
          )}

          {/* دکمه‌ها */}
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving || !apiKey} className="flex-1">
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> ذخیره...</>
                : <><Save className="h-4 w-4" /> ذخیره</>
              }
            </Button>
            <Button onClick={testConnection} disabled={testing || !apiKey} variant="outline" className="flex-1">
              {testing
                ? <><Loader2 className="h-4 w-4 animate-spin" /> تست...</>
                : <><TestTube className="h-4 w-4" /> تست اتصال</>
              }
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* نتیجه تست */}
      {testResult && (
        <Alert variant={testResult.success ? "default" : "destructive"} className={testResult.success ? "border-emerald-300 bg-emerald-50 text-emerald-900" : ""}>
          {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          <AlertTitle>{testResult.success ? `اتصال موفق (${testResult.provider})` : "اتصال ناموفق"}</AlertTitle>
          <AlertDescription className="text-xs space-y-1">
            {testResult.success ? (
              <>
                <div>{testResult.message}</div>
                {testResult.reply && <div className="font-mono bg-emerald-100/50 p-2 rounded mt-1">پاسخ: {testResult.reply}</div>}
              </>
            ) : (
              <>
                <div>{testResult.error}</div>
                {testResult.detail && <div className="font-mono text-[10px] text-muted-foreground mt-1" dir="ltr">{testResult.detail}</div>}
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* راهنما */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardContent className="p-4 text-xs space-y-2">
          <div className="font-semibold text-blue-900">از کجا کلید بگیرم؟</div>
          <ul className="list-disc pr-4 space-y-1 text-blue-900/80">
            <li><strong>GLM</strong> (پیش‌فرض): <a href="https://open.bigmodel.cn/usercenter/apikeys" target="_blank" className="underline">open.bigmodel.cn</a></li>
            <li><strong>Groq</strong> (رایگان): <a href="https://console.groq.com/keys" target="_blank" className="underline">console.groq.com</a></li>
            <li><strong>OpenAI</strong>: <a href="https://platform.openai.com/api-keys" target="_blank" className="underline">platform.openai.com</a></li>
            <li><strong>OpenRouter</strong>: <a href="https://openrouter.ai/keys" target="_blank" className="underline">openrouter.ai</a></li>
          </ul>
          <div className="text-blue-900/80 mt-2">
            💡 کلیدت رو بذار تو کادر بالا — خودش می‌فهمه مال کدوم سایت است.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
