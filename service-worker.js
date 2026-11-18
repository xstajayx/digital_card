// Only cache public, unpersonalised app-shell resources. Never cache card links,
// viewer pages, API responses, uploaded photos, drafts or message payloads.
const CACHE = "silent-hello-shell-v1";
const SHELL = ["./", "./index.html", "./studio.html", "./assets/app.css", "./assets/shop.css", "./assets/creator.css", "./assets/fonts.css", "./assets/app-icon.svg"];
const ROOT = new URL("./", self.location.href);
const shellPaths = new Set(SHELL.map((path) => new URL(path, ROOT).pathname));
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then(async (cache) => {
    await Promise.allSettled(SHELL.map(async (path) => {
      const response = await fetch(new URL(path, ROOT), { cache: "reload" });
      if (response.ok) await cache.put(new URL(path, ROOT), response);
    }));
  }));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("silent-hello-shell-") && key !== CACHE).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate") return;
  const url = new URL(request.url);
  if (url.origin !== ROOT.origin || url.search || url.hash || !shellPaths.has(url.pathname)) return;
  event.respondWith(fetch(request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
    }
    return response;
  }).catch(async () => (await caches.match(request)) || Response.error()));
});
