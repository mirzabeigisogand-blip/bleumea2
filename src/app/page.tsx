"use client";

import { useState, useEffect, useRef } from "react";
import { Library, Radar, Languages, BookOpen, Settings } from "lucide-react";
import { LibraryPanel } from "@/components/bleumea/library-panel";
import { AutoSearchPanel } from "@/components/bleumea/auto-search-panel";
import { TranslatorPanel } from "@/components/bleumea/translator-panel";
import { SettingsPanel } from "@/components/bleumea/settings-panel";

type Tab = "library" | "auto" | "translator" | "settings";

// ─── تایمر ۳۰ ثانیه‌ای مشترک ────────────────────────────────────────────────
// تایمر در سطح صفحه تا همیشه در هدر دیده شود — حتی اگر کاربر در تب دیگری باشد
function useGlobalCountdown(onTick: () => void) {
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [running, setRunning] = useState(true);
  const cbRef = useRef(onTick);

  // Keep ref in sync inside an effect (not during render)
  useEffect(() => {
    cbRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          cbRef.current();
          return 30;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  return { secondsLeft, running, setRunning, reset: () => setSecondsLeft(30) };
}

export default function Home() {
  // پشتیبانی از ?tab= در URL برای اشتراک‌گذاری مستقیم
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "library";
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab");
    return (t === "library" || t === "auto" || t === "translator" || t === "settings") ? t : "library";
  });
  const [discoverTrigger, setDiscoverTrigger] = useState(0);

  // وقتی tab تغییر کرد، URL رو هم به‌روز کن (بدون reload)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (tab === "library") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", tab);
    }
    window.history.replaceState({}, "", url.toString());
  }, [tab]);

  const { secondsLeft, running, setRunning, reset } = useGlobalCountdown(() => {
    // هر ۳۰ ثانیه: یک کشف جدید را در تب جستجوی خودکار شروع کن
    setDiscoverTrigger((n) => n + 1);
  });

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: "library", label: "کتابخانه", icon: <Library className="h-4 w-4" /> },
    { id: "auto", label: "جستجوی خودکار", icon: <Radar className="h-4 w-4" /> },
    { id: "translator", label: "مترجم", icon: <Languages className="h-4 w-4" /> },
    { id: "settings", label: "تنظیمات", icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50/40 via-background to-background" dir="rtl">
      {/* هدر شفاف با تایمر */}
      <header className="sticky top-0 z-30 border-b bg-sidebar text-sidebar-foreground backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* لوگو + نام */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-white font-bold shadow-sm">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-base leading-tight">بلومیا</div>
              <div className="text-[10px] text-sidebar-foreground/60">کتابخانهٔ شعر و ترانه</div>
            </div>
          </div>

          {/* تایمر ۳۰ ثانیه‌ای */}
          <div className="flex items-center gap-3">
            <div className="text-xs text-sidebar-foreground/70 hidden sm:block">
              جستجوی بعدی تا
            </div>
            <div className={`relative w-12 h-12 flex items-center justify-center rounded-full border-2 ${running ? "border-emerald-400" : "border-zinc-500"}`}>
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 48 48">
                <circle
                  cx="24" cy="24" r="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-emerald-400"
                  strokeDasharray={`${(secondsLeft / 30) * 138} 138`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-sm font-bold font-mono">
                {secondsLeft.toLocaleString("fa-IR")}
              </span>
            </div>
            <button
              onClick={() => { setRunning(!running); }}
              className="text-xs px-3 py-1.5 rounded-md bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors"
            >
              {running ? "توقف" : "ادامه"}
            </button>
          </div>
        </div>

        {/* نوار تب‌ها */}
        <div className="max-w-6xl mx-auto px-4 pb-2">
          <nav className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-md text-sm font-medium transition-colors ${
                  tab === t.id
                    ? "bg-background text-foreground border-x border-t rounded-b-none -mb-px"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* محتوای اصلی */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {tab === "library" && <LibraryPanel />}
          {tab === "auto" && (
            <AutoSearchPanel
              trigger={discoverTrigger}
              secondsLeft={secondsLeft}
              onReset={reset}
            />
          )}
          {tab === "translator" && <TranslatorPanel />}
          {tab === "settings" && <SettingsPanel />}
        </div>
      </main>

      {/* فوتر ساده */}
      <footer className="border-t py-3 px-6 text-center text-xs text-muted-foreground">
        بلومیا · کتابخانهٔ هوشمند شعر و ترانهٔ جهانی · هرگز بدون لایسنس ذخیره نمی‌کند
      </footer>
    </div>
  );
}
