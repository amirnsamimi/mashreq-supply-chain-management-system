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
  category    text,
  unit        text,
  last_price  numeric(18,4),
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
