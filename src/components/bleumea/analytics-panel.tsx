"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart3, TrendingUp, Users, Globe, Tag, Activity, CheckCircle2, XCircle,
} from "lucide-react";
import { StatusBadge, formatMs, formatRelative, formatNumber } from "./shared";

interface AnalyticsData {
  events: {
    total: number;
    ingest: number;
    reject: number;
    translate: number;
    error: number;
    recover: number;
  };
  distributions: {
    topAuthors: Array<{ author: string; count: number }>;
    moods: Array<{ mood: string; count: number }>;
    themes: Array<{ theme: string; count: number }>;
    countries: Array<{ country: string; count: number }>;
    genres: Array<{ genre: string; count: number }>;
  };
  languageStats: Array<{
    language: string;
    count: number;
    avgQuality: number | null;
    avgPoetryConfidence: number | null;
    avgTranslationQuality: number | null;
  }>;
  recentQa: Array<{
    id: string;
    testSuite: string;
    testName: string;
    status: string;
    durationMs: number | null;
    message: string | null;
    autoFix: boolean;
    createdAt: string;
  }>;
}

const LANG_NAMES: Record<string, string> = {
  en: "انگلیسی", fa: "فارسی", fr: "فرانسوی", es: "اسپانیایی", de: "آلمانی",
  it: "ایتالیایی", ru: "روسی", ja: "ژاپنی", zh: "چینی",
};

const MOOD_LABELS: Record<string, string> = {
  melancholic: "مالیخولیایی", ecstatic: "وجدان‌آور", romantic: "عاشقانه",
  elegiac: "مرثیه‌ای", mystical: "عرفانی", rebellious: "عصیانگر",
  contemplative: "تأمل‌برانگیز", joyful: "شاد",
};

const THEME_LABELS: Record<string, string> = {
  love: "عشق", loss: "از دست دادن", nature: "طبیعت", mysticism: "عرفان",
  war: "جنگ", exile: "تبعید", identity: "هویت", time: "زمان",
  death: "مرگ", beauty: "زیبایی",
};

const GENRE_LABELS: Record<string, string> = {
  ghazal: "غزل",
  haiku: "هایکو",
  lyric: "غنایی",
  "free-verse": "نو",
  shi: "شی",
};

export function AnalyticsPanel() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bleumea/analytics")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div className="p-6 text-muted-foreground">در حال بارگذاری تحلیل‌ها…</div>;
  }

  const maxAuthor = Math.max(...data.distributions.topAuthors.map((a) => a.count), 1);
  const maxMood = Math.max(...data.distributions.moods.map((m) => m.count), 1);
  const maxTheme = Math.max(...data.distributions.themes.map((t) => t.count), 1);
  const maxGenre = Math.max(...data.distributions.genres.map((g) => g.count), 1);

  return (
    <div className="space-y-4" dir="rtl">
      {/* شمارنده‌های رویداد */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <EventCard icon={<Activity className="h-4 w-4" />} label="کل رویدادها" value={data.events.total} tone="primary" />
        <EventCard icon={<TrendingUp className="h-4 w-4" />} label="دریافت" value={data.events.ingest} tone="emerald" />
        <EventCard icon={<XCircle className="h-4 w-4" />} label="رد" value={data.events.reject} tone="rose" />
        <EventCard icon={<CheckCircle2 className="h-4 w-4" />} label="ترجمه" value={data.events.translate} tone="emerald" />
        <EventCard icon={<XCircle className="h-4 w-4" />} label="خطاها" value={data.events.error} tone="amber" />
        <EventCard icon={<Activity className="h-4 w-4" />} label="خود‌ترمیمی" value={data.events.recover} tone="primary" />
      </div>

      {/* توزیع‌ها */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DistributionCard
          icon={<Users className="h-4 w-4" />}
          title="برترین نویسندگان"
          data={data.distributions.topAuthors.map((a) => ({ label: a.author, count: a.count }))}
          max={maxAuthor}
        />
        <DistributionCard
          icon={<Tag className="h-4 w-4" />}
          title="حال‌وهواها"
          data={data.distributions.moods.map((m) => ({ label: MOOD_LABELS[m.mood] || m.mood, count: m.count }))}
          max={maxMood}
        />
        <DistributionCard
          icon={<Tag className="h-4 w-4" />}
          title="تم‌ها"
          data={data.distributions.themes.map((t) => ({ label: THEME_LABELS[t.theme] || t.theme, count: t.count }))}
          max={maxTheme}
        />
        <DistributionCard
          icon={<Tag className="h-4 w-4" />}
          title="ژانرها"
          data={data.distributions.genres.map((g) => ({ label: GENRE_LABELS[g.genre] || g.genre, count: g.count }))}
          max={maxGenre}
        />
      </div>

      {/* جدول آمار به ازای زبان */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" /> آمار کیفیت به ازای زبان
          </CardTitle>
          <CardDescription>میانگین معیارهای کیفیت در زبان‌های فهرست‌شده</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-xs text-muted-foreground border-b">
                  <th className="py-2 px-2">زبان</th>
                  <th className="py-2 px-2 text-right">اشعار</th>
                  <th className="py-2 px-2 text-right">کیفیت میانگین</th>
                  <th className="py-2 px-2 text-right">اطمینان شعر</th>
                  <th className="py-2 px-2 text-right">کیفیت ترجمه</th>
                </tr>
              </thead>
              <tbody>
                {data.languageStats.map((l) => (
                  <tr key={l.language} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-2"><Badge variant="outline">{LANG_NAMES[l.language] || l.language}</Badge></td>
                    <td className="py-2 px-2 text-right">{formatNumber(l.count)}</td>
                    <td className="py-2 px-2 text-right font-mono text-xs">{l.avgQuality ? (l.avgQuality * 100).toFixed(0) + "٪" : "—"}</td>
                    <td className="py-2 px-2 text-right font-mono text-xs">{l.avgPoetryConfidence ? (l.avgPoetryConfidence * 100).toFixed(0) + "٪" : "—"}</td>
                    <td className="py-2 px-2 text-right font-mono text-xs">{l.avgTranslationQuality ? (l.avgTranslationQuality * 100).toFixed(0) + "٪" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* QA اخیر */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> نتایج اخیر تست QA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-72 pl-3">
            <div className="space-y-1">
              {data.recentQa.map((q) => (
                <div key={q.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 text-xs">
                  <StatusBadge status={q.status} />
                  <Badge variant="outline" className="text-[10px]">{q.testSuite}</Badge>
                  <span className="font-mono flex-1 truncate" dir="ltr">{q.testName}</span>
                  <span className="text-muted-foreground font-mono">{formatMs(q.durationMs)}</span>
                  <span className="text-muted-foreground">{formatRelative(q.createdAt)}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function EventCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "primary" | "emerald" | "amber" | "rose" }) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
  };
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${tones[tone]}`}>{icon}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-muted-foreground truncate">{label}</div>
            <div className="text-lg font-bold">{formatNumber(value)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DistributionCard({
  icon, title, data, max,
}: {
  icon: React.ReactNode;
  title: string;
  data: Array<{ label: string; count: number }>;
  max: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">{icon} {title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-60 overflow-y-auto scroll-area-bleumea">
        {data.length === 0 && <div className="text-sm text-muted-foreground">هنوز داده‌ای وجود ندارد</div>}
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-3">
            <div className="w-28 text-xs truncate" title={d.label}>{d.label}</div>
            <div className="flex-1 h-5 bg-muted rounded-md overflow-hidden">
              <div
                className="h-full bg-primary/70 flex items-center justify-end pl-2 text-xs font-semibold text-primary-foreground"
                style={{ width: `${(d.count / max) * 100}%` }}
              >
                {formatNumber(d.count)}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
