"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Loader2, BookOpen, ExternalLink, Sparkles, Clock, Award } from "lucide-react";
import { LicenseBadge, formatRelative } from "./shared";

interface Poem {
  id: string;
  title: string;
  author: string;
  language: string;
  country: string | null;
  genre: string | null;
  mood: string | null;
  theme: string | null;
  licenseType: string;
  legalityScore: string;
  sourceUrl: string | null;
  originalText: string | null;
  persianTranslation: string;
  qualityScore: number;
  createdAt: string;
  discoveredAt: string | null;
  isSaved: boolean;
  source: { name: string; url: string } | null;
}

const LANG_NAMES: Record<string, string> = {
  en: "انگلیسی", fa: "فارسی", fr: "فرانسوی", es: "اسپانیایی", de: "آلمانی",
  it: "ایتالیایی", ru: "روسی", ja: "ژاپنی", zh: "چینی",
};

type SortMode = "newest" | "discovered" | "quality";

export function LibraryPanel() {
  const [items, setItems] = useState<Poem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("newest");
  const [selected, setSelected] = useState<Poem | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ pageSize: "100", sort });
    if (search) params.set("q", search);
    fetch(`/api/bleumea/poems?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => { setItems(d.items || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [search, sort]);

  const sortButtons: Array<{ id: SortMode; label: string; icon: React.ReactNode }> = [
    { id: "newest", label: "جدیدترین", icon: <Clock className="h-3 w-3" /> },
    { id: "discovered", label: "کشف‌شده", icon: <Sparkles className="h-3 w-3" /> },
    { id: "quality", label: "بهترین کیفیت", icon: <Award className="h-3 w-3" /> },
  ];

  return (
    <div className="space-y-4">
      {/* جستجو */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو در کتابخانه… (نام شعر، نویسنده، کلمه)"
          className="pr-10 h-11 text-sm bg-background shadow-sm"
        />
      </div>

      {/* شمارش + مرتب‌سازی */}
      <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
        <span>{items.length.toLocaleString("fa-IR")} شعر در کتابخانه</span>
        <div className="flex items-center gap-1">
          {sortButtons.map((s) => (
            <Button
              key={s.id}
              size="sm"
              variant={sort === s.id ? "default" : "ghost"}
              className="h-7 text-xs"
              onClick={() => setSort(s.id)}
            >
              {s.icon}
              {s.label}
            </Button>
          ))}
          {search && <button onClick={() => setSearch("")} className="text-primary hover:underline mr-2">پاک کردن جستجو</button>}
        </div>
      </div>

      {/* شبکه کارت‌ها */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> در حال بارگذاری کتابخانه…
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">شعری یافت نشد.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => {
            // تشخیص شعر «تازه کشف‌شده» — discoveredAt در ۱۰ دقیقه گذشته باشه
            const isFresh = p.discoveredAt &&
              (Date.now() - new Date(p.discoveredAt).getTime()) < 10 * 60 * 1000;
            return (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className={`text-right p-5 rounded-xl border bg-card hover:shadow-md hover:border-primary/30 transition-all group relative ${isFresh ? "border-primary/40 bg-primary/5" : ""}`}
            >
              {isFresh && (
                <div className="absolute -top-2 -left-2 bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5" /> تازه
                </div>
              )}
              {/* عنوان و نویسنده */}
              <h3 className="font-bold text-base leading-snug group-hover:text-primary transition-colors line-clamp-2">
                {p.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{p.author}</p>

              {/* پیش‌نمایش ترجمه فارسی */}
              <p dir="rtl" className="mt-3 text-sm text-foreground/80 line-clamp-3 leading-loose">
                {p.persianTranslation}
              </p>

              {/* برچسب‌ها */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">
                  {LANG_NAMES[p.language] || p.language}
                </Badge>
                <LicenseBadge type={p.licenseType} />
                <span className="text-[10px] text-muted-foreground mr-auto">
                  {p.discoveredAt
                    ? `کشف ${formatRelative(p.discoveredAt)}`
                    : formatRelative(p.createdAt)}
                </span>
              </div>
            </button>
            );
          })}
        </div>
      )}

      {/* مودال جزئیات */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl">{selected?.title}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selected?.author} · {selected && (LANG_NAMES[selected.language] || selected.language)}
              {selected?.country && ` · ${selected.country}`}
            </p>
          </DialogHeader>
          {selected && (
            <div className="overflow-y-auto flex-1 -mx-2 px-2 space-y-4">
              {/* برچسب‌ها */}
              <div className="flex flex-wrap items-center gap-2">
                <LicenseBadge type={selected.licenseType} />
                {selected.genre && <Badge variant="outline" className="text-[10px]">{selected.genre}</Badge>}
                {selected.mood && <Badge variant="outline" className="text-[10px]">{selected.mood}</Badge>}
                {selected.theme && <Badge variant="outline" className="text-[10px]">{selected.theme}</Badge>}
              </div>

              {/* ترجمه فارسی */}
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">ترجمه فارسی</div>
                <div dir="rtl" className="p-4 rounded-lg bg-primary/5 border border-primary/10 whitespace-pre-wrap text-lg leading-loose">
                  {selected.persianTranslation}
                </div>
              </div>

              {/* متن اصلی — فقط در صورت مجاز بودن لایسنس */}
              {selected.originalText && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-2">متن اصلی</div>
                  <div dir="ltr" className="p-4 rounded-lg bg-muted whitespace-pre-wrap font-mono text-xs">
                    {selected.originalText}
                  </div>
                </div>
              )}

              {!selected.originalText && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  ⚠️ متن اصلی به دلیل محدودیت لایسنس ذخیره نشده است.
                  {selected.sourceUrl && (
                    <a href={selected.sourceUrl} target="_blank" rel="noreferrer" className="underline mr-2 inline-flex items-center gap-1" dir="ltr">
                      مشاهده در منبع <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}

              {/* منبع */}
              {selected.source && (
                <div className="text-xs text-muted-foreground">
                  منبع: <span className="text-foreground">{selected.source.name}</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
