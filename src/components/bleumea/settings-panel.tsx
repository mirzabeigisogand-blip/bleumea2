"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Settings, Loader2, CheckCircle2, XCircle, ExternalLink, KeyRound,
  Sparkles, Save, TestTube, Eye, EyeOff,
} from "lucide-react";

const STORAGE_KEY = "bleumea-settings";

const PROVIDERS = {
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
};

interface SavedSettings {
  LLM_PROVIDER: string;
  LLM_BASE_URL: string;
  LLM_MODEL: string;
  LLM_API_KEY: string;
}

function loadSettings(): SavedSettings {
  if (typeof window === "undefined") {
    return {
      LLM_PROVIDER: "glm",
      LLM_BASE_URL: PROVIDERS.glm.baseURL,
      LLM_MODEL: PROVIDERS.glm.models[0],
      LLM_API_KEY: "",
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        LLM_PROVIDER: parsed.LLM_PROVIDER || "glm",
        LLM_BASE_URL: parsed.LLM_BASE_URL || PROVIDERS.glm.baseURL,
        LLM_MODEL: parsed.LLM_MODEL || PROVIDERS.glm.models[0],
        LLM_API_KEY: parsed.LLM_API_KEY || "",
      };
    }
  } catch {}
  return {
    LLM_PROVIDER: "glm",
    LLM_BASE_URL: PROVIDERS.glm.baseURL,
    LLM_MODEL: PROVIDERS.glm.models[0],
    LLM_API_KEY: "",
  };
}

function saveSettings(s: SavedSettings) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }
}

export function SettingsPanel() {
  const [initial] = useState(loadSettings);
  const [provider, setProvider] = useState(initial.LLM_PROVIDER);
  const [baseURL, setBaseURL] = useState(initial.LLM_BASE_URL);
  const [model, setModel] = useState(initial.LLM_MODEL);
  const [apiKey, setApiKey] = useState(initial.LLM_API_KEY);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    reply?: string;
    error?: string;
    detail?: string;
    durationMs?: number;
  } | null>(null);

  function selectProvider(p: string) {
    const prov = (PROVIDERS as any)[p];
    if (!prov) return;
    setProvider(p);
    setBaseURL(prov.baseURL);
    setModel(prov.models[0]);
    setTestResult(null);
  }

  function save() {
    setSaving(true);
    saveSettings({ LLM_PROVIDER: provider, LLM_BASE_URL: baseURL, LLM_MODEL: model, LLM_API_KEY: apiKey });
    setTimeout(() => {
      setSaving(false);
      toast.success("تنظیمات ذخیره شد");
    }, 300);
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/bleumea/test-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          LLM_PROVIDER: provider,
          LLM_BASE_URL: baseURL,
          LLM_MODEL: model,
          LLM_API_KEY: apiKey,
        }),
      });
      const d = await res.json();
      setTestResult(d);
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

  const currentProvider = (PROVIDERS as any)[provider];
  const apiKeySet = !!apiKey && apiKey.length > 0;

  return (
    <div className="space-y-4 max-w-3xl mx-auto" dir="rtl">
      {/* وضعیت فعلی */}
      <Card className="border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${apiKeySet ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {apiKeySet ? <CheckCircle2 className="h-6 w-6" /> : <KeyRound className="h-6 w-6" />}
              </div>
              <div>
                <div className="font-bold text-base">
                  {apiKeySet ? "اتصال پیکربندی شده" : "بدون اتصال"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {apiKeySet
                    ? `ارائه‌دهنده: ${currentProvider?.label} · مدل: ${model}`
                    : "برای فعال‌سازی ترجمه، کلید API را وارد کنید"}
                </div>
              </div>
            </div>
            <Button onClick={testConnection} disabled={testing || !apiKey} size="sm">
              {testing
                ? <><Loader2 className="h-3 w-3 animate-spin" /> در حال تست</>
                : <><TestTube className="h-3 w-3" /> تست اتصال</>
              }
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* نتیجه تست */}
      {testResult && (
        <Alert variant={testResult.success ? "default" : "destructive"} className={testResult.success ? "border-emerald-300 bg-emerald-50 text-emerald-900" : ""}>
          {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          <AlertTitle>{testResult.success ? "اتصال موفق" : "اتصال ناموفق"}</AlertTitle>
          <AlertDescription className="text-xs space-y-1">
            {testResult.success ? (
              <>
                <div>{testResult.message}</div>
                {testResult.reply && <div className="font-mono bg-emerald-100/50 p-2 rounded mt-1">پاسخ: {testResult.reply}</div>}
                {testResult.durationMs && <div className="text-muted-foreground">زمان پاسخ: {testResult.durationMs.toLocaleString("fa-IR")} میلی‌ثانیه</div>}
              </>
            ) : (
              <>
                <div>{testResult.error}</div>
                {testResult.detail && <div className="font-mono text-[10px] text-muted-foreground mt-1">{testResult.detail}</div>}
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* انتخاب ارائه‌دهنده */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> انتخاب ارائه‌دهندهٔ هوش مصنوعی
          </CardTitle>
          <CardDescription>
            یکی از ارائه‌دهنده‌ها را انتخاب کنید — پیش‌فرض روی GLM است
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(PROVIDERS).map(([key, p]) => (
              <button
                key={key}
                onClick={() => selectProvider(key)}
                className={`text-right p-3 rounded-lg border-2 transition-all ${
                  provider === key
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30 hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-sm">{p.label}</span>
                  {p.free && <Badge variant="outline" className="text-[9px] text-emerald-700 border-emerald-300">رایگان</Badge>}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 truncate" dir="ltr">{p.baseURL}</div>
              </button>
            ))}
          </div>

          {currentProvider && (
            <div className="mt-4 p-3 rounded-md bg-muted/50 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">برای دریافت کلید API:</span>
                <a
                  href={currentProvider.signupUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline inline-flex items-center gap-1"
                >
                  {currentProvider.signupUrl} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* تنظیمات دقیق */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" /> تنظیمات اتصال
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* کلید API */}
          <div>
            <Label htmlFor="api-key" className="flex items-center justify-between">
              <span>کلید API</span>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                {showKey ? <><EyeOff className="h-3 w-3" /> پنهان</> : <><Eye className="h-3 w-3" /> نمایش</>}
              </button>
            </Label>
            <Input
              id="api-key"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="مثال: sk-proj-... یا gsk_... یا xxxxx"
              className="mt-1 font-mono text-xs"
              dir="ltr"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              کلید فقط در مرورگر شما ذخیره می‌شود (localStorage) — امن است.
            </p>
          </div>

          {/* آدرس پایه */}
          <div>
            <Label htmlFor="base-url">آدرس پایه API</Label>
            <Input
              id="base-url"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              className="mt-1 font-mono text-xs"
              dir="ltr"
            />
          </div>

          {/* مدل */}
          <div>
            <Label htmlFor="model">نام مدل</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="font-mono text-xs flex-1"
                dir="ltr"
              />
              {currentProvider && currentProvider.models.length > 0 && (
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="px-2 rounded-md border bg-background text-xs font-mono"
                  dir="ltr"
                >
                  {currentProvider.models.map((m: string) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* دکمه‌ها */}
          <div className="flex gap-2 pt-2">
            <Button onClick={save} disabled={saving} className="flex-1">
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ذخیره</>
                : <><Save className="h-4 w-4" /> ذخیره تنظیمات</>
              }
            </Button>
            <Button onClick={testConnection} disabled={testing} variant="outline" className="flex-1">
              {testing
                ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال تست</>
                : <><TestTube className="h-4 w-4" /> تست اتصال</>
              }
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* راهنما */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardContent className="p-4 text-xs space-y-2">
          <div className="font-semibold flex items-center gap-1 text-blue-900">
            <Sparkles className="h-3 w-3" /> راهنمای سریع
          </div>
          <ol className="list-decimal pr-4 space-y-1 text-blue-900/80">
            <li>یک ارائه‌دهنده انتخاب کنید (GLM پیش‌فرض است)</li>
            <li>روی لینک «دریافت کلید API» کلیک کنید و در سایت ارائه‌دهنده ثبت‌نام کنید</li>
            <li>کلید دریافتی را در کادر بالا وارد کنید</li>
            <li>روی «تست اتصال» بزنید تا مطمئن شوید کار می‌کند</li>
            <li>در نهایت «ذخیره تنظیمات» را بزنید</li>
          </ol>
          <div className="text-blue-900/80 mt-2">
            💡 اگه ارائه‌دهندهٔ رایگان می‌خواهید، <strong>Groq</strong> بهترین گزینه است.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
