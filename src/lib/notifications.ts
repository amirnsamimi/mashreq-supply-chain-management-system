import { sql } from "./db";
import { render, type NotifTarget, type Notification, type Rule, type Severity } from "./notification-types";
import { listInvoices, listShipments } from "./queries";
import { money, qty as fq, jalali } from "./format";

export * from "./notification-types";

/* ---------- قالب‌ها ---------- */

export async function listRules(): Promise<Rule[]> {
  const rows = await sql`select * from notification_rules order by target, id`;
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    target: String(r.target) as NotifTarget,
    trigger_type: String(r.trigger_type),
    offset_days: r.offset_days === null ? null : Number(r.offset_days),
    match_status: (r.match_status as string | null) ?? null,
    severity: String(r.severity) as Severity,
    title_template: String(r.title_template),
    body_template: String(r.body_template),
    is_active: Boolean(r.is_active),
  }));
}

/* ---------- اعلان‌ها ---------- */

export async function listNotifications(includeDismissed = false): Promise<Notification[]> {
  const rows = includeDismissed
    ? await sql`select * from notifications order by created_at desc limit 500`
    : await sql`select * from notifications where dismissed_at is null order by created_at desc limit 500`;
  return rows.map((r) => ({
    id: Number(r.id),
    rule_name: String(r.rule_name),
    target: String(r.target) as NotifTarget,
    target_id: r.target_id === null ? null : Number(r.target_id),
    severity: String(r.severity) as Severity,
    title: String(r.title),
    body: String(r.body),
    created_at: new Date(String(r.created_at)).toISOString(),
    read_at: r.read_at ? new Date(String(r.read_at)).toISOString() : null,
  }));
}

export async function unreadCount(): Promise<number> {
  const [r] = await sql`
    select count(*)::int as n from notifications where read_at is null and dismissed_at is null
  `;
  return Number(r.n);
}

/* ---------- موتور ---------- */

const DAY = 86_400_000;
const today = () => new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime();
const daysBetween = (iso: string | null) =>
  iso === null ? null : Math.round((today() - new Date(iso + "T00:00:00Z").getTime()) / DAY);

/**
 * همه قالب‌های فعال را روی داده فعلی اجرا می‌کند و اعلان‌های تازه می‌سازد.
 * با dedupe_key از تکرار جلوگیری می‌شود، پس اجرای مکرر بی‌خطر است.
 */
export async function runRules(): Promise<{ created: number; checked: number }> {
  const rules = (await listRules()).filter((r) => r.is_active);
  if (rules.length === 0) return { created: 0, checked: 0 };

  const needInvoices = rules.some((r) => r.target === "invoice");
  const needShipments = rules.some((r) => r.target === "shipment");
  const invoices = needInvoices ? await listInvoices() : [];
  const shipments = needShipments ? await listShipments() : [];

  type Pending = {
    rule: Rule;
    targetId: number;
    dedupe: string;
    vars: Record<string, string>;
  };
  const pending: Pending[] = [];
  const stamp = new Date().toISOString().slice(0, 10);

  for (const rule of rules) {
    if (rule.target === "invoice") {
      for (const inv of invoices) {
        const vars = {
          "شماره": inv.invoice_no,
          "تأمین‌کننده": inv.supplier ?? "—",
          "مبلغ": money(inv.total_amount),
          "پرداختی": money(inv.paid),
          "مانده": money(inv.balance),
          "ارز": inv.currency ?? "",
          "سررسید": jalali(inv.due_date),
          "وضعیت": inv.payment_status,
          "روز": fq(rule.offset_days ?? 0),
        };
        const overdueDays = daysBetween(inv.due_date);

        if (rule.trigger_type === "due_soon") {
          // مانده دارد و دقیقاً تا n روز دیگر سررسید می‌شود
          if (inv.balance > 0.005 && overdueDays !== null && overdueDays < 0) {
            const left = -overdueDays;
            if (left <= (rule.offset_days ?? 0)) {
              pending.push({
                rule,
                targetId: inv.id,
                dedupe: `${rule.id}:invoice:${inv.id}:${inv.due_date}`,
                vars: { ...vars, "روز": fq(left) },
              });
            }
          }
        } else if (rule.trigger_type === "overdue") {
          if (inv.balance > 0.005 && overdueDays !== null && overdueDays >= (rule.offset_days ?? 0)) {
            // هر روز یک‌بار تکرار می‌شود تا تسویه شود
            pending.push({
              rule,
              targetId: inv.id,
              dedupe: `${rule.id}:invoice:${inv.id}:${stamp}`,
              vars: { ...vars, "روز": fq(overdueDays) },
            });
          }
        } else if (rule.trigger_type === "invoice_status") {
          if (rule.match_status && inv.payment_status === rule.match_status) {
            pending.push({
              rule,
              targetId: inv.id,
              dedupe: `${rule.id}:invoice:${inv.id}:${rule.match_status}`,
              vars,
            });
          }
        }
      }
    } else {
      for (const sh of shipments) {
        const vars = {
          "شماره": sh.shipment_no,
          "فاکتور": sh.invoice_nos || "—",
          "کارگو": sh.carrier ?? "—",
          "نوع_حمل": sh.mode ?? "—",
          "رهگیری": sh.tracking_no ?? "—",
          "تعداد": fq(sh.total_qty),
          "دریافتی": fq(sh.received_qty),
          "وضعیت": sh.status,
          "روز": fq(rule.offset_days ?? 0),
        };

        if (rule.trigger_type === "stuck_at_carrier") {
          const since = daysBetween(sh.handover_date);
          if (!sh.depart_date && since !== null && since >= (rule.offset_days ?? 0)) {
            pending.push({
              rule,
              targetId: sh.id,
              dedupe: `${rule.id}:shipment:${sh.id}:${stamp}`,
              vars: { ...vars, "روز": fq(since) },
            });
          }
        } else if (rule.trigger_type === "long_transit") {
          const since = daysBetween(sh.depart_date);
          if (!sh.receive_date && since !== null && since >= (rule.offset_days ?? 0)) {
            pending.push({
              rule,
              targetId: sh.id,
              dedupe: `${rule.id}:shipment:${sh.id}:${stamp}`,
              vars: { ...vars, "روز": fq(since) },
            });
          }
        } else if (rule.trigger_type === "shipment_status") {
          if (rule.match_status && sh.status === rule.match_status) {
            pending.push({
              rule,
              targetId: sh.id,
              dedupe: `${rule.id}:shipment:${sh.id}:${rule.match_status}`,
              vars,
            });
          }
        } else if (rule.trigger_type === "short_receipt") {
          if (sh.receive_date && sh.received_qty < sh.total_qty - 0.0005) {
            pending.push({
              rule,
              targetId: sh.id,
              dedupe: `${rule.id}:shipment:${sh.id}:short:${sh.receive_date}`,
              vars: {
                ...vars,
                "روز": fq(sh.total_qty - sh.received_qty),
              },
            });
          }
        }
      }
    }
  }

  let created = 0;
  for (const p of pending) {
    const [row] = await sql`
      insert into notifications (rule_id, rule_name, target, target_id, dedupe_key, severity, title, body)
      values (${p.rule.id}, ${p.rule.name}, ${p.rule.target}, ${p.targetId}, ${p.dedupe},
              ${p.rule.severity}, ${render(p.rule.title_template, p.vars)},
              ${render(p.rule.body_template, p.vars)})
      on conflict (dedupe_key) do nothing
      returning id
    `;
    if (row) created++;
  }

  await sql`
    insert into app_state (key, value, updated_at) values ('notif_last_run', ${new Date().toISOString()}, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `;
  return { created, checked: pending.length };
}

/** موتور را حداکثر هر ۱۰ دقیقه یک‌بار اجرا می‌کند */
export async function runRulesThrottled(minMinutes = 10) {
  const [state] = await sql`select value from app_state where key = 'notif_last_run'`;
  if (state?.value) {
    const last = new Date(String(state.value)).getTime();
    if (Date.now() - last < minMinutes * 60_000) return null;
  }
  return runRules();
}

export async function lastRun(): Promise<string | null> {
  const [state] = await sql`select value from app_state where key = 'notif_last_run'`;
  return state?.value ? String(state.value) : null;
}
