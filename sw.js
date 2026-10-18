// Service worker: lets the app open and work offline.
// App files: stale-while-revalidate (instant load, refreshed in the background).
// Supabase API calls are never cached here; the app queues changes itself and syncs when back online.
const CACHE = "velaris-shell-v1";
const SHELL = ["./", "index.html", "styles.css", "app.js", "plan.js", "quotes.js", "sync.js", "config.js",
  "vendor/supabase.js", "manifest.webmanifest", "icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  const isFont = /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !isFont) return; // Supabase and everything else: straight to the network
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: sameOrigin });
      const net = fetch(req).then((res) => { if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone()); return res; }).catch(() => null);
      if (hit) { e.waitUntil(net); return hit; }
      return (await net) || (req.mode === "navigate" ? cache.match("index.html") : Response.error());
    })
  );
});
