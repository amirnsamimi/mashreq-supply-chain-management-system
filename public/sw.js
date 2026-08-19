/*
 * سرویس‌ورکر برنامه.
 * سیاست کلی: هیچ صفحه‌ای که داده کاربر دارد کش نمی‌شود؛ فقط دارایی‌های ثابت
 * و یک صفحه «آفلاین» برای وقتی که شبکه قطع است.
 */
const VERSION = "v1";
const STATIC_CACHE = `static-${VERSION}`;
const ASSET_CACHE = `assets-${VERSION}`;
const OFFLINE_URL = "/offline";

// حداقلِ لازم برای نمایش صفحه آفلاین بدون شبکه
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== ASSET_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// اجازه می‌دهد نسخه تازه بدون بستن همه تب‌ها فعال شود
self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

/** دارایی ثابت و نسخه‌دار Next که آدرسش با هر بیلد عوض می‌شود */
function isImmutableAsset(url) {
  return url.pathname.startsWith("/_next/static/");
}

/** فایل‌های داخل public که با تغییر محتوا آدرسشان عوض نمی‌شود */
function isPublicAsset(url) {
  return /^\/(icons|.*\.(?:png|jpg|jpeg|svg|webp|ico|woff2?))/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // فقط GET همین دامنه؛ اکشن‌های سرور، API و درخواست‌های RSC دست‌نخورده می‌مانند
  if (req.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.searchParams.has("_rsc")) return;
  if (req.headers.has("range")) return;

  // ناوبری: همیشه شبکه؛ اگر نبود، صفحه آفلاین. HTML هرگز کش نمی‌شود چون
  // محتوایش به کاربرِ واردشده بستگی دارد.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(OFFLINE_URL, { ignoreSearch: true }).then(
          (cached) =>
            cached ||
            new Response("آفلاین هستید.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
        )
      )
    );
    return;
  }

  // دارایی‌های نسخه‌دار: اول کش (تغییرناپذیرند)
  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(ASSET_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // بقیه دارایی‌ها: کش را نشان بده و هم‌زمان در پس‌زمینه تازه‌اش کن
  if (isPublicAsset(url)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          const network = fetch(req)
            .then((res) => {
              if (res.ok) cache.put(req, res.clone());
              return res;
            })
            .catch(() => cached);
          return cached || network;
        })
      )
    );
  }
});
