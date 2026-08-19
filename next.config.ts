import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // web-push یک بسته CommonJS با require‌های داخلی است؛ بسته‌بندی‌اش داخل
  // خروجی سرور روی Vercel شکننده است، پس بیرون از باندل نگهش می‌داریم.
  serverExternalPackages: ["web-push"],

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
