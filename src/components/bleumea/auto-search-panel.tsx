"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Radar, Loader2, Sparkles, ExternalLink, CheckCircle2,
} from "lucide-react";
import { LicenseBadge } from "./shared";

interface DiscoveredPoem {
  id: string;
  title: string;
  author: string;
  language: string;
  persianTranslation: string;
  originalText: string | null;
  licenseType: string;
  legalityScore: string;
  qualityScore: number;
  sourceUrl: string | null;
  sourceName: string | null;
  discoveredAt: string | null;
}

interface DiscoverResponse {
  found: boolean;
  isNewDiscovery?: boolean;
  totalInLibrary?: number;
  totalDiscovered?: number;
  poem?: DiscoveredPoem;
}

const LANG_NAMES: Record<string, string> = {
  en: "انگلیسی", fa: "فارسی", fr: "فرانسوی", es: "اسپانیایی", de: "آلمانی",
  it: "ایتالیایی", ru: "روسی", ja: "ژاپنی", zh: "چینی",
};

interface AutoSearchPanelProps {
  trigger: number; // هر بار افزایش → کشف جدید
  secondsLeft: number;
  onReset: () => void;
}

export function AutoSearchPanel({ trigger, secondsLeft, onReset }: AutoSearchPanelProps) {
  const [discovered, setDiscovered] = useState<DiscoveredPoem[]>([]);
  const [searching, setSearching] = useState(false);
  const [totalFound, setTotalFound] = useState(0);
  const [totalInLibrary, setTotalInLibrary] = useState(0);
  const [totalDiscovered, setTotalDiscovered] = useState(0);
  const [lastWasNew, setLastWasNew] = useState(false);
  const [selected, setSelected] = useState<DiscoveredPoem | null>(null);
  const discoveredRef = useRef<DiscoveredPoem[]>([]);

  // Keep ref in sync inside an effect (not during render)
  useEffect(() => {
    discoveredRef.current = discovered;
  }, [discovered]);

  // تابع مشترک برای پردازش پاسخ discover
  function handleDiscoverResponse(d: DiscoverResponse) {
    if (d.found && d.poem) {
      setDiscovered((prev) => {
        // جلوگیری از تکرار در لیست نمایش
        if (prev.some((p) => p.id === d.poem!.id)) return prev;
        return [d.poem!, ...prev].slice(0, 50);
      });
      setTotalFound((n) => n + 1);
      setLastWasNew(!!d.isNewDiscovery);
      if (typeof d.totalInLibrary === "number") setTotalInLibrary(d.totalInLibrary);
      if (typeof d.totalDiscovered === "number") setTotalDiscovered(d.totalDiscovered);
    }
  }

  // وقتی trigger تغییر کند (یعنی تایمر به ۰ رسید) → یک شعر جدید کشف کن
  useEffect(() => {
    if (trigger === 0) return; // اولین رندر را رد کن

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearching(true);

    const excludeIds = discoveredRef.current.map((p) => p.id);
    const url = `/api/bleumea/discover${excludeIds.length ? `?exclude=${excludeIds.join(",")}` : ""}`;

    fetch(url)
      .then((r) => r.json())
      .then((d: DiscoverResponse) => {
        if (cancelled) return;
        handleDiscoverResponse(d);
        setSearching(false);
      })
      .catch(() => { if (!cancelled) setSearching(false); });

    return () => { cancelled = true; };
  }, [trigger]);

  // کشف اولیه هنگام بارگذاری
  useEffect(() => {
    fetch("/api/bleumea/discover")
      .then((r) => r.json())
      .then((d: DiscoverResponse) => {
        handleDiscoverResponse(d);
        if (!d.found) {
          setTotalFound(0);
        } else {
          setTotalFound(1);
        }
      })
      .catch(() => {});
  }, []);

  // کشف دستی (با کلیک کاربر)
  function discoverNow() {
    onReset(); // تایمر را ریست کن
    setSearching(true);
    const excludeIds = discoveredRef.current.map((p) => p.id);
    const url = `/api/bleumea/discover${excludeIds.length ? `?exclude=${excludeIds.join(",")}` : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((d: DiscoverResponse) => {
        handleDiscoverResponse(d);
        setSearching(false);
      })
      .catch(() => setSearching(false));
  }

  return (
    <div className="space-y-4">
      {/* کارت وضعیت رادار */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`relative w-14 h-14 flex items-center justify-center rounded-full bg-primary/10 ${searching ? "bleumea-pulse" : ""}`}>
                <Radar className={`h-7 w-7 text-primary ${searching ? "animate-spin" : ""}`} style={{ animationDuration: "3s" }} />
              </div>
              <div>
                <div className="font-bold text-base">
                  {searching ? "در حال جستجو…" : "رادار فعال"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {searching
                    ? "در حال کشف شعر/ترانهٔ جدید…"
                    : `جستجوی بعدی تا ${secondsLeft.toLocaleString("fa-IR")} ثانیه دیگر`}
                </div>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {totalFound.toLocaleString("fa-IR")}
                </div>
                <div className="text-[10px] text-muted-foreground">کشف در این نشست</div>
              </div>
              <div className="h-10 w-px bg-border"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {totalInLibrary.toLocaleString("fa-IR")}
                </div>
                <div className="text-[10px] text-muted-foreground">در کتابخانه</div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <Button onClick={discoverNow} disabled={searching} size="sm" variant="outline">
              {searching
                ? <><Loader2 className="h-3 w-3 animate-spin" /> در حال جستجو</>
                : <><Sparkles className="h-3 w-3" /> کشف فوری</>
              }
            </Button>
            <Button
              onClick={() => { setDiscovered([]); setTotalFound(0); }}
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
            >
              پاک‌سازی لیست نمایش
            </Button>
            {lastWasNew && !searching && (
              <Badge className="text-[10px] bg-emerald-500 text-white">
                <CheckCircle2 className="h-3 w-3 ml-1" /> شعر جدید به کتابخانه اضافه شد
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* لیست اشعار کشف‌شده */}
      {discovered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Radar className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">هنوز شعری کشف نشده است.</p>
          <p className="text-xs mt-1">هر ۳۰ ثانیه یک شعر جدید به‌طور خودکار اضافه می‌شود.</p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-340px)] min-h-[300px]">
          <div className="space-y-3 pr-2">
            {discovered.map((p, idx) => (
              <Card
                key={p.id}
                className={`hover:shadow-md transition-all cursor-pointer ${idx === 0 ? "border-primary/30 bg-primary/5" : ""}`}
                onClick={() => setSelected(p)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {idx === 0 && !searching && (
                          <Badge className="text-[9px] py-0 h-4 bg-primary text-primary-foreground">
                            <Sparkles className="h-2.5 w-2.5 ml-1" /> تازه
                          </Badge>
                        )}
                        <h3 className="font-bold text-sm truncate">{p.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.author}</p>
                      <p dir="rtl" className="mt-2 text-sm text-foreground/80 line-clamp-2 leading-loose">
                        {p.persianTranslation}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Badge variant="outline" className="text-[10px]">
                        {LANG_NAMES[p.language] || p.language}
                      </Badge>
                      <LicenseBadge type={p.licenseType} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* مودال جزئیات شعر کشف‌شده */}
      {selected && (
        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                {selected.title}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {selected.author} · {LANG_NAMES[selected.language] || selected.language}
              </p>
            </DialogHeader>
            <div className="overflow-y-auto flex-1 -mx-2 px-2 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[10px]">کیفیت: {(selected.qualityScore * 100).toFixed(0)}٪</Badge>
                <LicenseBadge type={selected.licenseType} />
                {selected.sourceName && (
                  <Badge variant="outline" className="text-[10px]">{selected.sourceName}</Badge>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">ترجمه فارسی</div>
                <div dir="rtl" className="p-4 rounded-lg bg-primary/5 border border-primary/10 whitespace-pre-wrap text-lg leading-loose">
                  {selected.persianTranslation}
                </div>
              </div>

              {selected.originalText && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-2">متن اصلی</div>
                  <div dir="ltr" className="p-4 rounded-lg bg-muted whitespace-pre-wrap font-mono text-xs">
                    {selected.originalText}
                  </div>
                </div>
              )}

              {selected.sourceUrl && (
                <a href={selected.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline inline-flex items-center gap-1" dir="ltr">
                  مشاهده در منبع <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
