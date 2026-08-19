import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE = "khanum_session";

function secret() {
  return process.env.APP_PASSWORD ?? "";
}

function token() {
  return createHmac("sha256", secret()).update("khanum-session-v1").digest("hex");
}

export async function isLoggedIn() {
  if (!secret()) return true; // اگر رمزی تعریف نشده، بدون ورود
  const c = await cookies();
  const v = c.get(COOKIE)?.value ?? "";
  const expected = token();
  if (v.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(v), Buffer.from(expected));
}

export async function requireAuth() {
  if (!(await isLoggedIn())) redirect("/login");
}

export async function signIn(password: string) {
  if (!secret() || password !== secret()) return false;
  const c = await cookies();
  c.set(COOKIE, token(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return true;
}

export async function signOut() {
  const c = await cookies();
  c.delete(COOKIE);
}
