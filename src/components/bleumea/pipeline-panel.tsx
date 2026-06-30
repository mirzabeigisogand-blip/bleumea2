"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Play, Loader2, ChevronRight, Activity, Zap, AlertCircle, CheckCircle2,
} from "lucide-react";
import {
  StatusBadge, formatMs, formatRelative, formatDateTime,
  PIPELINE_STAGE_LABELS, PIPELINE_STAGE_DESCRIPTIONS, formatNumber,
} from "./shared";

interface PipelineRun {
  id: string;
  status: string;
  trigger: string;
  inputCount: number;
  outputCount: number;
  rejectedCount: number;
  quarantineCount: number;
  stageStats: Record<string, { success: number; failed: number; skipped: number; avgMs: number }>;
  degradedApis: string[];
  fallbacksUsed: string[];
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  poemsStored: number;
}

interface RunDetail {
  run: PipelineRun & {
    poems: Array<{
      id: string;
      title: string;
      author: string;
      language: string;
      status: string;
      qualityScore: number;
      licenseType: string;
      legalityScore: string;
      pipelineStages: Array<{
        stageName: string;
        status: string;
        confidence: number | null;
        durationMs: number | null;
        message: string | null;
        metadata: string | null;
      }>;
    }>;
  };
}

const TRIGGER_LABELS: Record<string, string> = {
  MANUAL: "دستی",
  SCHEDULED: "زمان‌بندی‌شده",
  BACKFILL: "بازگشت",
  RETRY: "تلاش مجدد",
};

const DEFAULT_TEST_INPUT = `Two roads diverged in a yellow wood,
And sorry I could not travel both
And be one traveler, long I stood
And looked down one as far as I could
To where it bent in the undergrowth.`;

export function PipelinePanel() {
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RunDetail["run"] | null>(null);
  const [ingestText, setIngestText] = useState(DEFAULT_TEST_INPUT);
  const [ingestTitle, setIngestTitle] = useState("شعر آزمایشی");
  const [ingestAuthor, setIngestAuthor] = useState("ناشناس");
  const [ingestUrl, setIngestUrl] = useState("https://gutenberg.org/test");
  const [ingesting, setIngesting] = useState(false);

  useEffect(() => {
    loadRuns();
    const interval = setInterval(loadRuns, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedRunId) return;
    fetch(`/api/bleumea/pipeline/${selectedRunId}`)
      .then((r) => r.json())
      .then((d) => setDetail(d.run))
      .catch(() => setDetail(null));
  }, [selectedRunId]);

  function loadRuns() {
    fetch("/api/bleumea/pipeline?limit=20")
      .then((r) => r.json())
      .then((d) => {
        setRuns(d.runs || []);
        setLoading(false);
        if (!selectedRunId && d.runs?.length > 0) {
          setSelectedRunId(d.runs[0].id);
        }
      })
      .catch(() => setLoading(false));
  }

  async function runIngest() {
    if (!ingestText.trim()) {
      toast.error("متن الزامی است");
      return;
    }
    setIngesting(true);
    try {
      const res = await fetch("/api/bleumea/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trigger: "MANUAL",
          items: [{
            rawText: ingestText,
            sourceUrl: ingestUrl,
            title: ingestTitle,
            author: ingestAuthor,
          }],
        }),
      });
      const d = await res.json();
      if (d.run) {
        toast.success(`پایپ‌لاین ${d.run.status === "SUCCESS" ? "موفق" : d.run.status === "DEGRADED" ? "تنزل‌یافته" : "ناموفق"}: ${formatNumber(d.run.outputCount)} ذخیره، ${formatNumber(d.run.quarantineCount)} قرنطینه، ${formatNumber(d.run.rejectedCount)} ردشده`);
        loadRuns();
        setSelectedRunId(d.run.runId);
      } else {
        toast.error("شروع پایپ‌لاین ناموفق بود");
      }
    } catch (e) {
      toast.error("دریافت ناموفق بود");
    } finally {
      setIngesting(false);
    }
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* راه‌اندازی دریافت */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="h-4 w-4" /> راه‌اندازی دستی پایپ‌لاین
          </CardTitle>
          <CardDescription>
            متن خام را ارسال کنید — پایپ‌لاین خودمختار هر ۹ مرحله را اجرا کرده و ترجمه فارسی تولید می‌کند.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="rawText">متن خام</Label>
            <Textarea
              id="rawText"
              value={ingestText}
              onChange={(e) => setIngestText(e.target.value)}
              rows={6}
              className="font-mono text-xs"
              placeholder="یک شعر اینجا قرار دهید…"
            />
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="title">عنوان</Label>
              <Input id="title" value={ingestTitle} onChange={(e) => setIngestTitle(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="author">نویسنده</Label>
              <Input id="author" value={ingestAuthor} onChange={(e) => setIngestAuthor(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="url">آدرس منبع</Label>
              <Input id="url" value={ingestUrl} onChange={(e) => setIngestUrl(e.target.value)} className="font-mono text-xs" dir="ltr" />
              <p className="text-[10px] text-muted-foreground mt-1">آدرس نتیجه هوش لایسنس را تعیین می‌کند</p>
            </div>
            <Button onClick={runIngest} disabled={ingesting} className="w-full">
              {ingesting ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال اجرا…</> : <><Play className="h-4 w-4" /> اجرای پایپ‌لاین</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* فهرست اجراها + جزئیات */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* فهرست اجراها */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> اجراهای اخیر
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96 pl-3">
              <div className="space-y-1">
                {runs.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRunId(r.id)}
                    className={`w-full text-right p-3 rounded-md border transition-colors ${
                      selectedRunId === r.id ? "bg-primary/10 border-primary" : "hover:bg-muted/50 border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <StatusBadge status={r.status} />
                      <span className="text-[10px] text-muted-foreground">{formatRelative(r.startedAt)}</span>
                    </div>
                    <div className="mt-2 text-xs">
                      <span className="font-mono">{TRIGGER_LABELS[r.trigger] || r.trigger}</span>
                      <span className="mx-2 text-muted-foreground">·</span>
                      <span className="text-emerald-700">{formatNumber(r.outputCount)}</span> ذخیره ·
                      <span className="text-amber-700"> {formatNumber(r.quarantineCount)}</span> قرنطینه ·
                      <span className="text-rose-700"> {formatNumber(r.rejectedCount)}</span> ردشده
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 font-mono">{r.id.slice(0, 12)}…</div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* جزئیات اجرا با نمایش مراحل */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" /> جزئیات اجرا
              {detail && <Badge variant="outline" className="font-mono text-[10px]">{detail.id.slice(0, 16)}…</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!detail ? (
              <div className="text-sm text-muted-foreground p-8 text-center">یک اجرا را برای بازرسی مراحل انتخاب کنید</div>
            ) : (
              <div className="space-y-4">
                {/* آمار اجرا */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center text-xs">
                  <div className="p-2 rounded-md bg-muted">
                    <div className="text-muted-foreground">ورودی</div>
                    <div className="text-lg font-bold">{formatNumber(detail.inputCount)}</div>
                  </div>
                  <div className="p-2 rounded-md bg-emerald-50">
                    <div className="text-emerald-700">ذخیره‌شده</div>
                    <div className="text-lg font-bold text-emerald-700">{formatNumber(detail.outputCount)}</div>
                  </div>
                  <div className="p-2 rounded-md bg-amber-50">
                    <div className="text-amber-700">قرنطینه</div>
                    <div className="text-lg font-bold text-amber-700">{formatNumber(detail.quarantineCount)}</div>
                  </div>
                  <div className="p-2 rounded-md bg-rose-50">
                    <div className="text-rose-700">ردشده</div>
                    <div className="text-lg font-bold text-rose-700">{formatNumber(detail.rejectedCount)}</div>
                  </div>
                  <div className="p-2 rounded-md bg-muted">
                    <div className="text-muted-foreground">مدت</div>
                    <div className="text-lg font-bold">{formatMs(detail.durationMs)}</div>
                  </div>
                </div>

                {/* شبکه آمار مراحل */}
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">آمار مراحل</div>
                  <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-1">
                    {Object.keys(PIPELINE_STAGE_LABELS).map((stage) => {
                      const s = detail.stageStats[stage];
                      const total = s ? s.success + s.failed + s.skipped : 0;
                      const ok = s ? s.success : 0;
                      const pct = total > 0 ? (ok / total) * 100 : 0;
                      return (
                        <div key={stage} className="p-2 rounded-md border text-center" title={PIPELINE_STAGE_DESCRIPTIONS[stage]}>
                          <div className="text-[9px] font-semibold text-muted-foreground truncate">{PIPELINE_STAGE_LABELS[stage]}</div>
                          <div className="text-sm font-bold mt-1">{formatNumber(ok)}/{formatNumber(total || 0)}</div>
                          <Progress value={pct} className="h-1 mt-1" />
                          <div className="text-[8px] text-muted-foreground mt-1">{formatMs(s?.avgMs)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* APIهای تنزل‌یافته / فالبک‌ها */}
                {(detail.degradedApis.length > 0 || detail.fallbacksUsed.length > 0) && (
                  <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertCircle className="h-4 w-4" /> تنزل آرام فعال است
                    </div>
                    {detail.degradedApis.length > 0 && (
                      <div>APIهای تنزل‌یافته: {detail.degradedApis.join("، ")}</div>
                    )}
                    {detail.fallbacksUsed.length > 0 && (
                      <div>مدل‌های جایگزین: {detail.fallbacksUsed.join("، ")}</div>
                    )}
                  </div>
                )}

                {/* تفکیک مراحل هر شعر */}
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">نتایج مراحل هر شعر</div>
                  <ScrollArea className="h-72 pl-3">
                    <div className="space-y-3">
                      {detail.poems.map((p) => (
                        <div key={p.id} className="border rounded-md p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="font-semibold text-sm">{p.title}</div>
                              <div className="text-xs text-muted-foreground">{p.author} · {p.language}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusBadge status={p.status} />
                              <Badge variant="outline" className="text-[10px] font-mono">{p.licenseType}</Badge>
                              <Badge variant="outline" className="text-[10px]">کیفیت={(p.qualityScore * 100).toFixed(0)}٪</Badge>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {p.pipelineStages.map((s, i) => {
                              const colors: Record<string, string> = {
                                SUCCESS: "bg-emerald-100 text-emerald-800 border-emerald-300",
                                FAILED: "bg-rose-100 text-rose-800 border-rose-300",
                                SKIPPED: "bg-zinc-100 text-zinc-600 border-zinc-300",
                                RETRY: "bg-orange-100 text-orange-800 border-orange-300",
                              };
                              const statusLabels: Record<string, string> = {
                                SUCCESS: "موفق",
                                FAILED: "ناموفق",
                                SKIPPED: "نادیده",
                                RETRY: "تلاش مجدد",
                              };
                              return (
                                <div
                                  key={i}
                                  className={`px-2 py-1 rounded text-[10px] border ${colors[s.status] || ""}`}
                                  title={s.message || ""}
                                >
                                  <div className="font-mono font-semibold">{PIPELINE_STAGE_LABELS[s.stageName] || s.stageName}</div>
                                  <div className="opacity-70">{statusLabels[s.status] || s.status} · {formatMs(s.durationMs)}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
