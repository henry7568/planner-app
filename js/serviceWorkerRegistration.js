export function registerPlannerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    const serviceWorkerUrl = new URL("../service-worker.js", import.meta.url);

    navigator.serviceWorker
      .register(serviceWorkerUrl, { scope: "../" })
      .catch((error) => {
        console.error("서비스 워커 등록 오류:", error);
      });
  });
}
