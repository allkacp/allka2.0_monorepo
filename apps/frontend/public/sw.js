/* Service worker — fundação de Web Push (ata 2026-08, bloco 5/5).
 * Só entra em ação quando o Web Push estiver configurado (chaves VAPID no
 * backend) e o usuário tiver assinado explicitamente. Sem isso, este arquivo
 * fica inerte — nenhuma permissão é pedida automaticamente. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: "Allka", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Allka";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/logo-allka-icon.png",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
