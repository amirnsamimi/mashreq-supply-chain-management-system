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

**Users** — sign in with mobile number and password. Passwords are hashed with scrypt and a random salt; sessions are HMAC-signed httpOnly cookies.

## Screens

| Route | What it does |
|---|---|
| `/` | Dashboard — counters, totals per currency, invoices needing attention |
| `/suppliers` | Suppliers, with purchase total and outstanding balance each |
| `/products` | Product catalogue — SKU, name, category, unit, last price |
| `/invoices` | Invoice list, and per-invoice items, shipments, and payments |
| `/payments` | All payments; record a new one against any invoice |
| `/shipments` | Shipments, and which items travel in each |
| `/import` | Upload an Excel workbook; download the template |
| `/history` | Full audit log |
| `/users` | User management |

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

## Deploy

Any host that runs Next.js and can reach a Postgres database. The path with the least setup:

1. Create a free Postgres database at [Neon](https://neon.tech) and copy its connection string.
2. Import the repository on [Vercel](https://vercel.com).
3. Set `DATABASE_URL` and `AUTH_SECRET` in the project's environment variables.
4. Create the tables once, from your machine:
   ```bash
   DATABASE_URL="<your Neon connection string>" node scripts/init-db.mjs
   ```
5. Open the deployed URL, create the first user, then add your colleagues under `/users`.

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

- **All users have the same permissions.** There are no roles. Anyone who can sign in can edit and delete anything. Add a role column if you need more.
- **No currency conversion.** Amounts are summed per currency and never mixed. There is no FX rate field.
- **Not multi-tenant.** One deployment serves one organisation.

## راهنمای فارسی

این برنامه جایگزین وب فایل اکسل «پیگیری فاکتور و ارسال چندپارتی» است. مشکلی که حل می‌کند این است: یک فاکتور خرید می‌کنید، ولی کالا در چند پارت جداگانه و با هزینه‌های حمل متفاوت می‌رسد. برای اینکه بدانید هر واحد کالا واقعاً چقدر برایتان تمام شده، باید هزینه حمل هر پارت را بین اقلام داخلش سرشکن کنید و به قیمت خرید اضافه کنید.

در اکسل این کار شکننده است: فرمول‌ها زیاد می‌شوند، یک کلید اشتباه همه `SUMIF`ها را خراب می‌کند، و دو نفر نمی‌توانند هم‌زمان کار کنند.

**چه چیزهایی خودکار حساب می‌شود:** جمع اقلام هر فاکتور، اختلافش با مبلغ کل، جمع پرداختی، مانده، وضعیت پرداخت، تعداد تخصیص‌یافته و باقی‌مانده و در مسیر و دریافت‌شده هر قلم، سرشکن هزینه حمل هر پارت به نسبت تعداد، هزینه حمل هر واحد، بهای تمام‌شده هر واحد، مدت حمل، و وضعیت پارت و کالا. هیچ‌کدام در دیتابیس ذخیره نمی‌شوند و همیشه در لحظه از روی داده خام حساب می‌شوند.

**تأمین‌کنندگان و کالاها** یک بار تعریف می‌شوند و بعد در فاکتورها از فهرست انتخاب می‌شوند؛ اگر نامشان را عوض کنید، همه فاکتورهایشان به‌روز می‌شود.

**تاریخ‌ها** را می‌توانید شمسی یا میلادی وارد کنید (انتخاب داخل خود تقویم است)، ولی همیشه به یک شکل واحد در دیتابیس ذخیره می‌شوند.

**اکسل:** فایل نمونه را از صفحه «ورود داده» دانلود کنید، پرش کنید و بارگذاری کنید. اگر همان فایل را دوباره بارگذاری کنید داده تکراری ساخته نمی‌شود و برنامه دقیقاً می‌گوید چه چیزی را رد کرده و چرا. خروجی همه جدول‌ها هم با تاریخ شمسی گرفته می‌شود.

**کاربران:** ورود با شماره موبایل و رمز. رمزها با scrypt و نمک تصادفی هش می‌شوند. اولین باری که برنامه بالا می‌آید و هیچ کاربری نیست، صفحه ورود خودش فرم ساخت کاربر اول را نشان می‌دهد. توجه کنید که **همه کاربران دسترسی یکسان دارند** و نقش و سطح دسترسی تعریف نشده است.

راه‌اندازی و متغیرهای محیطی در بخش [Quick start](#quick-start) توضیح داده شده‌اند.

## License

[MIT](LICENSE)
