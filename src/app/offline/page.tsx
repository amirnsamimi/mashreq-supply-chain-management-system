import type { Metadata } from "next";

export const metadata: Metadata = { title: "آفلاین" };

/** جایگزینِ سرویس‌ورکر وقتی صفحه‌ای بدون شبکه باز شود. باید کاملاً ایستا بماند. */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--geist-gray-100)] text-[var(--geist-secondary)]">
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 1l22 22" />
          <path d="M16.7 16.7A9 9 0 0 1 12 18" />
          <path d="M5 12.5a7 7 0 0 1 4-2.3M8.5 8.5A11 11 0 0 0 2 9.5" />
          <path d="M22 9.5a11 11 0 0 0-9-3.4" />
          <path d="M12 21h.01" />
        </svg>
      </div>
      <h1 className="text-lg font-semibold tracking-tight">اتصال اینترنت برقرار نیست</h1>
      <p className="text-sm leading-6 text-[var(--geist-secondary)]">
        داده‌های این برنامه روی سرور نگهداری می‌شود، بنابراین برای دیدن فاکتورها و ارسال‌ها به
        اینترنت نیاز دارید. پس از وصل‌شدن دوباره تلاش کنید.
      </p>
      <RetryButton />
    </main>
  );
}

function RetryButton() {
  return (
    <a
      href="/"
      className="rounded-[var(--geist-radius)] bg-[var(--geist-foreground)] px-4 py-2 text-sm font-medium text-[var(--geist-background)] transition hover:opacity-90"
    >
      تلاش دوباره
    </a>
  );
}
