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
