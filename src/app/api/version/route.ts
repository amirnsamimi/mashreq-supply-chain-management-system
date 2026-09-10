import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * نسخه واقعاً دیپلوی‌شده روی سرور را برمی‌گرداند (نه چیزی که کلاینت قدیمی حفظ کرده).
 * کلاینت این را با NEXT_PUBLIC_APP_BUILD خودش مقایسه می‌کند تا بفهمد نسخه جدیدی آمده.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  return NextResponse.json({ build: process.env.VERCEL_GIT_COMMIT_SHA ?? "" });
}
