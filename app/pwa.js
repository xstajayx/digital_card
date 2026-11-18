// Optional progressive enhancement: normal web browsing works without service workers.
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js", { scope: "./" }).catch(() => {
      // Installation/offline support is optional; never interrupt card creation.
    });
  }, { once: true });
}
