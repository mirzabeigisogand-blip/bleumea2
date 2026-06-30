"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Languages, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const SAMPLES = [
  {
    label: "فروست — آتش و یخ",
    title: "آتش و یخ",
    author: "رابرت فروست",
    language: "en",
    text: `Some say the world will end in fire,
Some say in ice.
From what I've tasted of desire
I hold with those who favor fire.`,
  },
  {
    label: "هوگو — گزیده",
    title: "فردا به سپیده‌دم",
    author: "ویکتور هوگو",
    language: "fr",
    text: `Demain, dès l'aube, à l'heure où blanchit la campagne,
Je partirai. Vois-tu, je sais que tu m'attends.`,
  },
  {
    label: "باشو — هایکو",
    title: "برکه کهنه",
    author: "ماتسوئو باشو",
    language: "ja",
    text: `古池や
蛙飛び込む
水の音`,
  },
];

export function TranslatorPanel() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{
    persianTranslation: string;
    quality: number;
    model: string;
    fallbackUsed: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function translate() {
    if (!text.trim()) {
      toast.error("متن را وارد کنید");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/bleumea/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sourceLanguage: "auto" }),
      });
      const d = await res.json();
      if (d.result) {
        setResult(d.result);
        toast.success("ترجمه کامل شد");
      } else {
        toast.error("ترجمه ناموفق بود");
      }
    } catch {
      toast.error("ترجمه ناموفق بود");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* نمونه‌های آماده */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">نمونه:</span>
        {SAMPLES.map((s) => (
          <Button
            key={s.label}
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => setText(s.text)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {/* دو ستونی: ورودی + خروجی */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ورودی */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Languages className="h-4 w-4" />
                متن مبدأ
              </div>
              <Button
                onClick={translate}
                disabled={loading || !text.trim()}
                size="sm"
              >
                {loading
                  ? <><Loader2 className="h-3 w-3 animate-spin" /> در حال ترجمه</>
                  : <><Sparkles className="h-3 w-3" /> ترجمه کن</>
                }
              </Button>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="هر متنی را اینجا بگذارید — شعر، ترانه، یا حتی یک جمله…"
              rows={10}
              className="font-mono text-sm resize-none"
              dir="auto"
            />
            <div className="mt-2 text-[10px] text-muted-foreground text-left">
              {text.length.toLocaleString("fa-IR")} کاراکتر
            </div>
          </CardContent>
        </Card>

        {/* خروجی */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary" />
                ترجمه شعری فارسی
              </div>
              {result && (
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[9px]">
                    کیفیت {(result.quality * 100).toFixed(0)}٪
                  </Badge>
                  {result.fallbackUsed
                    ? <Badge variant="outline" className="text-[9px] text-amber-700 border-amber-300">جایگزین</Badge>
                    : <Badge variant="outline" className="text-[9px] text-emerald-700 border-emerald-300">اصلی</Badge>
                  }
                </div>
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
              <div
                dir="rtl"
                className="p-4 rounded-lg bg-background/50 whitespace-pre-wrap text-lg leading-loose min-h-[240px]"
              >
                {result.persianTranslation}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* راهنمای کوتاه */}
      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground">
          <strong className="text-foreground">چطور ترجمه می‌کند؟</strong> — این مترجم تحت‌اللفظی ترجمه نمی‌کند.
          حال‌وهوا، ریتم و استعاره‌های متن مبدأ را حفظ کرده و خروجی را مانند یک شعر اصیل فارسی می‌سازد.
          برای اشعار کوتاه (مثل هایکو) خروجی کوتاه و برای اشعار بلند، خروجی بلند تولید می‌کند.
        </CardContent>
      </Card>
    </div>
  );
}
