import type { MetadataRoute } from "next";

/** مانیفست وب‌اپ؛ Next آن را روی /manifest.webmanifest سرو می‌کند */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "اپلیکیشن مشرقی",
    short_name: "مشرقی",
    description: "نرم‌افزار مدیریت و پیگیری زنجیره تأمین",
    lang: "fa",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // میان‌برهای فشردن‌طولانی روی آیکن؛ فقط مسیرهای پرکاربرد
    shortcuts: [
      { name: "فاکتورها", url: "/invoices" },
      { name: "پارت‌های ارسال", url: "/shipments" },
      { name: "تسویه‌ها", url: "/payments" },
    ],
  };
}
