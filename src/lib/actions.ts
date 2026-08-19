"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "./db";
import {
  hashPassword,
  hasUsers,
  normalizePhone,
  requireAuth,
  signOut,
  startSession,
  verifyPassword,
} from "./auth";

function s(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}
function n(fd: FormData, k: string): number | null {
  const v = s(fd, k);
  if (v === null) return null;
  const x = parseFloat(v.replace(/,/g, ""));
  return Number.isFinite(x) ? x : null;
}

/* ---------- ورود و کاربران ---------- */

export async function loginAction(_prev: string | null, fd: FormData) {
  const phone = normalizePhone(String(fd.get("phone") ?? ""));
  const password = String(fd.get("password") ?? "");
  if (!phone || !password) return "شماره موبایل و رمز عبور را وارد کنید";

  const rows = await sql`select id, password_hash, is_active from users where phone = ${phone}`;
  const user = rows[0];
  // پیام یکسان تا مشخص نشود کدام شماره در سیستم هست
  if (!user || !verifyPassword(password, String(user.password_hash))) {
    return "شماره موبایل یا رمز عبور نادرست است";
  }
  if (!user.is_active) return "حساب شما غیرفعال شده است";

  await startSession(Number(user.id));
  redirect("/");
}

/** ساخت اولین کاربر وقتی هیچ کاربری وجود ندارد */
export async function setupAction(_prev: string | null, fd: FormData) {
  if (await hasUsers()) return "کاربر اولیه قبلاً ساخته شده است";

  const phone = normalizePhone(String(fd.get("phone") ?? ""));
  const password = String(fd.get("password") ?? "");
  const first = s(fd, "first_name");
  const last = s(fd, "last_name");
  if (!phone || !first || !last) return "همه فیلدها لازم است";
  if (password.length < 6) return "رمز عبور باید حداقل ۶ کاراکتر باشد";

  const [row] = await sql`
    insert into users (phone, first_name, last_name, password_hash)
    values (${phone}, ${first}, ${last}, ${hashPassword(password)})
    returning id
  `;
  await startSession(Number(row.id));
  redirect("/");
}

export async function logoutAction() {
  await signOut();
  redirect("/login");
}

export async function createUser(_prev: string | null, fd: FormData) {
  await requireAuth();
  const phone = normalizePhone(String(fd.get("phone") ?? ""));
  const password = String(fd.get("password") ?? "");
  const first = s(fd, "first_name");
  const last = s(fd, "last_name");
  if (!phone || !first || !last) return "نام، نام خانوادگی و شماره موبایل لازم است";
  if (password.length < 6) return "رمز عبور باید حداقل ۶ کاراکتر باشد";

  const dup = await sql`select 1 from users where phone = ${phone}`;
  if (dup.length) return "این شماره موبایل قبلاً ثبت شده است";

  await sql`
    insert into users (phone, first_name, last_name, password_hash)
    values (${phone}, ${first}, ${last}, ${hashPassword(password)})
  `;
  revalidatePath("/users");
  return null;
}

export async function resetPassword(_prev: string | null, fd: FormData) {
  await requireAuth();
  const id = Number(fd.get("id"));
  const password = String(fd.get("password") ?? "");
  if (password.length < 6) return "رمز عبور باید حداقل ۶ کاراکتر باشد";
  await sql`update users set password_hash = ${hashPassword(password)} where id = ${id}`;
  revalidatePath("/users");
  return null;
}

/** تغییر رمز توسط خود کاربر با تأیید رمز فعلی */
export async function changeOwnPassword(_prev: string | null, fd: FormData) {
  const me = await requireAuth();
  const current = String(fd.get("current_password") ?? "");
  const next = String(fd.get("password") ?? "");
  if (next.length < 6) return "رمز جدید باید حداقل ۶ کاراکتر باشد";

  const [row] = await sql`select password_hash from users where id = ${me.id}`;
  if (!row || !verifyPassword(current, String(row.password_hash))) {
    return "رمز فعلی نادرست است";
  }
  await sql`update users set password_hash = ${hashPassword(next)} where id = ${me.id}`;
  revalidatePath("/users");
  return null;
}

export async function updateUser(fd: FormData) {
  await requireAuth();
  const id = Number(fd.get("id"));
  await sql`
    update users set
      first_name = ${s(fd, "first_name") ?? ""},
      last_name  = ${s(fd, "last_name") ?? ""},
      phone      = ${normalizePhone(String(fd.get("phone") ?? ""))}
    where id = ${id}
  `;
  revalidatePath("/users");
}

export async function toggleUserActive(fd: FormData) {
  const me = await requireAuth();
  const id = Number(fd.get("id"));
  if (id === me.id) return; // نمی‌توان حساب خود را غیرفعال کرد
  await sql`update users set is_active = not is_active where id = ${id}`;
  revalidatePath("/users");
}

export async function deleteUser(fd: FormData) {
  const me = await requireAuth();
  const id = Number(fd.get("id"));
  if (id === me.id) return; // نمی‌توان حساب خود را حذف کرد
  const [{ n }] = await sql`select count(*)::int as n from users where is_active`;
  if (Number(n) <= 1) return; // آخرین کاربر فعال باقی بماند
  await sql`delete from users where id = ${id}`;
  revalidatePath("/users");
}

/* ---------- فاکتور ---------- */

export async function createInvoice(fd: FormData) {
  await requireAuth();
  const no = s(fd, "invoice_no");
  if (!no) return;
  await sql`
    insert into invoices (invoice_no, supplier, invoice_date, currency, total_amount, due_date, notes)
    values (${no}, ${s(fd, "supplier")}, ${s(fd, "invoice_date")}, ${s(fd, "currency") ?? "RMB"},
            ${n(fd, "total_amount") ?? 0}, ${s(fd, "due_date")}, ${s(fd, "notes")})
    on conflict (invoice_no) do nothing
  `;
  revalidatePath("/invoices");
  revalidatePath("/");
}

export async function updateInvoice(fd: FormData) {
  await requireAuth();
  const id = Number(fd.get("id"));
  await sql`
    update invoices set
      invoice_no   = ${s(fd, "invoice_no") ?? ""},
      supplier     = ${s(fd, "supplier")},
      invoice_date = ${s(fd, "invoice_date")},
      currency     = ${s(fd, "currency") ?? "RMB"},
      total_amount = ${n(fd, "total_amount") ?? 0},
      due_date     = ${s(fd, "due_date")},
      notes        = ${s(fd, "notes")}
    where id = ${id}
  `;
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
}

export async function deleteInvoice(fd: FormData) {
  await requireAuth();
  await sql`delete from invoices where id = ${Number(fd.get("id"))}`;
  revalidatePath("/invoices");
  redirect("/invoices");
}

/* ---------- قلم کالا ---------- */

export async function createItem(fd: FormData) {
  await requireAuth();
  const invoiceId = Number(fd.get("invoice_id"));
  await sql`
    insert into invoice_items (invoice_id, sku, description, qty, unit_price, notes)
    values (${invoiceId}, ${s(fd, "sku")}, ${s(fd, "description")},
            ${n(fd, "qty") ?? 0}, ${n(fd, "unit_price") ?? 0}, ${s(fd, "notes")})
  `;
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function updateItem(fd: FormData) {
  await requireAuth();
  const id = Number(fd.get("id"));
  const invoiceId = Number(fd.get("invoice_id"));
  await sql`
    update invoice_items set
      sku = ${s(fd, "sku")}, description = ${s(fd, "description")},
      qty = ${n(fd, "qty") ?? 0}, unit_price = ${n(fd, "unit_price") ?? 0},
      notes = ${s(fd, "notes")}
    where id = ${id}
  `;
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function deleteItem(fd: FormData) {
  await requireAuth();
  await sql`delete from invoice_items where id = ${Number(fd.get("id"))}`;
  revalidatePath(`/invoices/${Number(fd.get("invoice_id"))}`);
}

/* ---------- پرداخت ---------- */

export async function createPayment(fd: FormData) {
  await requireAuth();
  const invoiceId = Number(fd.get("invoice_id"));
  await sql`
    insert into payments (invoice_id, payment_date, amount, method, reference, notes)
    values (${invoiceId}, ${s(fd, "payment_date")}, ${n(fd, "amount") ?? 0},
            ${s(fd, "method")}, ${s(fd, "reference")}, ${s(fd, "notes")})
  `;
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/");
}

export async function deletePayment(fd: FormData) {
  await requireAuth();
  await sql`delete from payments where id = ${Number(fd.get("id"))}`;
  revalidatePath(`/invoices/${Number(fd.get("invoice_id"))}`);
}

/* ---------- پارت ارسال ---------- */

export async function createShipment(fd: FormData) {
  await requireAuth();
  const no = s(fd, "shipment_no");
  if (!no) return;
  await sql`
    insert into shipments (shipment_no, carrier, mode, tracking_no, handover_date,
                           depart_date, receive_date, freight_cost, weight_kg, cbm, notes)
    values (${no}, ${s(fd, "carrier")}, ${s(fd, "mode")}, ${s(fd, "tracking_no")},
            ${s(fd, "handover_date")}, ${s(fd, "depart_date")}, ${s(fd, "receive_date")},
            ${n(fd, "freight_cost") ?? 0}, ${n(fd, "weight_kg")}, ${n(fd, "cbm")}, ${s(fd, "notes")})
    on conflict (shipment_no) do nothing
  `;
  revalidatePath("/shipments");
  revalidatePath("/");
}

export async function updateShipment(fd: FormData) {
  await requireAuth();
  const id = Number(fd.get("id"));
  await sql`
    update shipments set
      shipment_no = ${s(fd, "shipment_no") ?? ""}, carrier = ${s(fd, "carrier")},
      mode = ${s(fd, "mode")}, tracking_no = ${s(fd, "tracking_no")},
      handover_date = ${s(fd, "handover_date")}, depart_date = ${s(fd, "depart_date")},
      receive_date = ${s(fd, "receive_date")}, freight_cost = ${n(fd, "freight_cost") ?? 0},
      weight_kg = ${n(fd, "weight_kg")}, cbm = ${n(fd, "cbm")}, notes = ${s(fd, "notes")}
    where id = ${id}
  `;
  revalidatePath(`/shipments/${id}`);
  revalidatePath("/shipments");
}

export async function deleteShipment(fd: FormData) {
  await requireAuth();
  await sql`delete from shipments where id = ${Number(fd.get("id"))}`;
  revalidatePath("/shipments");
  redirect("/shipments");
}

/* ---------- تخصیص ---------- */

export async function createAllocation(fd: FormData) {
  await requireAuth();
  const shipmentId = Number(fd.get("shipment_id"));
  const itemId = Number(fd.get("item_id"));
  if (!shipmentId || !itemId) return;
  await sql`
    insert into allocations (item_id, shipment_id, qty_shipped, qty_received)
    values (${itemId}, ${shipmentId}, ${n(fd, "qty_shipped") ?? 0}, ${n(fd, "qty_received") ?? 0})
    on conflict (item_id, shipment_id) do update
      set qty_shipped = excluded.qty_shipped, qty_received = excluded.qty_received
  `;
  revalidatePath(`/shipments/${shipmentId}`);
  revalidatePath("/invoices");
}

export async function updateAllocation(fd: FormData) {
  await requireAuth();
  const id = Number(fd.get("id"));
  await sql`
    update allocations set
      qty_shipped  = ${n(fd, "qty_shipped") ?? 0},
      qty_received = ${n(fd, "qty_received") ?? 0}
    where id = ${id}
  `;
  revalidatePath(`/shipments/${Number(fd.get("shipment_id"))}`);
  revalidatePath("/invoices");
}

export async function deleteAllocation(fd: FormData) {
  await requireAuth();
  await sql`delete from allocations where id = ${Number(fd.get("id"))}`;
  revalidatePath(`/shipments/${Number(fd.get("shipment_id"))}`);
}
