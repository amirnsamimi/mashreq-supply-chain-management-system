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

    // در حالت توسعه، آدرس فایل‌های /_next/static هش محتوا ندارند. اگر
    // سرویس‌ورکر آن‌ها را کش کند، اولین نسخه تا ابد سرو می‌شود و تغییرات
    // CSS و JS دیده نمی‌شود. پس اینجا ثبتش نمی‌کنیم و اگر از قبل ثبت شده
    // پاکش می‌کنیم تا مرورگرِ توسعه‌دهنده گیر نکند.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) reg.unregister();
      });
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
      return;
    }

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

/* ---------- اعلان روی گوشی (وب‌پوش) ---------- */

/** کلید عمومی VAPID از base64url به آرایه بایت */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type PushState = "loading" | "unsupported" | "needs-install" | "off" | "on" | "denied";

/**
 * روشن/خاموش کردن اعلان روی این دستگاه.
 *
 * نکته iOS: سافاری فقط وقتی PushManager را در اختیار می‌گذارد که برنامه از
 * «افزودن به صفحه اصلی» نصب شده باشد؛ برای همین حالت needs-install جداست.
 */
export function PushToggle({
  publicKey,
  enabled,
}: {
  publicKey: string;
  enabled: boolean;
}) {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!("serviceWorker" in navigator)) return alive && setState("unsupported");

      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

      if (!("PushManager" in window)) {
        return alive && setState(ios && !standalone ? "needs-install" : "unsupported");
      }
      if (Notification.permission === "denied") return alive && setState("denied");

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (alive) setState(sub ? "on" : "off");
    })().catch(() => alive && setState("unsupported"));
    return () => {
      alive = false;
    };
  }, []);

  async function turnOn() {
    setBusy(true);
    setMessage(null);
    try {
      // اجازه باید در پاسخ به لمس کاربر گرفته شود، وگرنه iOS ردش می‌کند
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh: string; auth: string } };
      const { subscribePushAction } = await import("@/lib/actions");
      const res = await subscribePushAction(
        { endpoint: json.endpoint ?? sub.endpoint, keys: json.keys! },
        navigator.userAgent
      );
      setMessage(res?.ok ?? res?.error ?? null);
      setState("on");
    } catch {
      setMessage("روشن کردن اعلان ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    setMessage(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const { unsubscribePushAction } = await import("@/lib/actions");
        await unsubscribePushAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      setMessage("اعلان روی این دستگاه خاموش شد");
    } catch {
      setMessage("خاموش کردن اعلان ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMessage(null);
    try {
      const { sendTestPushAction } = await import("@/lib/actions");
      const res = await sendTestPushAction();
      setMessage(res?.ok ?? res?.error ?? null);
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) {
    return (
      <Row>
        <span className="text-[var(--geist-tertiary)]">
          اعلان روی گوشی هنوز پیکربندی نشده است (کلیدهای VAPID در محیط تعریف نشده‌اند).
        </span>
      </Row>
    );
  }

  if (state === "loading") return <Row>در حال بررسی…</Row>;

  if (state === "needs-install") {
    return (
      <Row>
        <span>
          برای دریافت اعلان روی آیفون، اول برنامه را با دکمه «هم‌رسانی» به صفحه اصلی اضافه کنید و
          بعد از همان‌جا بازش کنید.
        </span>
      </Row>
    );
  }

  if (state === "unsupported") {
    return <Row>این مرورگر از اعلان پشتیبانی نمی‌کند.</Row>;
  }

  if (state === "denied") {
    return (
      <Row>
        <span>
          اجازه اعلان قبلاً رد شده است. از تنظیمات مرورگر یا گوشی برای این سایت اجازه اعلان را روشن
          کنید.
        </span>
      </Row>
    );
  }

  return (
    <Row>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={state === "on" ? turnOff : turnOn}
          className="rounded-[var(--geist-radius)] border border-[var(--geist-border)] px-3 py-1.5 text-xs transition hover:border-[var(--geist-foreground)] disabled:opacity-50"
        >
          {state === "on" ? "خاموش کردن اعلان این دستگاه" : "روشن کردن اعلان روی این دستگاه"}
        </button>
        {state === "on" && (
          <button
            type="button"
            disabled={busy}
            onClick={test}
            className="rounded-[var(--geist-radius)] border border-[var(--geist-border)] px-3 py-1.5 text-xs text-[var(--geist-secondary)] transition hover:border-[var(--geist-foreground)] hover:text-[var(--geist-foreground)] disabled:opacity-50"
          >
            ارسال اعلان آزمایشی
          </button>
        )}
        {message && <span className="text-xs text-[var(--geist-secondary)]">{message}</span>}
      </div>
    </Row>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="text-xs leading-6 text-[var(--geist-secondary)]">{children}</div>;
}
