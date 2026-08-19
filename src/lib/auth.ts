import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { sql } from "./db";
import {
  effectivePermissions,
  type PermissionKey,
  type Role,
} from "./permissions";

const COOKIE = "khanum_session";
const MAX_AGE = 60 * 60 * 24 * 30; // ۳۰ روز

export type SessionUser = {
  id: number;
  phone: string;
  first_name: string;
  last_name: string;
  role: Role;
  permissions: PermissionKey[];
};

/* ---------- رمز عبور: scrypt با نمک تصادفی ---------- */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password.normalize("NFKC"), salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const candidate = scryptSync(password.normalize("NFKC"), salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

/* ---------- نشست: کوکی امضاشده با HMAC ---------- */

function secret(): string {
  const s = process.env.AUTH_SECRET ?? process.env.APP_PASSWORD;
  if (!s) throw new Error("AUTH_SECRET تعریف نشده است");
  return s;
}

function sign(userId: number): string {
  const mac = createHmac("sha256", secret()).update(String(userId)).digest("hex");
  return `${userId}.${mac}`;
}

function unsign(token: string): number | null {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const id = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = createHmac("sha256", secret()).update(id).digest("hex");
  if (mac.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  const n = Number(id);
  return Number.isInteger(n) ? n : null;
}

/* ---------- API ---------- */

/** آیا اصلاً کاربری ساخته شده است؟ (برای صفحه راه‌اندازی اولیه) */
export async function hasUsers(): Promise<boolean> {
  const [r] = await sql`select count(*)::int as n from users`;
  return Number(r.n) > 0;
}

export async function currentUser(): Promise<SessionUser | null> {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (!token) return null;
  const id = unsign(token);
  if (id === null) return null;
  const rows = await sql`
    select id, phone, first_name, last_name, role, permissions
    from users where id = ${id} and is_active
  `;
  if (!rows.length) return null;
  const r = rows[0];
  return {
    id: Number(r.id),
    phone: String(r.phone),
    first_name: String(r.first_name),
    last_name: String(r.last_name),
    role: String(r.role) as Role,
    permissions: effectivePermissions(String(r.role), r.permissions),
  };
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * دسترسی به یک بخش را الزامی می‌کند.
 * کاربر بدون دسترسی به داشبورد برمی‌گردد، نه صفحه ورود.
 */
export async function requirePermission(key: PermissionKey): Promise<SessionUser> {
  const user = await requireAuth();
  if (!user.permissions.includes(key)) redirect("/?denied=" + key);
  return user;
}

export async function startSession(userId: number) {
  const c = await cookies();
  c.set(COOKIE, sign(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function signOut() {
  const c = await cookies();
  c.delete(COOKIE);
}

/** فقط رقم‌ها را نگه می‌دارد تا ۰۹۱۲... و ۰۹۱۲-... یکسان شوند */
export function normalizePhone(input: string): string {
  const faMap: Record<string, string> = {
    "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
    "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  };
  return input.replace(/[۰-۹٠-٩]/g, (d) => faMap[d] ?? d).replace(/\D/g, "");
}
