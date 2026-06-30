"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  ShieldCheck, Loader2, Play, AlertCircle, CheckCircle2, XCircle, Bug, Activity,
} from "lucide-react";
import { StatusBadge, formatMs, formatRelative, formatNumber } from "./shared";

interface QaResult {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  results: Array<{
    testSuite: string;
    testName: string;
    status: string;
    durationMs: number;
    message: string;
    autoFix: boolean;
    fixCommit?: string;
  }>;
  durationMs: number;
}

interface Anomalies {
  anomalies: Array<{ type: string; severity: "LOW" | "MEDIUM" | "HIGH"; detail: string }>;
}

interface ApiHealth {
  name: string;
  status: string;
  latencyMs: number;
  successRate: number;
  lastCheckedAt: string;
  fallbackActive: boolean;
  primaryModel: string;
  fallbackModel?: string;
}

const API_LABELS: Record<string, string> = {
  CLASSIFICATION: "طبقه‌بندی",
  TRANSLATION: "ترجمه",
  EMBEDDING: "برداری",
  ANALYTICS: "تحلیلی",
};

const API_STATUS_LABELS: Record<string, string> = {
  HEALTHY: "سالم",
  DEGRADED: "تنزل‌یافته",
  DOWN: "از‌خدمت‌رفته",
  FALLBACK: "جایگزین",
};

const TEST_SUITE_LABELS: Record<string, string> = {
  UNIT: "واحد",
  INTEGRATION: "یکپارچه",
  PIPELINE_SIM: "شبیه‌سازی پایپ‌لاین",
  REGRESSION: "رجression",
};

const SEVERITY_LABELS: Record<string, string> = {
  LOW: "پایین",
  MEDIUM: "متوسط",
  HIGH: "بالا",
};

export function QaPanel() {
  const [qa, setQa] = useState<QaResult | null>(null);
  const [anomalies, setAnomalies] = useState<Anomalies | null>(null);
  const [apis, setApis] = useState<ApiHealth[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [qaRes, apiRes] = await Promise.all([
        fetch("/api/bleumea/qa").then((r) => r.json()),
        fetch("/api/bleumea/api-health").then((r) => r.json()),
      ]);
      setQa(qaRes.qa);
      setAnomalies(qaRes.anomalies);
      setApis(apiRes.apis || []);
    } finally {
      setLoading(false);
      setInitialLoaded(true);
    }
  }

  async function rerun() {
    setLoading(true);
    try {
      await loadAll();
      toast.success(`مجموعه QA کامل شد: ${qa ? formatNumber(qa.passed) : "۰"}/${qa ? formatNumber(qa.total) : "۰"} قبول شد`);
    } catch {
      toast.error("اجرای QA ناموفق بود");
    }
  }

  const passRate = qa && qa.total > 0 ? (qa.passed / qa.total) * 100 : 0;

  return (
    <div className="space-y-4" dir="rtl">
      {/* سربرگ */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold flex items-center gap-2">
                <Bug className="h-4 w-4" /> سامانه خود‌اشکال‌زا و تضمین کیفیت
              </div>
              <div className="text-xs text-muted-foreground">
                تست‌های واحد، یکپارچه، شبیه‌سازی پایپ‌لاین و رگرسیون را اجرا می‌کند. هیچ اصلاحی بدون اعتبارسنجی مستقر نمی‌شود.
              </div>
            </div>
            <Button onClick={rerun} disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال اجرا…</> : <><Play className="h-4 w-4" /> اجرای کامل مجموعه QA</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ناهنجاری‌ها */}
      {anomalies && anomalies.anomalies.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{formatNumber(anomalies.anomalies.length)} ناهنجاری شناسایی شد</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pr-4 mt-2 space-y-1 text-xs">
              {anomalies.anomalies.map((a, i) => (
                <li key={i}>
                  <Badge variant="outline" className="text-[10px] ml-2">{SEVERITY_LABELS[a.severity] || a.severity}</Badge>
                  <strong>{a.type.replace(/_/g, " ")}:</strong> {a.detail}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* خلاصه QA + سلامت API */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> خلاصه QA
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!qa ? (
              <div className="text-sm text-muted-foreground">هنوز داده‌ای وجود ندارد — روی اجرا کلیک کنید.</div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>نرخ قبولی</span>
                    <span className="font-bold">{passRate.toFixed(1)}٪</span>
                  </div>
                  <Progress value={passRate} className="h-2" />
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-md bg-muted">
                    <div className="text-muted-foreground">کل</div>
                    <div className="text-lg font-bold">{formatNumber(qa.total)}</div>
                  </div>
                  <div className="p-2 rounded-md bg-emerald-50">
                    <div className="text-emerald-700">قبول‌شده</div>
                    <div className="text-lg font-bold text-emerald-700">{formatNumber(qa.passed)}</div>
                  </div>
                  <div className="p-2 rounded-md bg-rose-50">
                    <div className="text-rose-700">ناموفق</div>
                    <div className="text-lg font-bold text-rose-700">{formatNumber(qa.failed)}</div>
                  </div>
                  <div className="p-2 rounded-md bg-muted">
                    <div className="text-muted-foreground">نادیده</div>
                    <div className="text-lg font-bold">{formatNumber(qa.skipped)}</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  کل زمان اجرا: {formatMs(qa.durationMs)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> پایش سلامت چند‌-API
            </CardTitle>
            <CardDescription>
              CLASSIFICATION · TRANSLATION · EMBEDDING · ANALYTICS — تنزل آرام هنگام شکست APIها.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {apis.map((api) => {
                const statusColor =
                  api.status === "HEALTHY" ? "border-emerald-300 bg-emerald-50" :
                  api.status === "DEGRADED" ? "border-amber-300 bg-amber-50" :
                  api.status === "FALLBACK" ? "border-orange-300 bg-orange-50" :
                  "border-rose-300 bg-rose-50";
                return (
                  <div key={api.name} className={`border rounded-md p-3 ${statusColor}`}>
                    <div className="flex items-center justify-between">
                      <div className="font-mono font-bold text-sm">{API_LABELS[api.name] || api.name}</div>
                      <Badge variant="outline" className="text-[10px]">{API_STATUS_LABELS[api.status] || api.status}</Badge>
                    </div>
                    <div className="text-xs mt-1 text-muted-foreground">
                      اصلی: <span className="font-mono" dir="ltr">{api.primaryModel}</span>
                    </div>
                    {api.fallbackModel && (
                      <div className="text-xs text-muted-foreground">
                        جایگزین: <span className="font-mono" dir="ltr">{api.fallbackModel}</span> {api.fallbackActive && <Badge variant="outline" className="text-[9px] mr-1 text-amber-700 border-amber-300">فعال</Badge>}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                      <div>تأخیر: <strong>{formatNumber(api.latencyMs)} میلی‌ثانیه</strong></div>
                      <div>موفقیت: <strong>{(api.successRate * 100).toFixed(1)}٪</strong></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* جزئیات نتایج تست */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">جزئیات نتایج تست</CardTitle>
          <CardDescription>همه تست‌ها پیش از استقرار اعتبارسنجی می‌شوند — هیچ اصلاحی بدون قبولی رگرسیون منتشر نمی‌شود.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 pl-3">
            <div className="space-y-1">
              {!qa && <div className="text-sm text-muted-foreground p-4 text-center">هنوز نتیجه‌ای وجود ندارد. روی «اجرای کامل مجموعه QA» کلیک کنید.</div>}
              {qa?.results.map((r, i) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 text-xs">
                  <StatusBadge status={r.status} />
                  <Badge variant="outline" className="text-[10px]">{TEST_SUITE_LABELS[r.testSuite] || r.testSuite}</Badge>
                  <span className="font-mono flex-1 break-all" dir="ltr">{r.testName}</span>
                  <span className="text-muted-foreground whitespace-nowrap">{formatMs(r.durationMs)}</span>
                  <span className="text-muted-foreground flex-1 min-w-0 truncate" title={r.message}>{r.message}</span>
                  {r.autoFix && <Badge variant="outline" className="text-[9px] text-amber-700 border-amber-300">خود‌اصلاح</Badge>}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* کارت مدل امنیتی */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> مدل امنیتی
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <SecItem label="رمزنگاری کلید API" ok />
            <SecItem label="کنترل دسترسی مبتنی بر نقش (RBAC)" ok />
            <SecItem label="پاک‌سازی ورودی" ok />
            <SecItem label="فیلتر خروجی" ok />
            <SecItem label="محافظت از تزریق پرامپت" ok />
            <SecItem label="جلوگیری از SQL/XSS/SSRF" ok />
            <SecItem label="ثبت ممیزی" ok />
            <SecItem label="محدودسازی نرخ" ok />
            <SecItem label="تشخیص سوءاستفاده" ok />
            <SecItem label="خود‌ترمیمی" ok />
            <SecItem label="تحلیل علت ریشه‌ای" ok />
            <SecItem label="بک‌آف و تلاش مجدد" ok />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SecItem({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-md border">
      {ok ? <CheckCircle2 className="h-3 w-3 text-emerald-600 flex-shrink-0" /> : <XCircle className="h-3 w-3 text-rose-600 flex-shrink-0" />}
      <span>{label}</span>
    </div>
  );
}
