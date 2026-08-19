<div align="center">

# Mashreq Supply Chain Management System

**Track import invoices, suppliers, products, multi-part shipments, and payments — with automatic landed-cost allocation.**

Persian (فارسی) UI · RTL · Jalali calendar · Excel import/export

[Features](#features) · [Quick start](#quick-start) · [Deploy](#deploy) · [Data model](#data-model) · [راهنمای فارسی](#راهنمای-فارسی)

</div>

---

## The problem

Importers buy on one invoice but receive goods across several shipments. A single invoice line — say 1,000 units — might leave the supplier in three parts, weeks apart, each with its own freight cost. Working out what a unit actually cost you means splitting each shipment's freight across the items inside it, then adding that back to the purchase price.

Spreadsheets handle this badly. The formulas sprawl, one wrong key breaks every `SUMIF`, and two people can't edit at once.

This app replaces that spreadsheet. Nothing calculated is ever stored — balances, freight allocation, landed cost, and statuses are all derived on read from five plain tables.

## Features

**Invoices** — supplier, currency, total, due date. Sum of line items, difference against the invoice total, payments, balance, and payment status are all computed.

**Multi-part shipments** — one shipment can carry items from several invoices, and one invoice line can be split across several shipments. Freight cost is allocated by quantity, so each item carries its true share.

**Landed cost** — purchase price plus allocated freight per unit, updated the moment a shipment cost changes.

**Suppliers and products** — defined once, selected from a searchable dropdown everywhere. Renaming a supplier or product updates every invoice that references it. Anything already used in an invoice is deactivated rather than deleted.

**Payments** — a dedicated page: pick an invoice, see its balance, record the payment. Over-payment is rejected.

**Excel in and out** — download a pre-formatted template, fill it, upload it. Re-uploading the same file creates no duplicates and reports exactly what it skipped and why. Every table exports to Excel with Jalali dates.

**Jalali calendar** — dates are entered in Jalali or Gregorian (the user picks, per browser) and always stored as one canonical ISO date.

**Audit trail** — who changed what, and when, on every create, edit, and delete.

**Roles and permissions** — four roles (admin, business owner, manager, staff) each with a default set of section permissions, overridable per user. Enforced in the nav, on every page server-side, and in the actions themselves.

**Reports** — purchases vs payments per month, payables aging, outstanding per supplier, top suppliers and products, item pipeline, freight over time, carrier scorecard. Charts are Chart.js with a colorblind-validated palette and a table view of the same numbers.

**Notifications** — you define the rules: "3 days before due date", "10 days since departure and still not received", "shipment received short". The engine runs on a throttle while the app is in use and de-duplicates, so a rule fires once per situation rather than once per page load.

**Public share links** — each invoice can be given a public link showing only its status: supplier, dates, items and quantities, shipments, and statuses. **Every amount is masked** unless the viewer is a signed-in user — masked values are never sent to the browser at all, not merely hidden with CSS. Links can be rotated or disabled at any time.

**Users** — sign in with mobile number and password. Passwords are hashed with scrypt and a random salt; sessions are HMAC-signed httpOnly cookies.

## Screens

| Route | What it does |
|---|---|
| `/` | Dashboard — what needs action today: overdue, due soon, amount mismatches, shipments in flight |
| `/suppliers` | Suppliers, with purchase total and outstanding balance each |
| `/products` | Product catalogue — SKU, name, category, unit, last price |
| `/invoices` | Invoice list, and per-invoice items, shipments, and payments |
| `/payments` | All payments; record a new one against any invoice |
| `/shipments` | Shipments, and which items travel in each |
| `/import` | Upload an Excel workbook; download the template |
| `/history` | Full audit log |
| `/reports` | Charts and statistics, per currency |
| `/notifications` | Notification inbox, and `/notifications/rules` to define the rules |
| `/users` | Users, roles, and permissions |
| `/s/[token]` | Public, read-only invoice status (no sign-in required) |

Exports live at `/api/export/{suppliers,products,invoices,items,shipments,allocations,payments,history}` and the template at `/api/template`.

## Quick start

Requires Node 20+ and a PostgreSQL database.

```bash
git clone git@github.com:amirnsamimi/mashreq-supply-chain-management-system.git
cd mashreq-supply-chain-management-system
npm install
cp .env.example .env.local     # then fill in DATABASE_URL and AUTH_SECRET
npm run db:init                # creates the tables
npm run dev
```

Need a database locally? One command:

```bash
docker run -d --name mashreq-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=mashreq -p 5432:5432 postgres:16-alpine
```

Then set `DATABASE_URL=postgres://postgres:postgres@localhost:5432/mashreq` in `.env.local`.

Open http://localhost:3000. With no users in the database yet, the sign-in page offers to create the first one.

### Environment variables

| Variable | Required | What it is |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string. SSL is enabled automatically for any host other than localhost. |
| `AUTH_SECRET` | yes | Long random string used to sign session cookies. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Changing it signs everyone out; passwords are unaffected. |
| `NEXT_PUBLIC_APP_URL` | no | Public origin used to build invoice share links, e.g. `https://mashreq.example.com`. Leave empty and the origin is derived from the request headers, which is correct in most setups; set it if you sit behind a proxy or CDN. |
| `APP_TIMEZONE` | no | Business timezone, default `Asia/Tehran`. "Today" — for due dates, overdue counts, and notifications — is computed in this zone. Servers run in UTC, so without it a Tehran evening would still count as the previous day. |
| `DATABASE_POOL_MAX` | no | Max concurrent DB connections per instance, default 5. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | no | Public VAPID key for web push. Generate both keys once with `npx web-push generate-vapid-keys`. Leave empty and push notifications stay disabled; the rest of the app is unaffected. |
| `VAPID_PRIVATE_KEY` | no | Private half of the VAPID pair. Keep it secret — never prefix it with `NEXT_PUBLIC_`. |
| `VAPID_SUBJECT` | no | Contact address for the push services, e.g. `mailto:you@example.com`. Apple and Google use it to reach you about delivery problems. |

## Deploy

Any host that runs Next.js and can reach a Postgres database. The path with the least setup:

1. Create a free Postgres database at [Neon](https://neon.tech) and copy its connection string.
2. Import the repository on [Vercel](https://vercel.com).
3. Set `DATABASE_URL` and `AUTH_SECRET` in the project's environment variables.
4. Create the tables once, from your machine:
   ```bash
   DATABASE_URL="<your Neon connection string>" node scripts/init-db.mjs
   ```
5. Open the deployed URL, create the first user — that account becomes the admin — then add your colleagues under `/users`.
6. Optional, for phone notifications: run `npx web-push generate-vapid-keys`, set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`, then redeploy.

### Deployment notes

- **Use Neon's pooled connection string** (the host contains `-pooler`) for `DATABASE_URL`. Serverless functions each open their own connections and will exhaust a direct connection limit under load. Keep the direct string for `scripts/init-db.mjs`.
- **Set `APP_TIMEZONE`** if your business does not run on Tehran time.
- **`AUTH_SECRET` must differ per environment.** Reusing a development value in production lets anyone who has seen it forge a session cookie.
- **The build does not need a database.** Connections open on first query, so CI can build without secrets.
- **Re-running `db:init` is safe** — every statement is `create table if not exists` / `add column if not exists`, so it doubles as the migration step after pulling changes.
- Sessions last 30 days. Changing `AUTH_SECRET` signs everyone out without touching passwords.
- **HTTPS is required for the installable app and push.** Service workers and the Web Push API only run on a secure origin. Vercel and most hosts give you HTTPS by default.
- **Re-run `db:init` after pulling** — web push added a `push_subscriptions` table.
- **Changing the VAPID keys invalidates every existing subscription.** Devices have to re-enable notifications from `/notifications`. Generate the pair once and keep it.

### Install on a phone, and notifications

The app is a PWA: it can be installed to the home screen and run without browser chrome.

- **Android / desktop Chrome** — an install button appears in the header and on the login screen.
- **iPhone / iPad** — open the site in Safari, tap **Share → Add to Home Screen**, then launch it from that icon.

Push notifications on iOS **only** work for an app installed to the home screen (iOS 16.4+); Safari itself will never deliver them. Once installed, open `/notifications` and turn on notifications for that device — each device subscribes separately. Alerts are generated by the rules you define at `/notifications/rules`; with no rules, nothing fires.

## Data model

Five business tables, plus users and the audit log:

```
suppliers ──< invoices ──< invoice_items ──< allocations >── shipments
                  │                                              
                  └──< payments                                   
products ──< invoice_items
```

| Table | Holds | Foreign keys |
|---|---|---|
| `suppliers` | supplier directory | — |
| `products` | product catalogue (SKU) | — |
| `invoices` | invoice header | `supplier_id` |
| `invoice_items` | one row per line item | `invoice_id`, `product_id` |
| `shipments` | one row per shipment part | — |
| `allocations` | how much of an item travels in which shipment | `item_id`, `shipment_id` |
| `payments` | payments against an invoice | `invoice_id` |
| `users` | sign-in accounts | — |
| `audit_log` | change history | `user_id` |
| `notification_rules` | user-defined notification templates | — |
| `notifications` | generated notifications | `rule_id` |
| `invoice_shares` | public share links | `invoice_id` |

`allocations` is the heart of it: the many-to-many join that lets one item be split across shipments and one shipment carry many invoices. Everything else follows from there.

No derived value is stored. Balances, allocated and remaining quantities, freight shares, landed cost, and every status are computed in [`src/lib/queries.ts`](src/lib/queries.ts).

## Rules the app enforces

- An allocation cannot exceed an item's remaining quantity.
- Received quantity cannot exceed shipped quantity.
- An item's quantity cannot drop below what is already allocated to shipments.
- A payment cannot exceed the invoice balance.
- Departure cannot precede handover to the carrier, and arrival cannot precede departure.
- Invoice numbers, shipment numbers, SKUs, supplier names, and phone numbers are unique.
- Suppliers and products already used in an invoice are deactivated, never deleted.

## Built with

[Next.js](https://nextjs.org) (App Router, Server Actions) · TypeScript · PostgreSQL via [postgres.js](https://github.com/porsager/postgres) — no ORM, plain SQL · Tailwind CSS v4 · [ExcelJS](https://github.com/exceljs/exceljs) · [Vazirmatn](https://github.com/rastikerdar/vazirmatn) and [Geist Mono](https://vercel.com/font) fonts.

The UI components in [`src/components/geist`](src/components/geist) are a hand-built implementation of [Vercel's Geist design system](https://vercel.com/geist) — Vercel publishes the design system but not the React components, so these were written from its specifications. They are RTL-first and theme-aware.

Jalali ↔ Gregorian conversion in [`src/lib/jalali.ts`](src/lib/jalali.ts) is a dependency-free implementation of the standard Borkowski algorithm.

## Notes and limitations

- **Permissions are per section, not per record.** A user who can see invoices can see all of them; there is no ownership or row-level scoping.
- **No currency conversion.** Amounts are summed per currency and never mixed. There is no FX rate field.
- **Notifications are in-app only.** No email or SMS delivery.
- **Not multi-tenant.** One deployment serves one organisation.
- **No backups are configured.** Whatever your Postgres host provides is what you get; take your own dumps before large imports.
- **Login throttling is per phone number**, not per IP: eight failed attempts lock that number for fifteen minutes. It stops password guessing against one account, not a distributed attack.

## Notes on the implementation

**Lists are paginated in SQL**, not in the browser: `LIMIT`/`OFFSET` with search and sorting pushed to the database, all reflected in the URL so a view can be linked. Sort columns are whitelisted before they reach SQL.

**Numbers render in Latin digits everywhere.** Persian digits reverse badly on chart canvases and confuse numeric inputs, so display, inputs, and exports all use one format.

**Dates are entered and displayed in Jalali or Gregorian** — the reader picks, and the preference sticks. Storage is always a single canonical ISO date. Display switching costs no JavaScript: both forms are rendered and CSS shows one.

## راهنمای فارسی

این برنامه جایگزین وب فایل اکسل «پیگیری فاکتور و ارسال چندپارتی» است. مشکلی که حل می‌کند این است: یک فاکتور خرید می‌کنید، ولی کالا در چند پارت جداگانه و با هزینه‌های حمل متفاوت می‌رسد. برای اینکه بدانید هر واحد کالا واقعاً چقدر برایتان تمام شده، باید هزینه حمل هر پارت را بین اقلام داخلش سرشکن کنید و به قیمت خرید اضافه کنید.

در اکسل این کار شکننده است: فرمول‌ها زیاد می‌شوند، یک کلید اشتباه همه `SUMIF`ها را خراب می‌کند، و دو نفر نمی‌توانند هم‌زمان کار کنند.

**چه چیزهایی خودکار حساب می‌شود:** جمع اقلام هر فاکتور، اختلافش با مبلغ کل، جمع پرداختی، مانده، وضعیت پرداخت، تعداد تخصیص‌یافته و باقی‌مانده و در مسیر و دریافت‌شده هر قلم، سرشکن هزینه حمل هر پارت به نسبت تعداد، هزینه حمل هر واحد، بهای تمام‌شده هر واحد، مدت حمل، و وضعیت پارت و کالا. هیچ‌کدام در دیتابیس ذخیره نمی‌شوند و همیشه در لحظه از روی داده خام حساب می‌شوند.

**تأمین‌کنندگان و کالاها** یک بار تعریف می‌شوند و بعد در فاکتورها از فهرست انتخاب می‌شوند؛ اگر نامشان را عوض کنید، همه فاکتورهایشان به‌روز می‌شود.

**تاریخ‌ها** را می‌توانید شمسی یا میلادی وارد کنید و ببینید (انتخاب کاربر است و می‌ماند)، ولی همیشه به یک شکل واحد در دیتابیس ذخیره می‌شوند. همه اعداد هم با رقم لاتین نمایش داده می‌شوند.

**نقش و دسترسی:** چهار نقش — ادمین، صاحب کسب‌وکار، مدیر، کارشناس — که هرکدام مجموعه دسترسی پیش‌فرض دارند و قابل تغییر دستی‌اند. اولین کاربر سیستم ادمین می‌شود. دسترسی هم در منو، هم در خود صفحه‌ها روی سرور بررسی می‌شود.

**اعلان‌ها:** خودتان قالب می‌سازید («۳ روز مانده به سررسید»، «۱۰ روز از خروج پارت گذشته و نرسیده») و برنامه هنگام کار، خودکار بررسی می‌کند و تکراری نمی‌سازد.

**گزارش‌ها:** نمودار خرید و پرداخت ماهانه، سن بدهی، مانده به تفکیک تأمین‌کننده، تأمین‌کنندگان و کالاهای برتر، چرخه کالا، هزینه حمل و کارنامه کارگوها — همه به تفکیک ارز.

**اشتراک‌گذاری فاکتور:** برای هر فاکتور می‌توانید یک لینک عمومی بسازید که فقط وضعیت را نشان می‌دهد: تأمین‌کننده، تاریخ‌ها، اقلام و تعدادشان، پارت‌های ارسال و وضعیت‌ها. **همه مبالغ پنهان‌اند** مگر بیننده خودش کاربر سیستم و واردشده باشد — مبلغ پنهان اصلاً به مرورگر فرستاده نمی‌شود، نه اینکه با CSS مخفی شود. لینک را هر وقت خواستید عوض یا غیرفعال کنید.

**اکسل:** فایل نمونه را از صفحه «ورود داده» دانلود کنید، پرش کنید و بارگذاری کنید. اگر همان فایل را دوباره بارگذاری کنید داده تکراری ساخته نمی‌شود و برنامه دقیقاً می‌گوید چه چیزی را رد کرده و چرا. خروجی همه جدول‌ها هم با تاریخ شمسی گرفته می‌شود.

**کاربران:** ورود با شماره موبایل و رمز. رمزها با scrypt و نمک تصادفی هش می‌شوند. اولین باری که برنامه بالا می‌آید و هیچ کاربری نیست، صفحه ورود خودش فرم ساخت کاربر اول را نشان می‌دهد و آن کاربر ادمین می‌شود.

**تاریخچه:** هر ایجاد، ویرایش، حذف، ورود و خروج ثبت می‌شود و در صفحه «تاریخچه» با جست‌وجو و صفحه‌بندی در دسترس است.

**قبل از دیپلوی:** برای Neon حتماً رشته اتصال «pooler» را در `DATABASE_URL` بگذارید، `AUTH_SECRET` را برای هر محیط جداگانه بسازید، و اگر ساعت کاری‌تان تهران نیست `APP_TIMEZONE` را تنظیم کنید. جزئیات در بخش [Deployment notes](#deployment-notes).

راه‌اندازی و متغیرهای محیطی در بخش [Quick start](#quick-start) توضیح داده شده‌اند.

## License

[MIT](LICENSE)
