"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Languages, Loader2, Sparkles, AlertCircle, CheckCircle2,
} from "lucide-react";

const SAMPLES = [
  {
    label: "فروست — گزیده",
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

export function TranslationPanel() {
  const [text, setText] = useState(SAMPLES[0].text);
  const [title, setTitle] = useState(SAMPLES[0].title);
  const [author, setAuthor] = useState(SAMPLES[0].author);
  const [language, setLanguage] = useState(SAMPLES[0].language);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    persianTranslation: string;
    quality: number;
    model: string;
    fallbackUsed: boolean;
    durationMs: number;
  } | null>(null);

  async function translate() {
    if (!text.trim()) {
      toast.error("متن الزامی است");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/bleumea/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sourceLanguage: language, title, author }),
      });
      const d = await res.json();
      if (d.result) {
        setResult(d.result);
        toast.success(d.result.fallbackUsed ? "ترجمه جایگزین کامل شد" : "ترجمه کامل شد");
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
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Languages className="h-4 w-4" /> موتور ترجمه شعری فارسی
          </CardTitle>
          <CardDescription>
            نیرومند با GLM-4.6 و پرامپت سیستم شاعر فارسی. هرگز تحت‌اللفظی — حال‌وهوا، ریتم، استعاره و تصویر را حفظ می‌کند.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ورودی */}
          <div className="space-y-3">
            <div>
              <Label>نمونه‌های آماده</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {SAMPLES.map((s) => (
                  <Button
                    key={s.label}
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setText(s.text); setTitle(s.title); setAuthor(s.author); setLanguage(s.language);
                    }}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="t-title">عنوان</Label>
                <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="t-author">نویسنده</Label>
                <Input id="t-author" value={author} onChange={(e) => setAuthor(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="t-lang">زبان</Label>
                <Input id="t-lang" value={language} onChange={(e) => setLanguage(e.target.value)} className="font-mono uppercase" dir="ltr" />
              </div>
            </div>
            <div>
              <Label htmlFor="t-text">متن مبدأ</Label>
              <Textarea
                id="t-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={10}
                className="font-mono text-sm"
                dir="ltr"
              />
            </div>
            <Button onClick={translate} disabled={loading} className="w-full">
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> در حال ترجمه…</>
              ) : (
                <><Sparkles className="h-4 w-4" /> ترجمه شعری</>
              )}
            </Button>
          </div>

          {/* خروجی */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>ترجمه فارسی</Label>
              {result && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-mono">{result.model}</Badge>
                  <Badge variant="outline" className="text-[10px]">کیفیت={(result.quality * 100).toFixed(0)}٪</Badge>
                  <Badge variant="outline" className="text-[10px]">{formatNumber(result.durationMs)} میلی‌ثانیه</Badge>
                  {result.fallbackUsed ? (
                    <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300">جایگزین</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300">اصلی</Badge>
                  )}
                </div>
              )}
            </div>

            {!result && !loading && (
              <div className="p-8 rounded-md border-2 border-dashed text-center text-muted-foreground text-sm">
                ترجمه در اینجا نمایش داده می‌شود.
              </div>
            )}

            {loading && (
              <div className="p-8 rounded-md border-2 border-dashed text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> در حال تولید شعر فارسی…
              </div>
            )}

            {result && (
              <>
                {result.fallbackUsed && (
                  <Alert className="border-amber-300 bg-amber-50 text-amber-900">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      API اصلی LLM در دسترس نیست — استفاده از fallback-heuristic-v1. پایپ‌لاین به‌طور آرام ادامه یافت.
                    </AlertDescription>
                  </Alert>
                )}
                <div
                  dir="rtl"
                  className="p-6 rounded-md bg-primary/5 border border-primary/20 whitespace-pre-wrap text-lg leading-loose min-h-48"
                >
                  {result.persianTranslation}
                </div>
                <div className="text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 inline ml-1 text-emerald-600" />
                  امتیاز کیفیت: {(result.quality * 100).toFixed(0)}٪ — بر اساس نسبت طول، تراکم کاراکتر فارسی، ساختار شعری.
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* قوانین ترجمه */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">قوانین ترجمه شعری</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <RuleRow ok text="هرگز ترجمه تحت‌اللفظی — تصاویر حفظ می‌شوند" />
            <RuleRow ok text="حال‌وهوای عاطفی حفظ می‌شود (غم، غم می‌ماند)" />
            <RuleRow ok text="ریتم و وزن شعری حفظ می‌شود" />
            <RuleRow ok text="استعاره‌ها حفظ و معادل فارسی یافته می‌شود" />
            <RuleRow ok text="مانند یک شعر اصیل فارسی خوانده می‌شود" />
            <RuleRow ok text="لفظ شعری رفیع (سکوت، مهتاب، سایه)" />
            <RuleRow ok text="آگاه به فرم: هایکو کوتاه می‌ماند، غزل غزل می‌ماند" />
            <RuleRow ok text="خروجی: فقط شعر فارسی، بدون توضیح" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RuleRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
      )}
      <span>{text}</span>
    </div>
  );
}

function formatNumber(n: number): string {
  return n.toLocaleString("fa-IR");
}
