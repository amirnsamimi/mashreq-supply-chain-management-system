import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

// فونت فارسی روی سرور خودمان میزبانی می‌شود (بدون وابستگی به CDN)
const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  title: "پیگیری فاکتور و ارسال چندپارتی",
  description: "مدیریت فاکتورها، اقلام، پارت‌های ارسال و تسویه",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
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
              "try{var t=localStorage.getItem('khanum-theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t)}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
