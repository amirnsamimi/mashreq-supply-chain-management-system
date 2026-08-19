"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "./db";
import { logAudit } from "./audit";
import {
  currentUser,
  hashPassword,
  hasUsers,
  normalizePhone,
  requireAuth,
  signOut,
  startSession,
  verifyPassword,
} from "./auth";
import { money } from "./format";
import {
  ALL_PERMISSIONS,
  canManageUsers,
  roleDefaults,
  ROLES,
  type PermissionKey,
} from "./permissions";
import { runRules, TRIGGERS } from "./notifications";

/** نتیجهٔ یکنواخت فرم‌ها: پیام خطا یا موفقیت */
export type FormResult = { error?: string; ok?: string } | null;

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

const err = (m: string): FormResult => ({ error: m });
const ok = (m: string): FormResult => ({ ok: m });

/* ================= ورود و کاربران ================= */

export async function loginAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const phone = normalizePhone(String(fd.get("phone") ?? ""));
  const password = String(fd.get("password") ?? "");
  if (!phone || !password) return err("شماره موبایل و رمز عبور را وارد کنید");

  const rows = await sql`select id, password_hash, is_active from users where phone = ${phone}`;
  const user = rows[0];
  // پیام یکسان تا مشخص نشود کدام شماره در سیستم هست
  if (!user || !verifyPassword(password, String(user.password_hash))) {
    return err("شماره موبایل یا رمز عبور نادرست است");
  }
  if (!user.is_active) return err("حساب شما غیرفعال شده است");

  await startSession(Number(user.id));
  const [full] = await sql`select id, phone, first_name, last_name, role from users where id = ${user.id}`;
  await logAudit(
    {
      id: Number(full.id),
      phone: String(full.phone),
      first_name: String(full.first_name),
      last_name: String(full.last_name),
      role: String(full.role) as never,
      permissions: [],
    },
    "ورود",
    "session",
    Number(full.id),
    "ورود به سیستم"
  );
  redirect("/");
}

export async function setupAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  if (await hasUsers()) return err("کاربر اولیه قبلاً ساخته شده است");

  const phone = normalizePhone(String(fd.get("phone") ?? ""));
  const password = String(fd.get("password") ?? "");
  const first = s(fd, "first_name");
  const last = s(fd, "last_name");
  if (!phone || !first || !last) return err("همه فیلدها لازم است");
  if (password.length < 6) return err("رمز عبور باید حداقل ۶ کاراکتر باشد");

  // اولین کاربر سیستم همیشه ادمین است
  const [row] = await sql`
    insert into users (phone, first_name, last_name, password_hash, role)
    values (${phone}, ${first}, ${last}, ${hashPassword(password)}, 'admin')
    returning id
  `;
  await startSession(Number(row.id));
  redirect("/");
}

export async function logoutAction() {
  const me = await currentUser();
  if (me) await logAudit(me, "خروج", "session", me.id, "خروج از سیستم");
  await signOut();
  redirect("/login");
}

export async function createUser(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const me = await requireAuth();
  const phone = normalizePhone(String(fd.get("phone") ?? ""));
  const password = String(fd.get("password") ?? "");
  const first = s(fd, "first_name");
  const last = s(fd, "last_name");
  if (!phone || !first || !last) return err("نام، نام خانوادگی و شماره موبایل لازم است");
  if (password.length < 6) return err("رمز عبور باید حداقل ۶ کاراکتر باشد");

  if (!canManageUsers(me.role)) return err("فقط ادمین و صاحب کسب‌وکار می‌توانند کاربر بسازند");

  const dup = await sql`select 1 from users where phone = ${phone}`;
  if (dup.length) return err("این شماره موبایل قبلاً ثبت شده است");

  const role = ROLES.some((r) => r.value === s(fd, "role")) ? s(fd, "role")! : "staff";

  const [row] = await sql`
    insert into users (phone, first_name, last_name, password_hash, role)
    values (${phone}, ${first}, ${last}, ${hashPassword(password)}, ${role})
    returning id
  `;
  await logAudit(me, "ایجاد", "user", Number(row.id), `کاربر ${first} ${last} (${phone}) با نقش ${role}`);
  revalidatePath("/users");
  return ok(`کاربر ${first} ${last} اضافه شد`);
}

export async function resetPassword(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const me = await requireAuth();
  const id = Number(fd.get("id"));
  const password = String(fd.get("password") ?? "");
  if (password.length < 6) return err("رمز عبور باید حداقل ۶ کاراکتر باشد");
  await sql`update users set password_hash = ${hashPassword(password)} where id = ${id}`;
  await logAudit(me, "ویرایش", "user", id, "تغییر رمز عبور توسط مدیر");
  revalidatePath("/users");
  return ok("رمز جدید ثبت شد");
}

export async function changeOwnPassword(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const me = await requireAuth();
  const current = String(fd.get("current_password") ?? "");
  const next = String(fd.get("password") ?? "");
  if (next.length < 6) return err("رمز جدید باید حداقل ۶ کاراکتر باشد");

  const [row] = await sql`select password_hash from users where id = ${me.id}`;
  if (!row || !verifyPassword(current, String(row.password_hash))) {
    return err("رمز فعلی نادرست است");
  }
  await sql`update users set password_hash = ${hashPassword(next)} where id = ${me.id}`;
  await logAudit(me, "ویرایش", "user", me.id, "تغییر رمز عبور خودش");
  return ok("رمز عبور شما عوض شد");
}

export async function updateUser(fd: FormData) {
  const me = await requireAuth();
  const id = Number(fd.get("id"));
  const first = s(fd, "first_name") ?? "";
  const last = s(fd, "last_name") ?? "";
  await sql`
    update users set
      first_name = ${first},
      last_name  = ${last},
      phone      = ${normalizePhone(String(fd.get("phone") ?? ""))}
    where id = ${id}
  `;
  await logAudit(me, "ویرایش", "user", id, `مشخصات ${first} ${last}`);
  revalidatePath("/users");
}

export async function toggleUserActive(fd: FormData) {
  const me = await requireAuth();
  const id = Number(fd.get("id"));
  if (id === me.id) return; // نمی‌توان حساب خود را غیرفعال کرد
  const [row] = await sql`
    update users set is_active = not is_active where id = ${id}
    returning first_name, last_name, is_active
  `;
  if (row) {
    await logAudit(
      me,
      "ویرایش",
      "user",
      id,
      `${row.first_name} ${row.last_name} ${row.is_active ? "فعال" : "غیرفعال"} شد`
    );
  }
  revalidatePath("/users");
}

export async function deleteUser(fd: FormData) {
  const me = await requireAuth();
  const id = Number(fd.get("id"));
  if (id === me.id) return; // نمی‌توان حساب خود را حذف کرد
  const [{ n: activeCount }] = await sql`select count(*)::int as n from users where is_active`;
  if (Number(activeCount) <= 1) return; // آخرین کاربر فعال باقی بماند
  const [row] = await sql`delete from users where id = ${id} returning first_name, last_name`;
  if (row) await logAudit(me, "حذف", "user", id, `کاربر ${row.first_name} ${row.last_name}`);
  revalidatePath("/users");
}


/* ================= کالاها ================= */

export async function createProduct(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const me = await requireAuth();
  const sku = s(fd, "sku");
  const name = s(fd, "name");
  if (!sku || !name) return err("کد کالا و نام کالا لازم است");

  const dup = await sql`select 1 from products where sku = ${sku}`;
  if (dup.length) return err(`کالایی با کد ${sku} از قبل ثبت شده است`);

  const [row] = await sql`
    insert into products (sku, name, brand, category, unit, last_price, currency, notes)
    values (${sku}, ${name}, ${s(fd, "brand")}, ${s(fd, "category")}, ${s(fd, "unit")},
            ${n(fd, "last_price")}, ${s(fd, "currency") ?? "RMB"}, ${s(fd, "notes")})
    returning id
  `;
  await logAudit(me, "ایجاد", "product", Number(row.id), `${sku} — ${name}`);
  revalidatePath("/products");
  return ok(`کالای ${sku} ثبت شد`);
}

export async function updateProduct(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const me = await requireAuth();
  const id = Number(fd.get("id"));
  const sku = s(fd, "sku");
  const name = s(fd, "name");
  if (!sku || !name) return err("کد کالا و نام کالا لازم است");

  const dup = await sql`select 1 from products where sku = ${sku} and id <> ${id}`;
  if (dup.length) return err(`کد ${sku} برای کالای دیگری ثبت شده است`);

  await sql`
    update products set
      sku = ${sku}, name = ${name}, brand = ${s(fd, "brand")},
      category = ${s(fd, "category")}, unit = ${s(fd, "unit")},
      last_price = ${n(fd, "last_price")}, currency = ${s(fd, "currency") ?? "RMB"},
      notes = ${s(fd, "notes")}, is_active = ${fd.get("is_active") === "off" ? false : true}
    where id = ${id}
  `;
  // اقلام فاکتور کد و شرح کالا را از تعریف کالا می‌گیرند
  await sql`update invoice_items set sku = ${sku}, description = ${name} where product_id = ${id}`;
  await logAudit(me, "ویرایش", "product", id, `${sku} — ${name}`);
  revalidatePath("/products");
  revalidatePath("/invoices");
  return ok("تغییرات ذخیره شد");
}

export async function deleteProduct(fd: FormData) {
  const me = await requireAuth();
  const id = Number(fd.get("id"));
  const [{ n: used }] = await sql`
    select count(*)::int as n from invoice_items where product_id = ${id}
  `;
  // کالایی که در فاکتوری استفاده شده حذف نمی‌شود، فقط غیرفعال می‌شود
  if (Number(used) > 0) {
    await sql`update products set is_active = false where id = ${id}`;
    const [p] = await sql`select sku from products where id = ${id}`;
    await logAudit(me, "ویرایش", "product", id, `${p?.sku ?? id} غیرفعال شد (در ${used} قلم استفاده شده)`);
  } else {
    const [p] = await sql`delete from products where id = ${id} returning sku`;
    if (p) await logAudit(me, "حذف", "product", id, `کالای ${p.sku}`);
  }
  revalidatePath("/products");
}


/* ================= تأمین‌کنندگان ================= */

export async function createSupplier(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const me = await requireAuth();
  const name = s(fd, "name");
  if (!name) return err("نام تأمین‌کننده لازم است");

  const dup = await sql`select 1 from suppliers where name = ${name}`;
  if (dup.length) return err(`تأمین‌کننده‌ای با نام ${name} از قبل ثبت شده است`);

  const [row] = await sql`
    insert into suppliers (name, contact, phone, email, country, city, address, notes)
    values (${name}, ${s(fd, "contact")}, ${s(fd, "phone")}, ${s(fd, "email")},
            ${s(fd, "country")}, ${s(fd, "city")}, ${s(fd, "address")}, ${s(fd, "notes")})
    returning id
  `;
  await logAudit(me, "ایجاد", "supplier", Number(row.id), `تأمین‌کننده ${name}`);
  revalidatePath("/suppliers");
  return ok(`${name} ثبت شد`);
}

export async function updateSupplier(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const me = await requireAuth();
  const id = Number(fd.get("id"));
  const name = s(fd, "name");
  if (!name) return err("نام تأمین‌کننده لازم است");

  const dup = await sql`select 1 from suppliers where name = ${name} and id <> ${id}`;
  if (dup.length) return err(`نام ${name} برای تأمین‌کننده دیگری ثبت شده است`);

  await sql`
    update suppliers set
      name = ${name}, contact = ${s(fd, "contact")}, phone = ${s(fd, "phone")},
      email = ${s(fd, "email")}, country = ${s(fd, "country")}, city = ${s(fd, "city")},
      address = ${s(fd, "address")}, notes = ${s(fd, "notes")},
      is_active = ${fd.get("is_active") === "off" ? false : true}
    where id = ${id}
  `;
  // نام فروشنده در فاکتورها از تعریف تأمین‌کننده می‌آید
  await sql`update invoices set supplier = ${name} where supplier_id = ${id}`;
  await logAudit(me, "ویرایش", "supplier", id, `تأمین‌کننده ${name}`);
  revalidatePath("/suppliers");
  revalidatePath("/invoices");
  return ok("تغییرات ذخیره شد");
}

export async function deleteSupplier(fd: FormData) {
  const me = await requireAuth();
  const id = Number(fd.get("id"));
  const [{ n: used }] = await sql`select count(*)::int as n from invoices where supplier_id = ${id}`;
  // تأمین‌کننده‌ای که فاکتور دارد حذف نمی‌شود، فقط غیرفعال می‌شود
  if (Number(used) > 0) {
    await sql`update suppliers set is_active = false where id = ${id}`;
    const [sup] = await sql`select name from suppliers where id = ${id}`;
    await logAudit(me, "ویرایش", "supplier", id, `${sup?.name ?? id} غیرفعال شد (${used} فاکتور دارد)`);
  } else {
    const [sup] = await sql`delete from suppliers where id = ${id} returning name`;
    if (sup) await logAudit(me, "حذف", "supplier", id, `تأمین‌کننده ${sup.name}`);
  }
  revalidatePath("/suppliers");
}

/* ================= فاکتور ================= */

export async function createInvoice(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const me = await requireAuth();
  const no = s(fd, "invoice_no");
  if (!no) return err("شماره فاکتور لازم است");

  const dup = await sql`select 1 from invoices where invoice_no = ${no}`;
  if (dup.length) return err(`فاکتور ${no} قبلاً ثبت شده است`);

  const supplierId = Number(fd.get("supplier_id")) || null;
  const supplierName = supplierId
    ? String((await sql`select name from suppliers where id = ${supplierId}`)[0]?.name ?? "")
    : null;

  const [row] = await sql`
    insert into invoices (invoice_no, supplier_id, supplier, invoice_date, currency, total_amount, due_date, notes)
    values (${no}, ${supplierId}, ${supplierName}, ${s(fd, "invoice_date")}, ${s(fd, "currency") ?? "RMB"},
            ${n(fd, "total_amount") ?? 0}, ${s(fd, "due_date")}, ${s(fd, "notes")})
    returning id
  `;
  await logAudit(me, "ایجاد", "invoice", Number(row.id), `فاکتور ${no}`);
  revalidatePath("/invoices");
  revalidatePath("/");
  return ok(`فاکتور ${no} ثبت شد`);
}

export async function updateInvoice(fd: FormData) {
  const me = await requireAuth();
  const id = Number(fd.get("id"));
  const no = s(fd, "invoice_no") ?? "";
  const supplierId = Number(fd.get("supplier_id")) || null;
  const supplierName = supplierId
    ? String((await sql`select name from suppliers where id = ${supplierId}`)[0]?.name ?? "")
    : null;
  await sql`
    update invoices set
      invoice_no   = ${no},
      supplier_id  = ${supplierId},
      supplier     = ${supplierName},
      invoice_date = ${s(fd, "invoice_date")},
      currency     = ${s(fd, "currency") ?? "RMB"},
      total_amount = ${n(fd, "total_amount") ?? 0},
      due_date     = ${s(fd, "due_date")},
      notes        = ${s(fd, "notes")}
    where id = ${id}
  `;
  await logAudit(me, "ویرایش", "invoice", id, `فاکتور ${no}`);
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
}

export async function deleteInvoice(fd: FormData) {
  const me = await requireAuth();
  const id = Number(fd.get("id"));
  const [row] = await sql`delete from invoices where id = ${id} returning invoice_no`;
  if (row) await logAudit(me, "حذف", "invoice", id, `فاکتور ${row.invoice_no} با همه اقلام و پرداخت‌ها`);
  revalidatePath("/invoices");
  redirect("/invoices");
}

/* ================= قلم کالا ================= */

export async function createItem(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const me = await requireAuth();
  const invoiceId = Number(fd.get("invoice_id"));
  const productId = Number(fd.get("product_id"));
  if (!productId) return err("کالا را از فهرست کالاها انتخاب کنید");

  const qty = n(fd, "qty") ?? 0;
  const price = n(fd, "unit_price") ?? 0;
  if (qty <= 0) return err("تعداد باید بزرگ‌تر از صفر باشد");
  if (price < 0) return err("قیمت واحد نمی‌تواند منفی باشد");

  const [product] = await sql`select sku, name, currency from products where id = ${productId}`;
  if (!product) return err("کالا پیدا نشد");

  const [invoice] = await sql`select currency from invoices where id = ${invoiceId}`;
  const sameCurrency = String(invoice?.currency ?? "") === String(product.currency);

  const [row] = await sql`
    insert into invoice_items (invoice_id, product_id, sku, description, qty, unit_price, notes)
    values (${invoiceId}, ${productId}, ${product.sku}, ${product.name}, ${qty}, ${price}, ${s(fd, "notes")})
    returning id
  `;
  // قیمت مرجع فقط وقتی به‌روز می‌شود که ارز فاکتور با ارز کالا یکی باشد،
  // وگرنه عددی به ارز دیگر جای قیمت مرجع می‌نشیند
  if (sameCurrency) {
    await sql`update products set last_price = ${price} where id = ${productId}`;
  }
  await logAudit(me, "ایجاد", "item", Number(row.id), `${product.sku} × ${qty}`);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/products");
  return ok(`${product.sku} اضافه شد`);
}

export async function updateItem(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const me = await requireAuth();
  const id = Number(fd.get("id"));
  const invoiceId = Number(fd.get("invoice_id"));
  const qty = n(fd, "qty") ?? 0;
  const price = n(fd, "unit_price") ?? 0;
  if (qty <= 0) return err("تعداد باید بزرگ‌تر از صفر باشد");

  // تعداد قلم نباید کمتر از چیزی شود که قبلاً به پارت‌ها تخصیص یافته
  const [{ allocated }] = await sql`
    select coalesce(sum(qty_shipped), 0) as allocated from allocations where item_id = ${id}
  `;
  if (qty < Number(allocated)) {
    return err(`${allocated} عدد از این قلم به پارت‌ها تخصیص یافته؛ تعداد نمی‌تواند کمتر از آن باشد.`);
  }

  const [row] = await sql`
    update invoice_items set qty = ${qty}, unit_price = ${price}, notes = ${s(fd, "notes")}
    where id = ${id}
    returning sku
  `;
  await logAudit(me, "ویرایش", "item", id, `${row?.sku ?? "قلم"} — تعداد ${qty}`);
  revalidatePath(`/invoices/${invoiceId}`);
  return ok("ذخیره شد");
}

export async function deleteItem(fd: FormData) {
  const me = await requireAuth();
  const id = Number(fd.get("id"));
  const [row] = await sql`delete from invoice_items where id = ${id} returning sku, qty`;
  if (row) await logAudit(me, "حذف", "item", id, `${row.sku ?? "قلم"} × ${row.qty}`);
  revalidatePath(`/invoices/${Number(fd.get("invoice_id"))}`);
}

/* ================= پرداخت ================= */

export async function createPayment(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const me = await requireAuth();
  const invoiceId = Number(fd.get("invoice_id"));
  const amount = n(fd, "amount") ?? 0;
  if (amount <= 0) return err("مبلغ پرداخت باید بزرگ‌تر از صفر باشد");

  const [inv] = await sql`
    select invoice_no, total_amount,
      coalesce((select sum(amount) from payments where invoice_id = ${invoiceId}), 0) as paid
    from invoices where id = ${invoiceId}
  `;
  if (!inv) return err("فاکتور پیدا نشد");

  const remaining = Number(inv.total_amount) - Number(inv.paid);
  if (amount > remaining + 0.005) {
    return err(
      `مبلغ از مانده فاکتور بیشتر است. مانده: ${money(remaining)} — اگر عمدی است، اول مبلغ کل فاکتور را اصلاح کنید.`
    );
  }

  const [row] = await sql`
    insert into payments (invoice_id, payment_date, amount, method, reference, notes)
    values (${invoiceId}, ${s(fd, "payment_date")}, ${amount},
            ${s(fd, "method")}, ${s(fd, "reference")}, ${s(fd, "notes")})
    returning id
  `;
  await logAudit(me, "ایجاد", "payment", Number(row.id), `${money(amount)} برای فاکتور ${inv.invoice_no}`);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/");
  return ok("پرداخت ثبت شد");
}

export async function deletePayment(fd: FormData) {
  const me = await requireAuth();
  const id = Number(fd.get("id"));
  const [row] = await sql`delete from payments where id = ${id} returning amount`;
  if (row) await logAudit(me, "حذف", "payment", id, `پرداخت ${money(row.amount)}`);
  revalidatePath(`/invoices/${Number(fd.get("invoice_id"))}`);
}

/* ================= پارت ارسال ================= */

export async function createShipment(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const me = await requireAuth();
  const no = s(fd, "shipment_no");
  if (!no) return err("شماره پارت لازم است");

  const dup = await sql`select 1 from shipments where shipment_no = ${no}`;
  if (dup.length) return err(`پارت ${no} قبلاً ثبت شده است`);

  const handover = s(fd, "handover_date");
  const depart = s(fd, "depart_date");
  const receive = s(fd, "receive_date");
  const dateError = checkShipmentDates(handover, depart, receive);
  if (dateError) return err(dateError);

  const [row] = await sql`
    insert into shipments (shipment_no, carrier, mode, tracking_no, handover_date,
                           depart_date, receive_date, freight_cost, weight_kg, cbm, notes)
    values (${no}, ${s(fd, "carrier")}, ${s(fd, "mode")}, ${s(fd, "tracking_no")},
            ${handover}, ${depart}, ${receive},
            ${n(fd, "freight_cost") ?? 0}, ${n(fd, "weight_kg")}, ${n(fd, "cbm")}, ${s(fd, "notes")})
    returning id
  `;
  await logAudit(me, "ایجاد", "shipment", Number(row.id), `پارت ${no}`);
  revalidatePath("/shipments");
  revalidatePath("/");
  return ok(`پارت ${no} ثبت شد`);
}

function checkShipmentDates(handover: string | null, depart: string | null, receive: string | null) {
  if (handover && depart && depart < handover) return "تاریخ خروج نمی‌تواند قبل از تحویل به کارگو باشد";
  if (depart && receive && receive < depart) return "تاریخ دریافت نمی‌تواند قبل از تاریخ خروج باشد";
  if (handover && receive && receive < handover) return "تاریخ دریافت نمی‌تواند قبل از تحویل به کارگو باشد";
  return null;
}

export async function updateShipment(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const me = await requireAuth();
  const id = Number(fd.get("id"));
  const no = s(fd, "shipment_no") ?? "";
  const handover = s(fd, "handover_date");
  const depart = s(fd, "depart_date");
  const receive = s(fd, "receive_date");
  const dateError = checkShipmentDates(handover, depart, receive);
  if (dateError) return err(dateError);

  await sql`
    update shipments set
      shipment_no = ${no}, carrier = ${s(fd, "carrier")},
      mode = ${s(fd, "mode")}, tracking_no = ${s(fd, "tracking_no")},
      handover_date = ${handover}, depart_date = ${depart}, receive_date = ${receive},
      freight_cost = ${n(fd, "freight_cost") ?? 0},
      weight_kg = ${n(fd, "weight_kg")}, cbm = ${n(fd, "cbm")}, notes = ${s(fd, "notes")}
    where id = ${id}
  `;
  await logAudit(me, "ویرایش", "shipment", id, `پارت ${no}`);
  revalidatePath(`/shipments/${id}`);
  revalidatePath("/shipments");
  return ok("تغییرات ذخیره شد");
}

export async function deleteShipment(fd: FormData) {
  const me = await requireAuth();
  const id = Number(fd.get("id"));
  const [row] = await sql`delete from shipments where id = ${id} returning shipment_no`;
  if (row) await logAudit(me, "حذف", "shipment", id, `پارت ${row.shipment_no} با همه تخصیص‌ها`);
  revalidatePath("/shipments");
  redirect("/shipments");
}

/* ================= تخصیص ================= */

/** تعداد باقی‌مانده یک قلم، بدون احتساب تخصیص فعلی (برای ویرایش) */
async function itemCapacity(itemId: number, ignoreAllocationId?: number) {
  const [row] = await sql`
    select ii.qty, ii.sku, ii.description, i.invoice_no,
      coalesce((
        select sum(qty_shipped) from allocations
        where item_id = ii.id and (${ignoreAllocationId ?? 0}::int = 0 or id <> ${ignoreAllocationId ?? 0})
      ), 0) as allocated
    from invoice_items ii
    join invoices i on i.id = ii.invoice_id
    where ii.id = ${itemId}
  `;
  if (!row) return null;
  return {
    qty: Number(row.qty),
    allocated: Number(row.allocated),
    remaining: Number(row.qty) - Number(row.allocated),
    label: `${row.invoice_no} — ${row.sku ?? row.description ?? "قلم"}`,
  };
}

export async function createAllocation(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const me = await requireAuth();
  const shipmentId = Number(fd.get("shipment_id"));
  const itemId = Number(fd.get("item_id"));
  if (!shipmentId || !itemId) return err("فاکتور و کالا را انتخاب کنید");

  const shipped = n(fd, "qty_shipped") ?? 0;
  const received = n(fd, "qty_received") ?? 0;
  if (shipped <= 0) return err("تعداد ارسال باید بزرگ‌تر از صفر باشد");
  if (received > shipped) return err("تعداد دریافت‌شده نمی‌تواند از تعداد ارسال‌شده بیشتر باشد");

  // اگر همین کالا قبلاً در همین پارت هست، تخصیص قبلی جایگزین می‌شود
  const [existing] = await sql`
    select id from allocations where item_id = ${itemId} and shipment_id = ${shipmentId}
  `;
  const cap = await itemCapacity(itemId, existing ? Number(existing.id) : undefined);
  if (!cap) return err("کالا پیدا نشد");
  if (shipped > cap.remaining + 0.0005) {
    return err(
      `بیشتر از باقی‌مانده است. از «${cap.label}» فقط ${cap.remaining} عدد باقی مانده (کل ${cap.qty}، تخصیص‌یافته ${cap.allocated}).`
    );
  }

  const [row] = await sql`
    insert into allocations (item_id, shipment_id, qty_shipped, qty_received)
    values (${itemId}, ${shipmentId}, ${shipped}, ${received})
    on conflict (item_id, shipment_id) do update
      set qty_shipped = excluded.qty_shipped, qty_received = excluded.qty_received
    returning id
  `;
  const [sh] = await sql`select shipment_no from shipments where id = ${shipmentId}`;
  await logAudit(
    me,
    existing ? "ویرایش" : "ایجاد",
    "allocation",
    Number(row.id),
    `${cap.label} × ${shipped} در پارت ${sh?.shipment_no ?? shipmentId}`
  );
  revalidatePath(`/shipments/${shipmentId}`);
  revalidatePath("/invoices");
  return ok(`${shipped} عدد به پارت اضافه شد`);
}

export async function updateAllocation(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const me = await requireAuth();
  const id = Number(fd.get("id"));
  const shipmentId = Number(fd.get("shipment_id"));
  const shipped = n(fd, "qty_shipped") ?? 0;
  const received = n(fd, "qty_received") ?? 0;
  if (shipped < 0 || received < 0) return err("تعداد نمی‌تواند منفی باشد");
  if (received > shipped) return err("تعداد دریافت‌شده نمی‌تواند از تعداد ارسال‌شده بیشتر باشد");

  const [alloc] = await sql`select item_id from allocations where id = ${id}`;
  if (!alloc) return err("تخصیص پیدا نشد");

  const cap = await itemCapacity(Number(alloc.item_id), id);
  if (cap && shipped > cap.remaining + 0.0005) {
    return err(`بیشتر از باقی‌مانده است. حداکثر ${cap.remaining} عدد می‌توانید بگذارید.`);
  }

  await sql`
    update allocations set qty_shipped = ${shipped}, qty_received = ${received} where id = ${id}
  `;
  await logAudit(me, "ویرایش", "allocation", id, `${cap?.label ?? "تخصیص"} → ارسال ${shipped}، دریافت ${received}`);
  revalidatePath(`/shipments/${shipmentId}`);
  revalidatePath("/invoices");
  return ok("ذخیره شد");
}

export async function deleteAllocation(fd: FormData) {
  const me = await requireAuth();
  const id = Number(fd.get("id"));
  const [row] = await sql`delete from allocations where id = ${id} returning qty_shipped`;
  if (row) await logAudit(me, "حذف", "allocation", id, `تخصیص ${row.qty_shipped} عدد`);
  revalidatePath(`/shipments/${Number(fd.get("shipment_id"))}`);
  revalidatePath("/invoices");
}

/* ================= قالب‌های اعلان ================= */

function ruleFields(fd: FormData) {
  return {
    name: s(fd, "name"),
    target: s(fd, "target") ?? "invoice",
    trigger_type: s(fd, "trigger_type") ?? "",
    offset_days: n(fd, "offset_days"),
    match_status: s(fd, "match_status"),
    severity: s(fd, "severity") ?? "info",
    title_template: s(fd, "title_template"),
    body_template: s(fd, "body_template"),
  };
}

function validateRule(f: ReturnType<typeof ruleFields>): string | null {
  if (!f.name) return "نام قالب لازم است";
  if (!f.trigger_type) return "نوع شرط را انتخاب کنید";
  if (!f.title_template) return "عنوان اعلان لازم است";
  if (!f.body_template) return "متن اعلان لازم است";

  const spec = TRIGGERS[f.trigger_type];
  if (!spec) return "نوع شرط نامعتبر است";
  if (spec.target !== f.target) return "این شرط با نوع انتخاب‌شده جور نیست";
  if (spec.needsDays && (f.offset_days === null || f.offset_days < 0)) {
    return "تعداد روز را وارد کنید";
  }
  if (spec.needsStatus && !f.match_status) return "وضعیت موردنظر را انتخاب کنید";
  return null;
}

export async function createRule(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const me = await requireAuth();
  const f = ruleFields(fd);
  const problem = validateRule(f);
  if (problem) return err(problem);

  const [row] = await sql`
    insert into notification_rules
      (name, target, trigger_type, offset_days, match_status, severity, title_template, body_template, created_by)
    values (${f.name}, ${f.target}, ${f.trigger_type}, ${f.offset_days}, ${f.match_status},
            ${f.severity}, ${f.title_template}, ${f.body_template}, ${me.id})
    returning id
  `;
  await logAudit(me, "ایجاد", "rule", Number(row.id), `قالب اعلان «${f.name}»`);
  revalidatePath("/notifications/rules");
  return ok(`قالب «${f.name}» ساخته شد`);
}

export async function updateRule(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const me = await requireAuth();
  const id = Number(fd.get("id"));
  const f = ruleFields(fd);
  const problem = validateRule(f);
  if (problem) return err(problem);

  await sql`
    update notification_rules set
      name = ${f.name}, target = ${f.target}, trigger_type = ${f.trigger_type},
      offset_days = ${f.offset_days}, match_status = ${f.match_status},
      severity = ${f.severity}, title_template = ${f.title_template},
      body_template = ${f.body_template},
      is_active = ${fd.get("is_active") === "off" ? false : true}
    where id = ${id}
  `;
  await logAudit(me, "ویرایش", "rule", id, `قالب اعلان «${f.name}»`);
  revalidatePath("/notifications/rules");
  return ok("تغییرات ذخیره شد");
}

export async function toggleRule(fd: FormData) {
  const me = await requireAuth();
  const id = Number(fd.get("id"));
  const [row] = await sql`
    update notification_rules set is_active = not is_active where id = ${id}
    returning name, is_active
  `;
  if (row) {
    await logAudit(me, "ویرایش", "rule", id, `«${row.name}» ${row.is_active ? "فعال" : "غیرفعال"} شد`);
  }
  revalidatePath("/notifications/rules");
}

export async function deleteRule(fd: FormData) {
  const me = await requireAuth();
  const id = Number(fd.get("id"));
  const [row] = await sql`delete from notification_rules where id = ${id} returning name`;
  if (row) await logAudit(me, "حذف", "rule", id, `قالب اعلان «${row.name}» و اعلان‌هایش`);
  revalidatePath("/notifications/rules");
  revalidatePath("/notifications");
}

/* ================= اعلان‌ها ================= */

export async function runRulesNow(): Promise<FormResult> {
  await requireAuth();
  const result = await runRules();
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  return ok(
    result.created > 0
      ? `${result.created} اعلان تازه ساخته شد`
      : "بررسی شد؛ اعلان تازه‌ای نبود"
  );
}

export async function markRead(fd: FormData) {
  await requireAuth();
  const id = Number(fd.get("id"));
  await sql`update notifications set read_at = now() where id = ${id} and read_at is null`;
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

export async function markAllRead() {
  await requireAuth();
  await sql`update notifications set read_at = now() where read_at is null and dismissed_at is null`;
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

export async function dismissNotification(fd: FormData) {
  await requireAuth();
  const id = Number(fd.get("id"));
  await sql`update notifications set dismissed_at = now(), read_at = coalesce(read_at, now()) where id = ${id}`;
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

export async function dismissAll() {
  await requireAuth();
  await sql`
    update notifications set dismissed_at = now(), read_at = coalesce(read_at, now())
    where dismissed_at is null
  `;
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}


/* ================= نقش و دسترسی ================= */

export async function updateUserAccess(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const me = await requireAuth();
  if (!canManageUsers(me.role)) {
    return err("فقط ادمین و صاحب کسب‌وکار می‌توانند دسترسی‌ها را تغییر دهند");
  }

  const id = Number(fd.get("id"));
  const role = ROLES.some((r) => r.value === s(fd, "role")) ? s(fd, "role")! : "staff";
  const useDefaults = fd.get("use_defaults") === "on";

  // اگر ادمین خودش را از مدیریت کاربران بیندازد بیرون، راه برگشتی نمی‌ماند
  const picked = ALL_PERMISSIONS.filter((k) => fd.get(`perm_${k}`) === "on");
  if (id === me.id && !useDefaults && !picked.includes("users")) {
    return err("نمی‌توانید دسترسی «کاربران» را از حساب خودتان بردارید");
  }
  if (id === me.id && useDefaults && !roleDefaults(role).includes("users")) {
    return err("با این نقش، دسترسی شما به «کاربران» قطع می‌شود؛ نقش دیگری انتخاب کنید");
  }

  const permissions: PermissionKey[] | null = useDefaults ? null : picked;

  await sql`
    update users set role = ${role}, permissions = ${
      permissions === null ? null : JSON.stringify(permissions)
    }::jsonb
    where id = ${id}
  `;

  const [u] = await sql`select first_name, last_name from users where id = ${id}`;
  await logAudit(
    me,
    "ویرایش",
    "user",
    id,
    `دسترسی ${u?.first_name ?? ""} ${u?.last_name ?? ""} — نقش ${role}` +
      (permissions ? ` با ${permissions.length} دسترسی دستی` : " با دسترسی پیش‌فرض نقش")
  );
  revalidatePath("/users");
  revalidatePath("/", "layout");
  return ok("دسترسی‌ها ذخیره شد");
}
