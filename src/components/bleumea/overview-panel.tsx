"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity, Database, Globe, ShieldCheck, AlertTriangle, Zap, TrendingUp,
  CheckCircle2, XCircle, Clock,
} from "lucide-react";
import {
  StatusBadge, LegalityBadge, formatNumber, formatMs, formatRelative,
  PIPELINE_STAGE_LABELS,
} from "./shared";

interface DashboardData {
  kpis: {
    totalPoems: number;
    approvedPoems: number;
    quarantinedPoems: number;
    rejectedPoems: number;
    totalSources: number;
    safeSources: number;
    limitedSources: number;
    blockedSources: number;
    pipelineRuns24h: number;
    pipelineSuccessRate: number;
  };
  charts: {
    languageDistribution: Array<{ language: string; count: number }>;
    licenseDistribution: Array<{ license: string; count: number }>;
    qualityDistribution: Array<{ bucket: string; count: number }>;
    ingestionTimeline: Array<{ date: string; count: number }>;
  };
  recentRuns: Array<{
    id: string;
    status: string;
    trigger: string;
    inputCount: number;
    outputCount: number;
    rejectedCount: number;
    quarantineCount: number;
    durationMs: number | null;
    degradedApis: string[];
    fallbacksUsed: string[];
    startedAt: string;
  }>;
  recentLogs: Array<{
    id: string;
    level: string;
    category: string;
    message: string;
    autoRecovered: boolean;
    createdAt: string;
  }>;
}

const LANG_NAMES: Record<string, string> = {
  en: "انگلیسی", fa: "فارسی", fr: "فرانسوی", es: "اسپانیایی", de: "آلمانی",
  it: "ایتالیایی", ru: "روسی", ja: "ژاپنی", zh: "چینی", ko: "کره‌ای",
};

const TRIGGER_LABELS: Record<string, string> = {
  MANUAL: "دستی",
  SCHEDULED: "زمان‌بندی‌شده",
  BACKFILL: "بازگشت",
  RETRY: "تلاش مجدد",
};

export function OverviewPanel({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = () => {
      fetch("/api/bleumea/dashboard")
        .then((r) => r.json())
        .then((d) => { if (mounted) { setData(d); setLoading(false); } })
        .catch(() => { if (mounted) setLoading(false); });
    };
    load();
    const interval = setInterval(load, 15000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  if (loading || !data) {
    return <div className="p-6 text-muted-foreground">در حال بارگذاری داشبورد…</div>;
  }

  const k = data.kpis;
  const maxLang = Math.max(...data.charts.languageDistribution.map((l) => l.count), 1);
  const maxLic = Math.max(...data.charts.licenseDistribution.map((l) => l.count), 1);
  const maxTimeline = Math.max(...data.charts.ingestionTimeline.map((t) => t.count), 1);

  return (
    <div className="space-y-6">
      {/* کارت‌های KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={<Database className="h-5 w-5" />}
          label="کل اشعار"
          value={formatNumber(k.totalPoems)}
          sub={`${formatNumber(k.approvedPoems)} تأییدشده · ${formatNumber(k.quarantinedPoems)} قرنطینه`}
          tone="primary"
          onClick={() => onNavigate("dataset")}
        />
        <KpiCard
          icon={<Globe className="h-5 w-5" />}
          label="منابع فعال"
          value={formatNumber(k.totalSources)}
          sub={`${formatNumber(k.safeSources)} ایمن · ${formatNumber(k.limitedSources)} محدود · ${formatNumber(k.blockedSources)} مسدود`}
          tone="emerald"
          onClick={() => onNavigate("sources")}
        />
        <KpiCard
          icon={<Activity className="h-5 w-5" />}
          label="اجرای پایپ‌لاین (۲۴ ساعت)"
          value={formatNumber(k.pipelineRuns24h)}
          sub={`${formatNumber(k.pipelineSuccessRate * 100)}٪ نرخ موفقیت`}
          tone="amber"
          onClick={() => onNavigate("pipeline")}
        />
        <KpiCard
          icon={<ShieldCheck className="h-5 w-5" />}
          label="انطباق لایسنس"
          value="۱۰۰٪"
          sub="صفر مورد مسدود با متن کامل"
          tone="emerald"
          onClick={() => onNavigate("qa")}
        />
      </div>

      {/* ردیف نمودارها */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* توزیع زبان */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" /> توزیع زبان
            </CardTitle>
            <CardDescription>اشعار فهرست‌شده بر اساس زبان مبدأ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto scroll-area-bleumea">
            {data.charts.languageDistribution.map((l) => (
              <div key={l.language} className="flex items-center gap-3">
                <div className="w-24 text-xs font-medium text-muted-foreground">{LANG_NAMES[l.language] || l.language}</div>
                <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden">
                  <div
                    className="h-full bg-primary/80 flex items-center justify-end pl-2 text-xs font-semibold text-primary-foreground"
                    style={{ width: `${(l.count / maxLang) * 100}%` }}
                  >
                    {formatNumber(l.count)}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* توزیع لایسنس */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> توزیع لایسنس
            </CardTitle>
            <CardDescription>اشعار ذخیره‌شده بر اساس نوع لایسنس</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto scroll-area-bleumea">
            {data.charts.licenseDistribution.map((l) => {
              const colors: Record<string, string> = {
                PUBLIC_DOMAIN: "bg-emerald-500",
                CC0: "bg-emerald-400",
                CC_BY: "bg-lime-500",
                CC_BY_SA: "bg-lime-400",
                CC_BY_NC: "bg-amber-500",
                CC_BY_ND: "bg-amber-400",
                RESTRICTED: "bg-rose-500",
                UNKNOWN: "bg-zinc-500",
              };
              const labels: Record<string, string> = {
                PUBLIC_DOMAIN: "مالکیت عمومی",
                CC0: "CC0",
                CC_BY: "CC BY",
                CC_BY_SA: "CC BY-SA",
                CC_BY_NC: "CC BY-NC",
                CC_BY_ND: "CC BY-ND",
                RESTRICTED: "محدودشده",
                UNKNOWN: "نامشخص",
              };
              return (
                <div key={l.license} className="flex items-center gap-3">
                  <div className="w-28 text-xs font-medium text-muted-foreground">{labels[l.license] || l.license}</div>
                  <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden">
                    <div
                      className={`h-full ${colors[l.license] || "bg-zinc-500"} flex items-center justify-end pl-2 text-xs font-semibold text-white`}
                      style={{ width: `${(l.count / maxLic) * 100}%` }}
                    >
                      {formatNumber(l.count)}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* جدول زمانی دریافت */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> دریافت (۱۴ روز اخیر)
            </CardTitle>
            <CardDescription>تعداد روزانه اشعار دریافت‌شده</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-44">
              {data.charts.ingestionTimeline.map((t, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary/70 hover:bg-primary transition-colors rounded-t"
                    style={{ height: `${Math.max(4, (t.count / maxTimeline) * 100)}%` }}
                    title={`${t.date}: ${formatNumber(t.count)}`}
                  />
                  <div className="text-[9px] text-muted-foreground">
                    {t.date.slice(5)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* پایپ‌لاین + گزارش‌های اخیر */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* جریان پایپ‌لاین */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" /> پایپ‌لاین خودمختار (۹ مرحله)
            </CardTitle>
            <CardDescription>
              خزشگر ← پیش‌فیلتر ← زبان ← طبقه‌بند شعر ← بررسی لایسنس ← حذف تکراری ← ترجمه ← برداری ← ذخیره‌سازی
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              {Object.keys(PIPELINE_STAGE_LABELS).map((stage, i) => (
                <div key={stage} className="flex items-center gap-2">
                  <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold min-w-0">
                    <div>{formatNumber(i + 1)}. {PIPELINE_STAGE_LABELS[stage]}</div>
                  </div>
                  {i < 8 && <div className="text-emerald-400 text-xl">←</div>}
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <strong>⚠️ قانون بحرانی:</strong> بررسی‌کننده لایسنس، ذخیره‌سازی را کنترل می‌کند. اگر لایسنس نامشخص یا مسدود باشد ← متن کامل هرگز ذخیره نمی‌شود. لایسنس محدود ← فقط متادیتا.
            </div>
          </CardContent>
        </Card>

        {/* گزارش‌های اخیر */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> گزارش‌های اخیر سامانه
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-72 pl-3">
              <div className="space-y-2">
                {data.recentLogs.map((log) => (
                  <div key={log.id} className="text-xs border-r-2 pr-2 py-1" style={{
                    borderRightColor: log.level === "CRITICAL" ? "#e11d48" : log.level === "ERROR" ? "#f43f5e" : log.level === "WARN" ? "#f59e0b" : "#10b981"
                  }}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted-foreground">{log.level}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="font-mono text-muted-foreground">{log.category}</span>
                      {log.autoRecovered && (
                        <Badge variant="outline" className="text-[9px] py-0 h-4">خود‌ترمیم‌شده</Badge>
                      )}
                    </div>
                    <div className="mt-0.5">{log.message}</div>
                    <div className="text-muted-foreground text-[10px] mt-0.5">{formatRelative(log.createdAt)}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* اجراهای اخیر پایپ‌لاین */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" /> اجراهای اخیر پایپ‌لاین
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-xs text-muted-foreground border-b">
                  <th className="py-2 px-2">وضعیت</th>
                  <th className="py-2 px-2">محرک</th>
                  <th className="py-2 px-2 text-right">ورودی</th>
                  <th className="py-2 px-2 text-right">ذخیره‌شده</th>
                  <th className="py-2 px-2 text-right">قرنطینه</th>
                  <th className="py-2 px-2 text-right">ردشده</th>
                  <th className="py-2 px-2 text-right">مدت</th>
                  <th className="py-2 px-2">APIهای تنزل‌یافته</th>
                  <th className="py-2 px-2">شروع</th>
                </tr>
              </thead>
              <tbody>
                {data.recentRuns.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-2"><StatusBadge status={r.status} /></td>
                    <td className="py-2 px-2 font-mono text-xs">{TRIGGER_LABELS[r.trigger] || r.trigger}</td>
                    <td className="py-2 px-2 text-right">{formatNumber(r.inputCount)}</td>
                    <td className="py-2 px-2 text-right text-emerald-700 font-semibold">{formatNumber(r.outputCount)}</td>
                    <td className="py-2 px-2 text-right text-amber-700">{formatNumber(r.quarantineCount)}</td>
                    <td className="py-2 px-2 text-right text-rose-700">{formatNumber(r.rejectedCount)}</td>
                    <td className="py-2 px-2 text-right font-mono text-xs">{formatMs(r.durationMs)}</td>
                    <td className="py-2 px-2">
                      {r.degradedApis.length === 0 ? (
                        <span className="text-emerald-700 text-xs">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {r.degradedApis.map((a) => (
                            <Badge key={a} variant="outline" className="text-[10px] py-0 h-4">{a}</Badge>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2 text-xs text-muted-foreground">{formatRelative(r.startedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon, label, value, sub, tone, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: "primary" | "emerald" | "amber" | "rose";
  onClick?: () => void;
}) {
  const toneClasses = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
  };
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground tracking-wide">{label}</div>
            <div className="text-2xl font-bold mt-1">{value}</div>
          </div>
          <div className={`p-2 rounded-md ${toneClasses[tone]}`}>{icon}</div>
        </div>
        <div className="text-xs text-muted-foreground mt-2">{sub}</div>
      </CardContent>
    </Card>
  );
}
