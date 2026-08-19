/**
 * تعریف‌های خالص اعلان — بدون دسترسی به دیتابیس،
 * تا کامپوننت‌های کلاینت بتوانند بدون کشیدن درایور postgres واردشان کنند.
 */

/* ---------- انواع شرط ---------- */

export type NotifTarget = "invoice" | "shipment";
export type Severity = "info" | "warning" | "critical";

export const TRIGGERS: Record<
  string,
  { target: NotifTarget; label: string; needsDays: boolean; needsStatus: boolean; help: string }
> = {
  due_soon: {
    target: "invoice",
    label: "نزدیک شدن سررسید",
    needsDays: true,
    needsStatus: false,
    help: "چند روز مانده به سررسید فاکتوری که هنوز مانده دارد",
  },
  overdue: {
    target: "invoice",
    label: "گذشتن از سررسید",
    needsDays: true,
    needsStatus: false,
    help: "چند روز بعد از سررسید، اگر هنوز تسویه نشده باشد",
  },
  invoice_status: {
    target: "invoice",
    label: "رسیدن به وضعیت پرداخت مشخص",
    needsDays: false,
    needsStatus: true,
    help: "هر وقت وضعیت پرداخت فاکتور برابر مقدار انتخابی شد",
  },
  stuck_at_carrier: {
    target: "shipment",
    label: "ماندن نزد کارگو",
    needsDays: true,
    needsStatus: false,
    help: "چند روز از تحویل به کارگو گذشته ولی هنوز خارج نشده",
  },
  long_transit: {
    target: "shipment",
    label: "طولانی شدن مسیر",
    needsDays: true,
    needsStatus: false,
    help: "چند روز از تاریخ خروج گذشته ولی هنوز دریافت نشده",
  },
  shipment_status: {
    target: "shipment",
    label: "رسیدن به وضعیت ارسال مشخص",
    needsDays: false,
    needsStatus: true,
    help: "هر وقت وضعیت پارت برابر مقدار انتخابی شد",
  },
  short_receipt: {
    target: "shipment",
    label: "مغایرت در تحویل",
    needsDays: false,
    needsStatus: false,
    help: "پارت دریافت شده ولی تعداد دریافتی از تعداد ارسالی کمتر است",
  },
};

export const SEVERITIES: { value: Severity; label: string }[] = [
  { value: "info", label: "اطلاع" },
  { value: "warning", label: "هشدار" },
  { value: "critical", label: "بحرانی" },
];

/** متغیرهایی که در متن قالب قابل استفاده‌اند */
export const PLACEHOLDERS: Record<NotifTarget, { key: string; desc: string }[]> = {
  invoice: [
    { key: "شماره", desc: "شماره فاکتور" },
    { key: "تأمین‌کننده", desc: "نام تأمین‌کننده" },
    { key: "مبلغ", desc: "مبلغ کل فاکتور" },
    { key: "پرداختی", desc: "جمع پرداختی" },
    { key: "مانده", desc: "مانده بدهی" },
    { key: "ارز", desc: "واحد پول" },
    { key: "سررسید", desc: "تاریخ سررسید (شمسی)" },
    { key: "وضعیت", desc: "وضعیت پرداخت" },
    { key: "روز", desc: "تعداد روز مربوط به شرط" },
  ],
  shipment: [
    { key: "شماره", desc: "شماره پارت" },
    { key: "فاکتور", desc: "فاکتورهای داخل پارت" },
    { key: "کارگو", desc: "نام کارگو" },
    { key: "نوع_حمل", desc: "نوع حمل" },
    { key: "رهگیری", desc: "شماره رهگیری" },
    { key: "تعداد", desc: "تعداد کل کالای پارت" },
    { key: "دریافتی", desc: "تعداد دریافت‌شده" },
    { key: "وضعیت", desc: "وضعیت ارسال" },
    { key: "روز", desc: "تعداد روز مربوط به شرط" },
  ],
};

/** {نام} را با مقدار جایگزین می‌کند */
export function render(template: string, vars: Record<string, string>): string {
  return template.replace(/\{([^}]+)\}/g, (_, key: string) => vars[key.trim()] ?? `{${key}}`);
}

/* ---------- شکل داده‌ها ---------- */

export type Rule = {
  id: number;
  name: string;
  target: NotifTarget;
  trigger_type: string;
  offset_days: number | null;
  match_status: string | null;
  severity: Severity;
  title_template: string;
  body_template: string;
  is_active: boolean;
};

export type Notification = {
  id: number;
  rule_name: string;
  target: NotifTarget;
  target_id: number | null;
  severity: Severity;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
};
