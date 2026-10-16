self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  const target = new URL("./", self.registration.scope).href;
  event.waitUntil(self.registration.showNotification(data.title || "Calendario Ufficio Tecnico", {
    body: data.body || "Il calendario è stato aggiornato.",
    tag: data.tag || "calendar-update",
    icon: new URL("./calendar-icon-192.png", self.registration.scope).href,
    data: { url: data.url || target },
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = event.notification.data?.url || new URL("./", self.registration.scope).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type:"window", includeUncontrolled:true });
    for (const client of windows) {
      if (client.url.startsWith(self.registration.scope) && "focus" in client) {
        await client.navigate(target); return client.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
