import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // web-push یک بسته CommonJS با require‌های داخلی است؛ بسته‌بندی‌اش داخل
  // خروجی سرور روی Vercel شکننده است، پس بیرون از باندل نگهش می‌داریم.
  serverExternalPackages: ["web-push"],

  // شناسه همین بیلد؛ کلاینت آن را با /api/version (که همیشه تازه اجرا می‌شود)
  // مقایسه می‌کند تا بفهمد نسخه جدیدی روی سرور دیپلوی شده یا نه.
  env: {
    NEXT_PUBLIC_APP_BUILD: process.env.VERCEL_GIT_COMMIT_SHA ?? String(Date.now()),
  },

  async headers() {
    return [
      {
        // سرویس‌ورکر نباید کش شود، وگرنه به‌روزرسانی‌ها دیر به کاربر می‌رسد
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
