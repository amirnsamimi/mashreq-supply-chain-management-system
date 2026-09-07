-- مدل داده ساده: ۵ جدول
create table if not exists invoices (
  id            serial primary key,
  invoice_no    text not null unique,
  supplier      text,
  invoice_date  date,
  currency      text default 'RMB',
  total_amount  numeric(18,2) default 0,
  due_date      date,
  notes         text,
  created_at    timestamptz default now()
);

create table if not exists invoice_items (
  id          serial primary key,
  invoice_id  integer not null references invoices(id) on delete cascade,
  sku         text,
  description text,
  qty         numeric(18,3) default 0,
  unit_price  numeric(18,4) default 0,
  notes       text
);

create table if not exists shipments (
  id            serial primary key,
  shipment_no   text not null unique,
  carrier       text,
  mode          text,
  tracking_no   text,
  handover_date date,
  depart_date   date,
  receive_date  date,
  freight_cost  numeric(18,2) default 0,
  weight_kg     numeric(18,3),
  cbm           numeric(18,3),
  notes         text
);

create table if not exists allocations (
  id           serial primary key,
  item_id      integer not null references invoice_items(id) on delete cascade,
  shipment_id  integer not null references shipments(id) on delete cascade,
  qty_shipped  numeric(18,3) default 0,
  qty_received numeric(18,3) default 0,
  unique (item_id, shipment_id)
);

create table if not exists payments (
  id           serial primary key,
  invoice_id   integer not null references invoices(id) on delete cascade,
  payment_date date,
  amount       numeric(18,2) default 0,
  method       text,
  reference    text,
  notes        text
);

create index if not exists idx_items_invoice on invoice_items(invoice_id);
create index if not exists idx_alloc_item on allocations(item_id);
create index if not exists idx_alloc_shipment on allocations(shipment_id);
create index if not exists idx_pay_invoice on payments(invoice_id);

-- کاربران (ورود با شماره موبایل و رمز)
create table if not exists users (
  id            serial primary key,
  phone         text not null unique,
  first_name    text not null,
  last_name     text not null,
  password_hash text not null,
  is_active     boolean not null default true,
  created_at    timestamptz default now()
);

-- تاریخچه تغییرات (چه کسی، چه زمانی، چه کاری)
create table if not exists audit_log (
  id         bigserial primary key,
  user_id    integer references users(id) on delete set null,
  user_name  text not null,
  action     text not null,
  entity     text not null,
  entity_id  integer,
  summary    text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_created on audit_log(created_at desc);
create index if not exists idx_audit_entity on audit_log(entity, entity_id);

-- کالاها (تعریف یک‌بار، استفاده در همه فاکتورها)
create table if not exists products (
  id          serial primary key,
  sku         text not null unique,
  name        text not null,
  brand       text,
  category    text,
  unit        text,
  -- قیمت مرجع همیشه همراه ارز خودش معنا دارد
  last_price  numeric(18,4),
  currency    text not null default 'RMB',
  notes       text,
  is_active   boolean not null default true,
  created_at  timestamptz default now()
);
alter table invoice_items add column if not exists product_id integer references products(id) on delete set null;
create index if not exists idx_items_product on invoice_items(product_id);

-- تأمین‌کنندگان (یک‌بار تعریف، استفاده در همه فاکتورها)
create table if not exists suppliers (
  id         serial primary key,
  name       text not null unique,
  contact    text,
  phone      text,
  email      text,
  country    text,
  city       text,
  address    text,
  notes      text,
  is_active  boolean not null default true,
  created_at timestamptz default now()
);
alter table invoices add column if not exists supplier_id integer references suppliers(id) on delete set null;
create index if not exists idx_invoices_supplier on invoices(supplier_id);

-- فاکتورهای قدیمی بدون تأمین‌کننده (داده وارداتی که ستون تأمین‌کننده نداشت) به «MIA» نسبت داده می‌شوند
insert into suppliers (name) values ('MIA') on conflict (name) do nothing;
update invoices set supplier_id = (select id from suppliers where name = 'MIA')
where supplier_id is null;

-- پرداخت به تأمین‌کننده تعلق دارد و می‌تواند بین چند فاکتور او تقسیم شود
alter table payments add column if not exists supplier_id integer references suppliers(id) on delete set null;
alter table payments alter column invoice_id drop not null;

create table if not exists payment_allocations (
  id         serial primary key,
  payment_id integer not null references payments(id) on delete cascade,
  invoice_id integer not null references invoices(id) on delete cascade,
  amount     numeric(18,2) not null default 0,
  unique (payment_id, invoice_id)
);
create index if not exists idx_pa_payment on payment_allocations(payment_id);
create index if not exists idx_pa_invoice on payment_allocations(invoice_id);

-- انتقال پرداخت‌های قدیمی (invoice_id مستقیم) به مدل تخصیص، بدون تکرار در اجراهای بعدی
insert into payment_allocations (payment_id, invoice_id, amount)
select p.id, p.invoice_id, p.amount
from payments p
where p.invoice_id is not null
  and not exists (select 1 from payment_allocations pa where pa.payment_id = p.id);

update payments p set supplier_id = i.supplier_id
from invoices i
where p.invoice_id = i.id and p.supplier_id is null;

-- قالب‌های اعلان که کاربر خودش می‌سازد
create table if not exists notification_rules (
  id             serial primary key,
  name           text not null,
  target         text not null,              -- invoice | shipment
  trigger_type   text not null,              -- نوع شرط
  offset_days    integer,                    -- برای شرط‌های تاریخ‌محور
  match_status   text,                       -- برای شرط‌های وضعیت‌محور
  severity       text not null default 'info', -- info | warning | critical
  title_template text not null,
  body_template  text not null,
  is_active      boolean not null default true,
  created_at     timestamptz default now(),
  created_by     integer references users(id) on delete set null
);

-- اعلان‌های تولیدشده
create table if not exists notifications (
  id           bigserial primary key,
  rule_id      integer references notification_rules(id) on delete cascade,
  rule_name    text not null,
  target       text not null,
  target_id    integer,
  dedupe_key   text not null unique,          -- جلوی تکرار یک اعلان را می‌گیرد
  severity     text not null default 'info',
  title        text not null,
  body         text not null,
  created_at   timestamptz not null default now(),
  read_at      timestamptz,
  dismissed_at timestamptz
);
create index if not exists idx_notif_created on notifications(created_at desc);
create index if not exists idx_notif_open on notifications(dismissed_at, read_at);

-- وضعیت‌های کوچک برنامه (مثلاً آخرین اجرای موتور اعلان)
create table if not exists app_state (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

-- نقش و دسترسی کاربران
alter table users add column if not exists role text not null default 'staff';
alter table users add column if not exists permissions jsonb;

-- لینک اشتراک عمومی فاکتور
create table if not exists invoice_shares (
  id             serial primary key,
  invoice_id     integer not null references invoices(id) on delete cascade,
  token          text not null unique,
  created_by     integer references users(id) on delete set null,
  created_at     timestamptz not null default now(),
  revoked_at     timestamptz,
  view_count     integer not null default 0,
  last_viewed_at timestamptz
);
create unique index if not exists idx_share_active
  on invoice_shares(invoice_id) where revoked_at is null;

-- وضعیت راهنمای گام‌به‌گام برای هر کاربر
create table if not exists user_guide (
  user_id      integer primary key references users(id) on delete cascade,
  last_step    integer not null default 0,
  seen_count   integer not null default 0,
  started_at   timestamptz,
  completed_at timestamptz,
  skipped      boolean not null default false,
  updated_at   timestamptz not null default now()
);

-- اشتراک‌های وب‌پوش (اعلان روی گوشی)
-- هر دستگاه یک endpoint یکتا از سرویس پوش مرورگر می‌گیرد.
create table if not exists push_subscriptions (
  id           bigserial primary key,
  user_id      integer not null references users(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_sent_at timestamptz
);
create index if not exists idx_push_user on push_subscriptions(user_id);
