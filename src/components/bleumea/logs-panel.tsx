"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Terminal, RefreshCw, ChevronLeft, ChevronRight,
} from "lucide-react";
import { formatNumber } from "./shared";

interface LogItem {
  id: string;
  level: string;
  category: string;
  message: string;
  detail: string | null;
  traceId: string | null;
  sourceId: string | null;
  poemId: string | null;
  autoRecovered: boolean;
  createdAt: string;
}

const LEVEL_LABELS: Record<string, string> = {
  DEBUG: "دیباگ",
  INFO: "اطلاع",
  WARN: "هشدار",
  ERROR: "خطا",
  CRITICAL: "بحرانی",
};

const LEVEL_COLORS: Record<string, string> = {
  DEBUG: "text-zinc-500",
  INFO: "text-emerald-700",
  WARN: "text-amber-700",
  ERROR: "text-rose-700",
  CRITICAL: "text-rose-900 font-bold",
};

const CATEGORY_LABELS: Record<string, string> = {
  PIPELINE: "پایپ‌لاین",
  LICENSE: "لایسنس",
  SECURITY: "امنیت",
  API: "API",
  DB: "پایگاه‌داده",
  TRANSLATION: "ترجمه",
  EMBEDDING: "برداری",
  QA: "تضمین کیفیت",
  SYSTEM: "سامانه",
};

export function LogsPanel() {
  const [items, setItems] = useState<LogItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [level, setLevel] = useState<string>("");
  const [category, setCategory] = useState<string>("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "50");
    if (level) params.set("level", level);
    if (category) params.set("category", category);
    fetch(`/api/bleumea/logs?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items || []);
        setPagination(d.pagination || { page: 1, pageSize: 50, total: 0, totalPages: 0 });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, level, category]);

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">گزارش‌های سامانه و ممیزی</div>
              <div className="text-xs text-muted-foreground">قابلیت مشاهده خود‌ترمیم‌شونده — خود‌ترمیمی به‌صورت درون‌خطی علامت‌گذاری شده</div>
            </div>
            <Select value={level || "ALL"} onValueChange={(v) => { setLevel(v === "ALL" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-32"><SelectValue placeholder="سطح" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">همه سطوح</SelectItem>
                <SelectItem value="DEBUG">دیباگ</SelectItem>
                <SelectItem value="INFO">اطلاع</SelectItem>
                <SelectItem value="WARN">هشدار</SelectItem>
                <SelectItem value="ERROR">خطا</SelectItem>
                <SelectItem value="CRITICAL">بحرانی</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category || "ALL"} onValueChange={(v) => { setCategory(v === "ALL" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="دسته" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">همه دسته‌ها</SelectItem>
                <SelectItem value="PIPELINE">پایپ‌لاین</SelectItem>
                <SelectItem value="LICENSE">لایسنس</SelectItem>
                <SelectItem value="SECURITY">امنیت</SelectItem>
                <SelectItem value="API">API</SelectItem>
                <SelectItem value="DB">پایگاه‌داده</SelectItem>
                <SelectItem value="TRANSLATION">ترجمه</SelectItem>
                <SelectItem value="EMBEDDING">برداری</SelectItem>
                <SelectItem value="QA">تضمین کیفیت</SelectItem>
                <SelectItem value="SYSTEM">سامانه</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => { setLevel(""); setCategory(""); setPage(1); }}>
              <RefreshCw className="h-3 w-3" /> بازنشانی
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Terminal className="h-4 w-4" /> جریان گزارش‌ها ({formatNumber(pagination.total)})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh] pl-3">
            <div className="space-y-1 font-mono text-xs">
              {items.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 border-r-2" style={{
                  borderRightColor: log.level === "CRITICAL" ? "#9f1239" : log.level === "ERROR" ? "#e11d48" : log.level === "WARN" ? "#f59e0b" : "#10b981",
                }}>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("fa-IR", { hour12: false })}
                  </span>
                  <span className={`font-bold w-20 ${LEVEL_COLORS[log.level] || ""}`}>{LEVEL_LABELS[log.level] || log.level}</span>
                  <span className="text-muted-foreground w-28">[{CATEGORY_LABELS[log.category] || log.category}]</span>
                  <span className="flex-1 break-words">{log.message}</span>
                  {log.autoRecovered && (
                    <Badge variant="outline" className="text-[9px] py-0 h-4 text-emerald-700 border-emerald-300">
                      خود‌ترمیم‌شده
                    </Badge>
                  )}
                  {log.traceId && (
                    <span className="text-muted-foreground text-[10px]">trace={log.traceId.slice(0, 8)}…</span>
                  )}
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-center text-muted-foreground p-8">هیچ گزارشی با این فیلتر تطابق ندارد.</div>
              )}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between mt-4">
            <div className="text-xs text-muted-foreground">
              صفحه {formatNumber(pagination.page)} از {formatNumber(Math.max(1, pagination.totalPages))} · {formatNumber(pagination.total)} گزارش
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronRight className="h-4 w-4" /> قبلی
              </Button>
              <Button size="sm" variant="outline" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>
                بعدی <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
