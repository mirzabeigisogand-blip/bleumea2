# بلومیا — کتابخانهٔ شعر و ترانه 📚

کتابخانهٔ هوشمند شعر و ترانه‌های جهانی با ترجمهٔ شعری فارسی.

## ✨ امکانات

- 📚 **کتابخانه** — مشاهده و جستجوی اشعار با فیلتر و مرتب‌سازی
- 📡 **جستجوی خودکار** — کشف خودکار شعر جدید هر ۳۰ ثانیه (بدون تکرار)
- 🌐 **مترجم** — ترجمهٔ شعری فارسی با هوش مصنوعی (GLM, Groq, OpenAI, ...)
- ⚙️ **تنظیمات** — تغییر ارائه‌دهندهٔ هوش مصنوعی از داخل سایت

---

## 🚀 استقرار روی Vercel (رایگان)

### مرحلهٔ ۱: آماده‌سازی پروژه روی GitHub

```bash
# ۱. فایل zip رو از حالت فشرده خارج کن
unzip bleumea.zip
cd bleumea

# ۲. یه repository توی GitHub بساز (https://github.com/new)
# نام: bleumea (یا هرچی دوست داری)
# نوع: Public یا Private

# ۳. کد رو به GitHub بفرست
git init
git add .
git commit -m "BLEUMEA — initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/bleumea.git
git push -u origin main
```

### مرحلهٔ ۲: ساخت دیتابیس رایگان روی Turso

Vercel فایل‌سیستم موقت داره، پس SQLite محلی کار نمی‌کنه. از **Turso** استفاده می‌کنیم (رایگان، دائمی، سازگار با SQLite):

1. به [turso.tech](https://turso.tech) برو و با GitHub وارد شو
2. روی **"New Database"** کلیک کن
3. نام: `bleumea`
4. بعد از ساخت، روی دیتابیس کلیک کن و این دو مقدار رو بردار:
   - **URL**: چیزی شبیه `libsql://bleumea-xxxx.turso.io`
   - **Auth Token**: یه رشته طولانی

### مرحلهٔ ۳: استقرار روی Vercel

1. به [vercel.com](https://vercel.com) برو و با GitHub وارد شو
2. روی **"Add New Project"** کلیک کن
3. Repository `bleumea` رو انتخاب کن
4. تنظیمات:
   - **Framework Preset**: Next.js (خودکار تشخیص داده می‌شه)
   - **Build Command**: `next build` (خودکار)
   - **Output Directory**: `.next` (خودکار)
5. در بخش **"Environment Variables"** این‌ها رو اضافه کن:

| Name | Value |
|------|-------|
| `DATABASE_URL` | `libsql://bleumea-xxxx.turso.io` |
| `DATABASE_AUTH_TOKEN` | `eyJxxxxxxxxxxxx...` |
| `LLM_PROVIDER` | `glm` |
| `LLM_API_KEY` | (کلید API از [open.bigmodel.cn](https://open.bigmodel.cn/usercenter/apikeys)) |
| `LLM_BASE_URL` | `https://open.bigmodel.cn/api/paas/v4` |
| `LLM_MODEL` | `glm-4.6` |

6. روی **"Deploy"** کلیک کن ✅

### مرحلهٔ ۴: راه‌اندازی دیتابیس

بعد از اولین deploy، باید جداول دیتابیس رو بسازی و دیتای اولیه رو وارد کنی:

```bash
# نصب Turso CLI (یک‌بار)
curl -sSfL https://get.tur.so/install.sh | bash

# ورود
turso auth login

# ساخت schema روی دیتابیس ابری
turso db shell bleumea < prisma/schema.sql

# یا با Prisma:
DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." npx prisma db push
```

سایتت الان روی یه آدرس مثل `https://bleumea.vercel.app` در دسترسه! 🎉

---

## 🏃 اجرای محلی (روی کامپیوتر خودت)

### پیش‌نیازها
- [Node.js](https://nodejs.org/) ۱۸+ یا [Bun](https://bun.sh/)

### مراحل

```bash
# نصب پکیج‌ها
bun install
# یا: npm install

# کپی فایل env
cp .env.example .env

# ساخت دیتابیس محلی
bun run db:push

# وارد کردن ۱۴ شعر اولیه
bun run scripts/seed.ts

# اجرای سرور توسعه
bun run dev
```

سایت روی `http://localhost:3000` اجرا می‌شه.

---

## 🔑 تنظیم هوش مصنوعی

می‌تونی از داخل سایت (تب «تنظیمات») ارائه‌دهنده رو عوض کنی، یا از فایل `.env`:

| ارائه‌دهنده | رایگان؟ | baseURL | مدل پیشنهادی |
|---|---|---|---|
| **GLM** (پیش‌فرض) | ❌ | `https://open.bigmodel.cn/api/paas/v4` | `glm-4.6` |
| **Groq** | ✅ | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| **OpenAI** | ❌ | `https://api.openai.com/v1` | `gpt-4o-mini` |
| **OpenRouter** | ❌ | `https://openrouter.ai/api/v1` | `anthropic/claude-3.5-sonnet` |
| **Ollama** (محلی) | ✅ | `http://localhost:11434/v1` | `llama3.1:8b` |

---

## 📁 ساختار پروژه

```
bleumea/
├── prisma/
│   └── schema.prisma          # ساختار دیتابیس
├── public/
│   ├── icon.svg               # فاوآیکون
│   ├── og-image.svg           # تصویر اشتراک‌گذاری
│   └── manifest.json          # تنظیمات PWA
├── scripts/
│   └── seed.ts                # اسکریپت دیتای اولیه
├── src/
│   ├── app/
│   │   ├── layout.tsx         # ساختار اصلی + SEO
│   │   ├── page.tsx           # صفحهٔ اصلی (۴ تب)
│   │   ├── globals.css        # استایل‌ها
│   │   ├── sitemap.ts         # نقشهٔ سایت
│   │   └── api/               # API endpoints
│   ├── components/bleumea/    # کامپوننت‌های پنل‌ها
│   └── lib/bleumea/           # منطق اصلی
├── .env.example               # نمونهٔ تنظیمات
├── package.json
└── README.md                  # این فایل
```

---

## 🛠️ دستورات

| دستور | توضیح |
|---|---|
| `bun run dev` | اجرای سرور توسعه |
| `bun run build` | ساخت نسخهٔ production |
| `bun run start` | اجرای نسخهٔ production |
| `bun run lint` | بررسی کد |
| `bun run db:push` | اعمال تغییرات دیتابیس |
| `bun run scripts/seed.ts` | وارد کردن دیتای اولیه |

---

## ❓ سؤالات متداول

**سؤال: آیا واقعاً رایگانه؟**
بله. Turso (۵۰۰MB رایگان)، Vercel (۱۰۰GB bandwidth رایگان)، Groq (نامحدود رایگان).

**سؤال: دیتابیس روی Vercel از بین می‌ره؟**
اگه از Turso استفاده کنی، نه. دائمی و پایدار هست.

**سؤال: چطور شعر جدید اضافه کنم؟**
دو راه:
1. از داخل سایت: تب «جستجوی خودکار» هر ۳۰ ثانیه شعر جدید پیدا می‌کنه
2. با API: `POST /api/bleumea/discover` با فرمت JSON

**سؤال: می‌تونم دامنهٔ اختصاصی وصل کنم؟**
بله. توی Vercel → Settings → Domains → دامنه رو اضافه کن.

---

ساخته‌شده با ❤️ برای عاشقان شعر فارسی
