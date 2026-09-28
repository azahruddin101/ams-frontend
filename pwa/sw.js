/* AMS service worker. Served at /sw.js by app/sw.js/route.js, which stamps __BUILD_ID__ with the build it belongs to:
 * every release is therefore a NEW worker, so the browser notices it, the "new version" banner appears, and the caches of
 * the previous release are dropped instead of piling up.
 *
 *  • Never touches /api/*: attendance must be verified online and auth data must never be cached.
 *  • Static, hashed assets (/_next/static) and face models: cache-first (immutable).
 *  • Icons: stale-while-revalidate.  Page navigations: network-first, branded /offline page when the network is gone.
 *  • Updates are NOT applied silently: a new worker waits until the app tells it to SKIP_WAITING (the user taps "Refresh"),
 *    so a scan in progress is never interrupted by a reload.
 */
const VERSION = "__BUILD_ID__";
const SHELL = `ams-shell-${VERSION}`;
const STATIC = `ams-static-${VERSION}`;
const MODELS = "ams-models-v1"; // model files never change name/content: keep across releases
const OFFLINE_URL = "/offline";
const MODEL_FILES = [
  "tiny_face_detector_model-weights_manifest.json", "tiny_face_detector_model.bin",
  "face_landmark_68_tiny_model-weights_manifest.json", "face_landmark_68_tiny_model.bin",
  "face_recognition_model-weights_manifest.json", "face_recognition_model.bin",
].map((f) => `/models/${f}`);

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL);
    await shell.addAll(["/icons/icon-192.png", "/icons/icon-512.png"]);
    // The offline page needs its own CSS/JS to render with no network: cache the page AND the hashed assets it references.
    try {
      const res = await fetch(OFFLINE_URL, { cache: "reload" });
      if (res.ok) {
        await shell.put(OFFLINE_URL, res.clone());
        const html = await res.text();
        const assets = [...new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]))];
        const statics = await caches.open(STATIC);
        await Promise.allSettled(assets.map((u) => statics.add(u)));
      }
    } catch { /* offline during install: the page is cached on first successful visit instead */ }
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL, STATIC, MODELS]);
    await Promise.all((await caches.keys()).filter((k) => !keep.has(k)).map((k) => caches.delete(k)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable().catch(() => {});
    await self.clients.claim();
    const models = await caches.open(MODELS); // warm the face models so the first scan is fast
    await Promise.allSettled(MODEL_FILES.map((u) => models.match(u).then((hit) => hit ?? models.add(u))));
  })());
});

const cacheFirst = (cacheName) => async (request) => {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
};
const staleWhileRevalidate = (cacheName) => async (request) => {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const refresh = fetch(request).then((res) => { if (res.ok) cache.put(request, res.clone()); return res; }).catch(() => hit);
  return hit ?? refresh;
};

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/models/")) return event.respondWith(cacheFirst(MODELS)(req));
  if (url.pathname.startsWith("/_next/static/")) return event.respondWith(cacheFirst(STATIC)(req));
  if (url.pathname.startsWith("/icons/")) return event.respondWith(staleWhileRevalidate(SHELL)(req));

  if (req.mode === "navigate") {
    event.respondWith((async () => {
      const offline = async () => (await caches.match(OFFLINE_URL, { cacheName: SHELL })) ?? null;
      try {
        const res = (await event.preloadResponse) ?? (await fetch(req));
        // The server is unreachable behind its proxy (restart, deploy): show our page, not a bare gateway error.
        if ([502, 503, 504].includes(res.status)) return (await offline()) ?? res;
        return res;
      } catch {
        return (await offline()) ?? Response.error();
      }
    })());
  }
});

// Web Push foundation (server-side sending is not wired yet — see docs).
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data?.json() ?? {}; } catch { data = { body: event.data?.text() }; } // a plain-text push must not throw
  event.waitUntil(self.registration.showNotification(data.title ?? "AMS", { body: data.body, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: data.url }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Only ever open our own pages, and reuse the app window that is already open instead of stacking new ones.
  let target;
  try { target = new URL(event.notification.data ?? "/", self.location.origin); } catch { target = new URL("/", self.location.origin); }
  if (target.origin !== self.location.origin) target = new URL("/", self.location.origin);
  event.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const app = open.find((c) => new URL(c.url).origin === self.location.origin);
    if (!app) return self.clients.openWindow(target.href);
    await app.focus();
    return app.navigate?.(target.href).catch(() => {});
  })());
});
