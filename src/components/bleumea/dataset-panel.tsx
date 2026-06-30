"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Database, Search, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import {
  StatusBadge, LegalityBadge, LicenseBadge, formatRelative, formatNumber,
} from "./shared";

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
  licenseConfidence: number;
  legalityScore: string;
  sourceUrl: string | null;
  originalText: string | null;
  persianTranslation: string;
  poetryConfidence: number;
  translationQuality: number;
  duplicateScore: number;
  qualityScore: number;
  status: string;
  version: number;
  createdAt: string;
  source: { name: string; url: string } | null;
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

export function DatasetPanel() {
  const [items, setItems] = useState<Poem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState({ language: "", licenseType: "", legalityScore: "", status: "", q: "" });
  const [selected, setSelected] = useState<Poem | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    let cancelled = false;
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "20");
    if (filter.language) params.set("language", filter.language);
    if (filter.licenseType) params.set("licenseType", filter.licenseType);
    if (filter.legalityScore) params.set("legalityScore", filter.legalityScore);
    if (filter.status) params.set("status", filter.status);
    if (filter.q) params.set("q", filter.q);
    fetch(`/api/bleumea/poems?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setItems(d.items || []);
        setPagination(d.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 0 });
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, filter]);

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <Input
              placeholder="جستجوی عنوان/نویسنده…"
              value={filter.q}
              onChange={(e) => { setFilter({ ...filter, q: e.target.value }); setPage(1); }}
              className="text-sm"
            />
            <Select value={filter.language || "ALL"} onValueChange={(v) => { setFilter({ ...filter, language: v === "ALL" ? "" : v }); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="زبان" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">همه زبان‌ها</SelectItem>
                <SelectItem value="en">انگلیسی</SelectItem>
                <SelectItem value="fa">فارسی</SelectItem>
                <SelectItem value="fr">فرانسوی</SelectItem>
                <SelectItem value="es">اسپانیایی</SelectItem>
                <SelectItem value="de">آلمانی</SelectItem>
                <SelectItem value="it">ایتالیایی</SelectItem>
                <SelectItem value="ru">روسی</SelectItem>
                <SelectItem value="ja">ژاپنی</SelectItem>
                <SelectItem value="zh">چینی</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filter.legalityScore || "ALL"} onValueChange={(v) => { setFilter({ ...filter, legalityScore: v === "ALL" ? "" : v }); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="قانونی بودن" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">همه</SelectItem>
                <SelectItem value="SAFE">ایمن</SelectItem>
                <SelectItem value="LIMITED">محدود</SelectItem>
                <SelectItem value="BLOCKED">مسدود</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filter.licenseType || "ALL"} onValueChange={(v) => { setFilter({ ...filter, licenseType: v === "ALL" ? "" : v }); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="لایسنس" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">همه لایسنس‌ها</SelectItem>
                <SelectItem value="PUBLIC_DOMAIN">مالکیت عمومی</SelectItem>
                <SelectItem value="CC0">CC0</SelectItem>
                <SelectItem value="CC_BY">CC BY</SelectItem>
                <SelectItem value="CC_BY_SA">CC BY-SA</SelectItem>
                <SelectItem value="CC_BY_NC">CC BY-NC</SelectItem>
                <SelectItem value="CC_BY_ND">CC BY-ND</SelectItem>
                <SelectItem value="RESTRICTED">محدودشده</SelectItem>
                <SelectItem value="UNKNOWN">نامشخص</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filter.status || "ALL"} onValueChange={(v) => { setFilter({ ...filter, status: v === "ALL" ? "" : v }); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="وضعیت" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">همه</SelectItem>
                <SelectItem value="APPROVED">تأییدشده</SelectItem>
                <SelectItem value="QUARANTINE">قرنطینه</SelectItem>
                <SelectItem value="REJECTED">ردشده</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setFilter({ language: "", licenseType: "", legalityScore: "", status: "", q: "" }); setPage(1); }}>
              بازنشانی
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" /> مجموعه‌داده ({formatNumber(pagination.total)} مورد)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground text-sm p-8 text-center">در حال بارگذاری…</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-right text-xs text-muted-foreground border-b">
                      <th className="py-2 px-2">عنوان</th>
                      <th className="py-2 px-2">نویسنده</th>
                      <th className="py-2 px-2">زبان</th>
                      <th className="py-2 px-2">لایسنس</th>
                      <th className="py-2 px-2">قانونی</th>
                      <th className="py-2 px-2">وضعیت</th>
                      <th className="py-2 px-2 text-right">کیفیت</th>
                      <th className="py-2 px-2 text-right">اطمینان</th>
                      <th className="py-2 px-2">ساخته‌شده</th>
                      <th className="py-2 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p) => (
                      <tr key={p.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-2 font-medium truncate max-w-32">{p.title}</td>
                        <td className="py-2 px-2 text-muted-foreground truncate max-w-32">{p.author}</td>
                        <td className="py-2 px-2"><Badge variant="outline" className="text-[10px]">{LANG_NAMES[p.language] || p.language}</Badge></td>
                        <td className="py-2 px-2"><LicenseBadge type={p.licenseType} /></td>
                        <td className="py-2 px-2"><LegalityBadge score={p.legalityScore} /></td>
                        <td className="py-2 px-2"><StatusBadge status={p.status} /></td>
                        <td className="py-2 px-2 text-right font-mono text-xs">{(p.qualityScore * 100).toFixed(0)}٪</td>
                        <td className="py-2 px-2 text-right font-mono text-xs">{(p.poetryConfidence * 100).toFixed(0)}٪</td>
                        <td className="py-2 px-2 text-xs text-muted-foreground">{formatRelative(p.createdAt)}</td>
                        <td className="py-2 px-2">
                          <Button size="sm" variant="ghost" onClick={() => setSelected(p)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* صفحه‌بندی */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-xs text-muted-foreground">
                  صفحه {formatNumber(pagination.page)} از {formatNumber(Math.max(1, pagination.totalPages))} · {formatNumber(pagination.total)} رکورد
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronRight className="h-4 w-4" /> قبلی
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    بعدی <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* دیالوگ جزئیات شعر */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl">{selected?.title}</DialogTitle>
          </DialogHeader>
          {selected && (
            <ScrollArea className="flex-1 pl-3">
              <div className="space-y-4">
                {/* متادیتا */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{selected.author}</Badge>
                  <Badge variant="outline">{LANG_NAMES[selected.language] || selected.language}</Badge>
                  {selected.country && <Badge variant="outline">{selected.country}</Badge>}
                  {selected.genre && <Badge variant="outline">{selected.genre}</Badge>}
                  {selected.mood && <Badge variant="outline">حال‌وهوا: {MOOD_LABELS[selected.mood] || selected.mood}</Badge>}
                  {selected.theme && <Badge variant="outline">تم: {THEME_LABELS[selected.theme] || selected.theme}</Badge>}
                  <LicenseBadge type={selected.licenseType} />
                  <LegalityBadge score={selected.legalityScore} />
                  <StatusBadge status={selected.status} />
                </div>

                {/* معیارها */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-md bg-muted">
                    <div className="text-muted-foreground">اطمینان شعر</div>
                    <div className="font-bold">{(selected.poetryConfidence * 100).toFixed(0)}٪</div>
                  </div>
                  <div className="p-2 rounded-md bg-muted">
                    <div className="text-muted-foreground">کیفیت ترجمه</div>
                    <div className="font-bold">{(selected.translationQuality * 100).toFixed(0)}٪</div>
                  </div>
                  <div className="p-2 rounded-md bg-muted">
                    <div className="text-muted-foreground">تکراری</div>
                    <div className="font-bold">{(selected.duplicateScore * 100).toFixed(0)}٪</div>
                  </div>
                  <div className="p-2 rounded-md bg-muted">
                    <div className="text-muted-foreground">کل</div>
                    <div className="font-bold">{(selected.qualityScore * 100).toFixed(0)}٪</div>
                  </div>
                </div>

                {/* ترجمه فارسی */}
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">ترجمه فارسی</div>
                  <div dir="rtl" className="p-4 rounded-md bg-primary/5 border border-primary/20 whitespace-pre-wrap text-lg leading-loose">
                    {selected.persianTranslation}
                  </div>
                </div>

                {/* متن اصلی — فقط در صورت مجاز بودن لایسنس */}
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-2">
                    متن اصلی
                    {selected.originalText === null && (
                      <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300">
                        محدودشده — لایسنس {selected.legalityScore}
                      </Badge>
                    )}
                  </div>
                  {selected.originalText ? (
                    <div className="p-4 rounded-md bg-muted whitespace-pre-wrap font-mono text-xs" dir="ltr">
                      {selected.originalText}
                    </div>
                  ) : (
                    <div className="p-4 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-sm">
                      ⚠️ متن اصلی توسط هوش لایسنس محدود شده است. فقط متادیتا و ترجمه فارسی ذخیره شده است.
                      منبع: <a href={selected.sourceUrl || "#"} target="_blank" rel="noreferrer" className="underline" dir="ltr">{selected.sourceUrl}</a>
                    </div>
                  )}
                </div>

                {selected.source && (
                  <div className="text-xs text-muted-foreground">
                    منبع: <span className="text-foreground">{selected.source.name}</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
