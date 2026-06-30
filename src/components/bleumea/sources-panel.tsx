"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Globe, RefreshCw, Loader2, ExternalLink, ShieldCheck, AlertTriangle,
  Search, Activity,
} from "lucide-react";
import {
  LegalityBadge, LicenseBadge, formatRelative, formatDateTime, formatNumber,
} from "./shared";

interface Source {
  id: string;
  name: string;
  url: string;
  type: string;
  region: string | null;
  language: string | null;
  description: string | null;
  termsUrl: string | null;
  licenseType: string;
  legalityScore: string;
  licenseConfidence: number;
  copyrightPolicy: string | null;
  lastLicenseScan: string | null;
  licenseScanCount: number;
  status: string;
  healthScore: number;
  lastCrawlAt: string | null;
  crawlCount: number;
  itemsIngested: number;
  itemsRejected: number;
  errorRate: number;
  lastHealthCheck: string | null;
  poemsCount: number;
  createdAt: string;
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  SEARCH_ENGINE: "موتور جستجو",
  RSS: "RSS",
  ARCHIVE: "آرشیو",
  UNIVERSITY: "دانشگاهی",
  PUBLIC_DOMAIN: "مالکیت عمومی",
  CC_REPO: "مخزن کریتیو کامنز",
  OFFICIAL_ARTIST: "وب رسمی هنرمند",
  UNKNOWN: "نامشخص",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "فعال",
  PAUSED: "متوقف",
  BANNED: "مسدودشده",
  ERROR: "خطا",
};

export function SourcesPanel() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "SAFE" | "LIMITED" | "BLOCKED">("ALL");
  const [search, setSearch] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [revalidating, setRevalidating] = useState(false);

  useEffect(() => { load(); }, [filter]);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== "ALL") params.set("legality", filter);
    fetch(`/api/bleumea/sources?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => { setSources(d.sources || []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  async function discover() {
    setDiscovering(true);
    try {
      const res = await fetch("/api/bleumea/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "discover" }),
      });
      const d = await res.json();
      const r = d.result;
      toast.success(`${formatNumber(r.total)} منبع کشف شد — ${formatNumber(r.safe)} ایمن، ${formatNumber(r.limited)} محدود، ${formatNumber(r.blocked)} مسدود (${formatNumber(r.newSources)} جدید، ${formatNumber(r.termsChanged)} تغییر شرایط)`);
      load();
    } catch {
      toast.error("کشف ناموفق بود");
    } finally {
      setDiscovering(false);
    }
  }

  async function revalidate() {
    setRevalidating(true);
    try {
      const res = await fetch("/api/bleumea/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revalidate" }),
      });
      const d = await res.json();
      const r = d.result;
      toast.success(`${formatNumber(r.scanned)} منبع بازبینی شد — ${formatNumber(r.degraded)} تغییر لایسنس شناسایی شد`);
      load();
    } catch {
      toast.error("بازبینی ناموفق بود");
    } finally {
      setRevalidating(false);
    }
  }

  const filtered = sources.filter((s) =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.url.toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    safe: sources.filter((s) => s.legalityScore === "SAFE").length,
    limited: sources.filter((s) => s.legalityScore === "LIMITED").length,
    blocked: sources.filter((s) => s.legalityScore === "BLOCKED").length,
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* کنترل‌ها */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div>
              <div className="text-sm font-semibold">عامل کشف لایسنس</div>
              <div className="text-xs text-muted-foreground">
                به‌طور پیوسته منابع قانونی جهانی را کشف و بازبینی می‌کند. بازبینی ماهانه.
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={discover} disabled={discovering} variant="default">
                {discovering ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال کشف…</> : <><Search className="h-4 w-4" /> کشف منابع</>}
              </Button>
              <Button onClick={revalidate} disabled={revalidating} variant="outline">
                {revalidating ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال بازبینی…</> : <><RefreshCw className="h-4 w-4" /> بازبینی همه</>}
              </Button>
            </div>
          </div>

          {/* شمارش‌ها */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <button
              onClick={() => setFilter("SAFE")}
              className={`p-3 rounded-md border text-right transition-colors ${filter === "SAFE" ? "bg-emerald-50 border-emerald-300" : "hover:bg-muted"}`}
            >
              <div className="text-xs text-muted-foreground">ایمن</div>
              <div className="text-xl font-bold text-emerald-700">{formatNumber(counts.safe)}</div>
              <div className="text-[10px] text-muted-foreground">دریافت کامل مجاز</div>
            </button>
            <button
              onClick={() => setFilter("LIMITED")}
              className={`p-3 rounded-md border text-right transition-colors ${filter === "LIMITED" ? "bg-amber-50 border-amber-300" : "hover:bg-muted"}`}
            >
              <div className="text-xs text-muted-foreground">محدود</div>
              <div className="text-xl font-bold text-amber-700">{formatNumber(counts.limited)}</div>
              <div className="text-[10px] text-muted-foreground">فقط متادیتا</div>
            </button>
            <button
              onClick={() => setFilter("BLOCKED")}
              className={`p-3 rounded-md border text-right transition-colors ${filter === "BLOCKED" ? "bg-rose-50 border-rose-300" : "hover:bg-muted"}`}
            >
              <div className="text-xs text-muted-foreground">مسدود</div>
              <div className="text-xl font-bold text-rose-700">{formatNumber(counts.blocked)}</div>
              <div className="text-[10px] text-muted-foreground">کاملاً حذف‌شده</div>
            </button>
          </div>

          <div className="mt-3">
            <Input
              placeholder="جستجوی منابع بر اساس نام یا آدرس…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* فهرست منابع */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" /> کاتالوگ منابع ({formatNumber(filtered.length)})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground text-sm">در حال بارگذاری…</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filtered.map((s) => (
                <SourceCard key={s.id} source={s} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SourceCard({ source: s }: { source: Source }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className={`border rounded-md p-4 ${
        s.legalityScore === "SAFE" ? "border-emerald-200 bg-emerald-50/30" :
        s.legalityScore === "LIMITED" ? "border-amber-200 bg-amber-50/30" :
        "border-rose-200 bg-rose-50/30"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate">{s.name}</div>
          <a href={s.url} target="_blank" rel="noreferrer" className="text-xs text-primary underline truncate flex items-center gap-1" dir="ltr">
            {s.url.slice(0, 60)}<ExternalLink className="h-3 w-3 inline" />
          </a>
        </div>
        <div className="flex flex-col items-end gap-1">
          <LegalityBadge score={s.legalityScore} />
          <LicenseBadge type={s.licenseType} />
        </div>
      </div>

      <div className="mt-2 text-xs text-muted-foreground line-clamp-2">
        {s.description || "—"}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
        <Badge variant="outline" className="text-[10px]">{SOURCE_TYPE_LABELS[s.type] || s.type}</Badge>
        {s.region && <Badge variant="outline" className="text-[10px]">{s.region}</Badge>}
        {s.language && <Badge variant="outline" className="text-[10px] uppercase">{s.language}</Badge>}
        <Badge variant="outline" className="text-[10px]">اشعار: {formatNumber(s.poemsCount)}</Badge>
        <Badge variant="outline" className="text-[10px]">خزش: {formatNumber(s.crawlCount)}</Badge>
      </div>

      {/* نوار سلامت */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
          <span>امتیاز سلامت</span>
          <span>{(s.healthScore * 100).toFixed(0)}٪</span>
        </div>
        <Progress value={s.healthScore * 100} className="h-1" />
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-xs text-primary hover:underline"
      >
        {expanded ? "پنهان کردن جزئیات ▲" : "نمایش جزئیات ▼"}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t space-y-2 text-xs">
          <div>
            <div className="text-muted-foreground">سیاست کپی‌رایت</div>
            <div className="mt-0.5">{s.copyrightPolicy || "—"}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-muted-foreground">اطمینان لایسنس</div>
              <div>{(s.licenseConfidence * 100).toFixed(0)}٪</div>
            </div>
            <div>
              <div className="text-muted-foreground">آخرین اسکن</div>
              <div>{formatRelative(s.lastLicenseScan)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">تعداد اسکن</div>
              <div>{formatNumber(s.licenseScanCount)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">نرخ خطا</div>
              <div>{(s.errorRate * 100).toFixed(1)}٪</div>
            </div>
            <div>
              <div className="text-muted-foreground">آخرین خزش</div>
              <div>{formatRelative(s.lastCrawlAt)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">آخرین بررسی سلامت</div>
              <div>{formatRelative(s.lastHealthCheck)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
