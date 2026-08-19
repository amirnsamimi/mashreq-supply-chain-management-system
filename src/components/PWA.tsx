"use client";

import { useEffect, useState } from "react";

/* ---------- ثبت سرویس‌ورکر ---------- */

/**
 * سرویس‌ورکر را ثبت می‌کند و اگر نسخه تازه‌ای آماده شد، پس از فعال‌شدنش
 * صفحه را یک‌بار نو می‌کند تا کاربر روی نسخه قدیمی نماند.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        // اگر نسخه‌ای در حال انتظار است، همین حالا جایش را بگیرد
        if (reg.waiting) reg.waiting.postMessage("skip-waiting");
        reg.addEventListener("updatefound", () => {
          const next = reg.installing;
          if (!next) return;
          next.addEventListener("statechange", () => {
            // فقط وقتی نسخه قبلی وجود داشته، یعنی این یک به‌روزرسانی است
            if (next.state === "installed" && navigator.serviceWorker.controller) {
              next.postMessage("skip-waiting");
            }
          });
        });
      })
      .catch(() => null);

    return () =>
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  return null;
}

/* ---------- نوار وضعیت آفلاین ---------- */

/** وقتی مرورگر آفلاین می‌شود یک نوار باریک بالای صفحه نشان می‌دهد */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-50 bg-[var(--geist-amber-lighter)] px-4 py-1.5 text-center text-xs text-[var(--geist-amber-text)]"
    >
      اتصال اینترنت قطع است؛ اطلاعات ممکن است به‌روز نباشد.
    </div>
  );
}

/* ---------- دکمه نصب ---------- */

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * روی کروم/اج دکمه نصب واقعی نشان می‌دهد و روی iOS فقط راهنمای «افزودن به
 * صفحه اصلی»، چون سافاری رویداد نصب ندارد. اگر برنامه نصب شده باشد چیزی
 * نشان داده نمی‌شود.
 */
export function InstallButton() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [standalone, setStandalone] = useState(true); // تا وقتی مطمئن نشدیم چیزی نشان نده
  const [hint, setHint] = useState(false);

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true
    );
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone) return null;
  if (!deferred && !ios) return null;

  async function install() {
    if (!deferred) {
      setHint((v) => !v);
      return;
    }
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={install}
        title="نصب برنامه"
        aria-label="نصب برنامه"
        className="flex h-7 items-center gap-1 rounded-full border border-[var(--geist-border)] px-2 text-xs text-[var(--geist-secondary)] transition hover:text-[var(--geist-foreground)]"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3v12" />
          <path d="M8 11l4 4 4-4" />
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        نصب
      </button>
      {hint && (
        <p className="absolute top-9 left-0 z-50 w-56 rounded-[var(--geist-radius)] border border-[var(--geist-border)] bg-[var(--geist-background)] p-2.5 text-right text-xs leading-5 text-[var(--geist-secondary)] shadow-[var(--geist-shadow)]">
          در سافاری، دکمه «هم‌رسانی» را بزنید و گزینه «Add to Home Screen» را انتخاب کنید.
        </p>
      )}
    </div>
  );
}
