const CACHE_VERSION = "life-planner-v174";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.webmanifest",
  "./app-icon.svg",
  "./js/app.js",
  "./js/auth.js",
  "./js/aiRecommendations.js",
  "./js/calendar.js",
  "./js/calendarPicker.js",
  "./js/coinLedgerEditor.js",
  "./js/dashboard.js",
  "./js/finance.js",
  "./js/financeExtras.js",
  "./js/financeOcr.js",
  "./js/itemTimeState.js",
  "./js/placeAutocomplete.js",
  "./js/plannerNotifications.js",
  "./js/plannerPreferences.js",
  "./js/plannerItems.js",
  "./js/plannerProjects.js",
  "./js/plannerUI.js",
  "./js/placeUtils.js",
  "./js/popupGuards.js",
  "./js/productivityReport.js",
  "./js/renderItems.js",
  "./js/rewards.js",
  "./js/routines.js",
  "./js/quickInput.js",
  "./js/rewardLedgerActions.js",
  "./js/repeat.js",
  "./js/serviceWorkerRegistration.js",
  "./js/storage.js",
  "./js/timePicker.js",
  "./js/utils.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![APP_SHELL_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

function isAppShellRequest(requestUrl) {
  return requestUrl.origin === self.location.origin;
}

function isRuntimeCacheTarget(requestUrl) {
  return (
    requestUrl.origin.includes("gstatic.com") ||
    requestUrl.origin.includes("jsdelivr.net")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const requestUrl = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("./index.html")),
    );
    return;
  }

  if (isAppShellRequest(requestUrl)) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(APP_SHELL_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return networkResponse;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  if (isRuntimeCacheTarget(requestUrl)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const networkFetch = fetch(request)
          .then((networkResponse) => {
            const responseClone = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || networkFetch;
      }),
    );
  }
});
