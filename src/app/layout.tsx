import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Suspense } from "react";
import { GuideMount } from "@/components/GuideMount";
import { OfflineBanner, ServiceWorkerRegistrar } from "@/components/PWA";

// فونت فارسی روی سرور خودمان میزبانی می‌شود (بدون وابستگی به CDN)
const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  title: "پیگیری فاکتور و ارسال چندپارتی",
  description: "مدیریت فاکتورها، اقلام، پارت‌های ارسال و تسویه",
  applicationName: "مشرقی",
  appleWebApp: {
    capable: true,
    title: "مشرقی",
    // نوار وضعیت هم‌رنگ صفحه تا در حالت نصب‌شده یکدست دیده شود
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  // رنگ نوار مرورگر در حالت نصب‌شده، هماهنگ با تم روشن و تیره
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  // تا صفحه زیر نوارهای مرورگر و ناحیه امن هم کشیده شود
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className={`${vazirmatn.variable} ${GeistMono.variable}`}
      // اسکریپت زیر data-theme را قبل از hydrate شدن React ست می‌کند
      suppressHydrationWarning
    >
      <head>
        {/* قبل از رنگ‌آمیزی صفحه، انتخاب ذخیره‌شده کاربر اعمال شود تا پرش رنگ نبینیم */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var d=document.documentElement;" +
              "var t=localStorage.getItem('khanum-theme');if(t==='dark'||t==='light')d.setAttribute('data-theme',t);" +
              "var c=localStorage.getItem('khanum-calendar');if(c==='gregorian'||c==='jalali')d.setAttribute('data-calendar',c);" +
              "}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-screen">
        <OfflineBanner />
        {children}
        <ServiceWorkerRegistrar />
        {/* راهنمای گام‌به‌گام؛ بیرون از صفحه‌ها تا با تغییر مسیر بسته نشود */}
        <Suspense fallback={null}>
          <GuideMount />
        </Suspense>
      </body>
    </html>
  );
}
