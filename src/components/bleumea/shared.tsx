// BLEUMEA — اشیای مشترک رابط کاربری (فارسی)

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    SUCCESS: { color: "bg-emerald-100 text-emerald-800 border-emerald-300", label: "موفق" },
    DEGRADED: { color: "bg-amber-100 text-amber-800 border-amber-300", label: "تنزل‌یافته" },
    FAILED: { color: "bg-rose-100 text-rose-800 border-rose-300", label: "ناموفق" },
    RUNNING: { color: "bg-sky-100 text-sky-800 border-sky-300 bleumea-pulse", label: "در حال اجرا" },
    APPROVED: { color: "bg-emerald-100 text-emerald-800 border-emerald-300", label: "تأییدشده" },
    QUARANTINE: { color: "bg-amber-100 text-amber-800 border-amber-300", label: "قرنطینه" },
    REJECTED: { color: "bg-rose-100 text-rose-800 border-rose-300", label: "ردشده" },
    PASSED: { color: "bg-emerald-100 text-emerald-800 border-emerald-300", label: "قبول‌شده" },
    SKIPPED: { color: "bg-zinc-100 text-zinc-600 border-zinc-300", label: "نادیده‌گرفته" },
    RETRY: { color: "bg-orange-100 text-orange-800 border-orange-300", label: "تلاش مجدد" },
  };
  const s = map[status] || { color: "bg-zinc-100 text-zinc-700 border-zinc-300", label: status };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${s.color}`}>
      {s.label}
    </span>
  );
}

export function LegalityBadge({ score }: { score: string }) {
  const map: Record<string, { color: string; label: string }> = {
    SAFE: { color: "bg-emerald-500 text-white", label: "ایمن" },
    LIMITED: { color: "bg-amber-500 text-white", label: "محدود" },
    BLOCKED: { color: "bg-rose-600 text-white", label: "مسدود" },
  };
  const s = map[score] || { color: "bg-zinc-500 text-white", label: score };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${s.color}`}>
      {s.label}
    </span>
  );
}

export function LicenseBadge({ type }: { type: string }) {
  const map: Record<string, { color: string; label: string }> = {
    PUBLIC_DOMAIN: { color: "bg-emerald-100 text-emerald-800 border-emerald-300", label: "مالکیت عمومی" },
    CC0: { color: "bg-emerald-100 text-emerald-800 border-emerald-300", label: "CC0" },
    CC_BY: { color: "bg-lime-100 text-lime-800 border-lime-300", label: "CC BY" },
    CC_BY_SA: { color: "bg-lime-100 text-lime-800 border-lime-300", label: "CC BY-SA" },
    CC_BY_NC: { color: "bg-amber-100 text-amber-800 border-amber-300", label: "CC BY-NC" },
    CC_BY_ND: { color: "bg-amber-100 text-amber-800 border-amber-300", label: "CC BY-ND" },
    RESTRICTED: { color: "bg-rose-100 text-rose-800 border-rose-300", label: "محدودشده" },
    UNKNOWN: { color: "bg-zinc-100 text-zinc-700 border-zinc-300", label: "نامشخص" },
  };
  const c = map[type] || map.UNKNOWN;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono border ${c.color}`}>
      {c.label}
    </span>
  );
}

export function formatNumber(n: number): string {
  return n.toLocaleString("fa-IR");
}

export function formatMs(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms.toLocaleString("fa-IR")} میلی‌ثانیه`;
  return `${(ms / 1000).toFixed(2)} ثانیه`;
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("fa-IR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffSec < 60) return `${diffSec.toLocaleString("fa-IR")} ثانیه پیش`;
  if (diffMin < 60) return `${diffMin.toLocaleString("fa-IR")} دقیقه پیش`;
  if (diffHr < 24) return `${diffHr.toLocaleString("fa-IR")} ساعت پیش`;
  if (diffDay < 30) return `${diffDay.toLocaleString("fa-IR")} روز پیش`;
  return date.toLocaleDateString("fa-IR", { month: "long", day: "numeric" });
}

export const PIPELINE_STAGE_LABELS: Record<string, string> = {
  CRAWLER: "خزشگر",
  PREFILTER: "پیش‌فیلتر",
  LANG_DETECT: "تشخیص زبان",
  POETRY_CLASSIFIER: "طبقه‌بند شعر",
  LICENSE_CHECKER: "بررسی لایسنس",
  DEDUP: "حذف تکراری",
  TRANSLATION: "ترجمه",
  EMBEDDING: "برداری معنایی",
  STORAGE: "ذخیره‌سازی",
};

export const PIPELINE_STAGE_DESCRIPTIONS: Record<string, string> = {
  CRAWLER: "محتوای خام را از منابع کشف‌شده واکشی می‌کند",
  PREFILTER: "نویز آشکار (تبلیغات، کد، نثر) را فیلتر می‌کند",
  LANG_DETECT: "زبان مبدأ را شناسایی می‌کند",
  POETRY_CLASSIFIER: "اعتبارسنجی چندلایه شعر با اطمینان ≥ ۰٫۸۵",
  LICENSE_CHECKER: "بحرانی — در صورت نامشخص بودن لایسنس، متن کامل ذخیره نمی‌شود",
  DEDUP: "بررسی تشابه کسینوسی مبتنی بر بردار معنایی",
  TRANSLATION: "ترجمه شعری فارسی با LLM",
  EMBEDDING: "تولید بردار ۳۸۴-بُعدی معنایی",
  STORAGE: "ذخیره رکورد ساختاریافته (فقط در صورت ایمن بودن لایسنس)",
};
