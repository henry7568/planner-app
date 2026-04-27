export function registerPlannerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    const serviceWorkerUrl = new URL("../service-worker.js", import.meta.url);
    const serviceWorkerScope = new URL("./", serviceWorkerUrl);

    navigator.serviceWorker
      .register(serviceWorkerUrl, { scope: serviceWorkerScope.pathname })
      .catch((error) => {
        console.error("서비스 워커 등록 오류:", error);
      });
  });
}
