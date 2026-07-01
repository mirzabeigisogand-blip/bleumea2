"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Languages, ArrowLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "bleumea-api-key";

function detectProvider(key: string): { baseURL: string; model: string } {
  if (key.startsWith("gsk_")) return { baseURL: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" };
  if (key.startsWith("sk-or-v1-")) return { baseURL: "https://openrouter.ai/api/v1", model: "anthropic/claude-3.5-sonnet" };
  if (key.startsWith("sk-")) return { baseURL: "https://api.openai.com/v1", model: "gpt-4o-mini" };
  return { baseURL: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4.6" };
}

const SAMPLES = [
  {
    label: "فروست — آتش و یخ",
    text: `Some say the world will end in fire,
Some say in ice.
From what I've tasted of desire
I hold with those who favor fire.`,
  },
  {
    label: "هوگو — گزیده",
    text: `Demain, dès l'aube, à l'heure où blanchit la campagne,
Je partirai. Vois-tu, je sais que tu m'attends.`,
  },
  {
    label: "باشو — هایکو",
    text: `古池や
蛙飛び込む
水の音`,
  },
];

export function TranslatorPanel() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    const k = localStorage.getItem(STORAGE_KEY);
    setHasKey(!!k);
  }, []);

  async function translate() {
    if (!text.trim()) {
      toast.error("متن را وارد کنید");
      return;
    }
    const apiKey = localStorage.getItem(STORAGE_KEY);
    if (!apiKey) {
      toast.error("ابتدا به تب «تنظیمات» بروید و کلید API را وارد کنید");
      return;
    }
    const provider = detectProvider(apiKey);

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/bleumea/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          sourceLanguage: "auto",
          apiKey,
          baseURL: provider.baseURL,
          model: provider.model,
        }),
      });
      const d = await res.json();
      if (d.result) {
        setResult(d.result);
        toast.success("ترجمه کامل شد");
      } else {
        toast.error(d.error || "ترجمه ناموفق بود");
      }
    } catch {
      toast.error("ترجمه ناموفق بود");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {!hasKey && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-amber-900 text-sm">کلید API تنظیم نشده</div>
                <div className="text-xs text-amber-900/80 mt-1">
                  برای ترجمه، ابتدا به تب «تنظیمات» بروید و کلید API خود را وارد کنید.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">نمونه:</span>
        {SAMPLES.map((s) => (
          <Button key={s.label} size="sm" variant="outline" className="h-7 text-xs" onClick={() => setText(s.text)}>
            {s.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Languages className="h-4 w-4" /> متن مبدأ
              </div>
              <Button onClick={translate} disabled={loading || !text.trim() || !hasKey} size="sm">
                {loading
                  ? <><Loader2 className="h-3 w-3 animate-spin" /> در حال ترجمه</>
                  : <><Sparkles className="h-3 w-3" /> ترجمه کن</>
                }
              </Button>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="هر متنی را اینجا بگذارید..."
              rows={10}
              className="font-mono text-sm resize-none"
              dir="auto"
            />
            <div className="mt-2 text-[10px] text-muted-foreground text-left">
              {text.length.toLocaleString("fa-IR")} کاراکتر
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary" /> ترجمه شعری فارسی
              </div>
              {result && (
                <Badge variant="outline" className="text-[9px]">
                  کیفیت {(result.quality * 100).toFixed(0)}٪
                </Badge>
              )}
            </div>
            {!result && !loading && (
              <div className="h-[240px] flex flex-col items-center justify-center text-center text-muted-foreground">
                <ArrowLeft className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs">متن خود را وارد کرده و دکمهٔ «ترجمه کن» را بزنید</p>
              </div>
            )}
            {loading && (
              <div className="h-[240px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs">در حال تولید شعر فارسی…</p>
              </div>
            )}
            {result && (
              <div dir="rtl" className="p-4 rounded-lg bg-background/50 whitespace-pre-wrap text-lg leading-loose min-h-[240px]">
                {result.persianTranslation}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
