"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Loader2, ExternalLink } from "lucide-react";
import { LicenseBadge, formatRelative, formatNumber } from "./shared";

interface SearchResult {
  id: string;
  title: string;
  author: string;
  language: string;
  persianTranslation: string;
  qualityScore: number;
  licenseType: string;
  legalityScore: string;
  sourceUrl: string | null;
  relevanceScore: number;
  createdAt: string;
}

const LANG_NAMES: Record<string, string> = {
  en: "انگلیسی", fa: "فارسی", fr: "فرانسوی", es: "اسپانیایی", de: "آلمانی",
  it: "ایتالیایی", ru: "روسی", ja: "ژاپنی", zh: "چینی",
};

export function SearchPanel() {
  const [q, setQ] = useState("ماه");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function search() {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(false);
    try {
      const res = await fetch(`/api/bleumea/search?q=${encodeURIComponent(q)}&limit=20`);
      const d = await res.json();
      setResults(d.results || []);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  const quickQueries = ["ماه", "wood", "عشق", "آسمان", "river", "star", "امید", "مهتاب", "night", "دریا"];

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" /> جستجوی معنایی + متن کامل
          </CardTitle>
          <CardDescription>
            جستجو در عنوان، نویسنده، ترجمه فارسی و متن اصلی. نتایج بر اساس مرتبط‌بودن + کیفیت رتبه‌بندی می‌شوند.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="جستجوی اشعار بر اساس کلیدواژه (فارسی، انگلیسی، فرانسوی، …)"
              className="text-sm"
            />
            <Button onClick={search} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              جستجو
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {quickQueries.map((qq) => (
              <Button
                key={qq}
                size="sm"
                variant="outline"
                className="h-6 text-xs"
                onClick={() => { setQ(qq); }}
              >
                {qq}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            نتایج {searched && `(${formatNumber(results.length)})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground text-sm p-8 text-center flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> در حال جستجو…
            </div>
          ) : results.length === 0 ? (
            <div className="text-muted-foreground text-sm p-8 text-center">
              {searched ? "نتیجه‌ای یافت نشد. کلیدواژه دیگری را امتحان کنید." : "یک عبارت وارد کرده و روی جستجو کلیک کنید."}
            </div>
          ) : (
            <ScrollArea className="h-[60vh] pl-3">
              <div className="space-y-3">
                {results.map((r) => (
                  <div key={r.id} className="border rounded-md p-3 hover:bg-muted/30">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">{r.title}</div>
                        <div className="text-xs text-muted-foreground">{r.author} · {LANG_NAMES[r.language] || r.language}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="text-[10px]">مرتبط: {r.relevanceScore.toFixed(2)}</Badge>
                        <Badge variant="outline" className="text-[10px]">کیفیت: {(r.qualityScore * 100).toFixed(0)}٪</Badge>
                        <LicenseBadge type={r.licenseType} />
                      </div>
                    </div>
                    <div
                      dir="rtl"
                      className="mt-2 text-sm text-foreground/90 line-clamp-3 leading-loose"
                    >
                      {r.persianTranslation}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{formatRelative(r.createdAt)}</span>
                      {r.sourceUrl && (
                        <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="underline flex items-center gap-1" dir="ltr">
                          منبع <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
