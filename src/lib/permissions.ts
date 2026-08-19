/**
 * نقش‌ها و دسترسی‌ها — بدون وابستگی به دیتابیس،
 * تا هم سرور و هم کامپوننت‌های کلاینت بتوانند واردش کنند.
 */

export const PERMISSIONS = [
  { key: "dashboard", label: "داشبورد", path: "/" },
  { key: "suppliers", label: "تأمین‌کنندگان", path: "/suppliers" },
  { key: "products", label: "کالاها", path: "/products" },
  { key: "invoices", label: "فاکتورها", path: "/invoices" },
  { key: "payments", label: "پرداخت‌ها", path: "/payments" },
  { key: "shipments", label: "پارت‌های ارسال", path: "/shipments" },
  { key: "notifications", label: "اعلان‌ها", path: "/notifications" },
  { key: "import", label: "ورود داده", path: "/import" },
  { key: "reports", label: "گزارش‌ها", path: "/reports" },
  { key: "history", label: "تاریخچه", path: "/history" },
  { key: "users", label: "کاربران", path: "/users" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const ALL_PERMISSIONS = PERMISSIONS.map((p) => p.key) as PermissionKey[];

export type Role = "admin" | "owner" | "manager" | "staff";

export const ROLES: {
  value: Role;
  label: string;
  description: string;
  defaults: PermissionKey[];
}[] = [
  {
    value: "admin",
    label: "ادمین",
    description: "دسترسی کامل به همه بخش‌ها",
    defaults: [...ALL_PERMISSIONS],
  },
  {
    value: "owner",
    label: "صاحب کسب‌وکار",
    description: "مثل ادمین، بدون ورود داده",
    defaults: ALL_PERMISSIONS.filter((k) => k !== "import"),
  },
  {
    value: "manager",
    label: "مدیر",
    description: "مثل صاحب کسب‌وکار، بدون تاریخچه و کاربران",
    defaults: ALL_PERMISSIONS.filter((k) => !["import", "history", "users"].includes(k)),
  },
  {
    value: "staff",
    label: "کارشناس",
    description: "مثل مدیر، بدون گزارش‌ها",
    defaults: ALL_PERMISSIONS.filter(
      (k) => !["import", "history", "users", "reports"].includes(k)
    ),
  },
];

export function roleLabel(role: string): string {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

export function roleDefaults(role: string): PermissionKey[] {
  return ROLES.find((r) => r.value === role)?.defaults ?? [];
}

/** دسترسی مؤثر: اگر برای کاربر دسترسی دستی ثبت شده باشد همان، وگرنه پیش‌فرض نقش */
export function effectivePermissions(
  role: string,
  overrides: unknown
): PermissionKey[] {
  if (Array.isArray(overrides)) {
    const valid = overrides.filter((k): k is PermissionKey =>
      ALL_PERMISSIONS.includes(k as PermissionKey)
    );
    // داشبورد همیشه باز است، وگرنه کاربر جایی برای رفتن ندارد
    return valid.includes("dashboard") ? valid : ["dashboard", ...valid];
  }
  return roleDefaults(role);
}

/** فقط این دو نقش می‌توانند کاربر و دسترسی را تغییر دهند */
export function canManageUsers(role: string): boolean {
  return role === "admin" || role === "owner";
}

export function has(permissions: PermissionKey[], key: PermissionKey): boolean {
  return permissions.includes(key);
}
