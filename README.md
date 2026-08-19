# پیگیری فاکتور و ارسال چندپارتی

جایگزین وب فایل اکسل «پیگیری فاکتور و ارسال چندپارتی». چند نفر هم‌زمان می‌توانند کار کنند و همه محاسبات (مانده، سرشکن هزینه حمل، بهای تمام‌شده، وضعیت‌ها) خودکار انجام می‌شود.

## مدل داده (۵ جدول)

| جدول | نقش | کلید خارجی |
|---|---|---|
| `invoices` | سربرگ فاکتور | — |
| `invoice_items` | اقلام هر فاکتور | `invoice_id` |
| `shipments` | پارت‌های ارسال | — |
| `allocations` | چه تعداد از کدام قلم در کدام پارت رفته | `item_id` + `shipment_id` |
| `payments` | پرداخت‌های هر فاکتور | `invoice_id` |

هیچ ستون محاسباتی ذخیره نمی‌شود؛ همه در لحظه از روی همین ۵ جدول حساب می‌شوند (`src/lib/queries.ts`).

## اجرا روی کامپیوتر خودتان

```bash
docker run -d --name khanum-pg -e POSTGRES_PASSWORD=khanum -e POSTGRES_DB=khanum -p 55432:5432 postgres:16-alpine
cp .env.example .env.local   # سپس مقادیر را ویرایش کنید
npm install
npm run db:init
npm run dev
```

## انتشار روی اینترنت (Vercel + Neon)

۱. این پوشه را روی GitHub بگذارید.
۲. در [neon.tech](https://neon.tech) یک پروژه Postgres رایگان بسازید و connection string آن را بردارید.
۳. در [vercel.com](https://vercel.com) با «Import Project» همین مخزن را وارد کنید و در Environment Variables دو مقدار بدهید:
   - `DATABASE_URL` = رشته اتصال Neon
   - `APP_PASSWORD` = رمز عبور مشترک شما و همکارانتان
۴. بعد از اولین دیپلوی، یک‌بار جداول را بسازید:
   ```bash
   DATABASE_URL="رشته-اتصال-Neon" node scripts/init-db.mjs
   ```
۵. آدرس Vercel را به همکارانتان بدهید؛ با همان رمز وارد می‌شوند.

## نکته امنیتی

احراز هویت با یک رمز مشترک است (کوکی امضاشده، ۳۰ روز). اگر بعداً نیاز به کاربر جداگانه و سطح دسترسی داشتید، باید جدول `users` اضافه شود.
