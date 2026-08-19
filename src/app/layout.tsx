import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "پیگیری فاکتور و ارسال چندپارتی",
  description: "مدیریت فاکتورها، اقلام، پارت‌های ارسال و تسویه",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css"
        />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
