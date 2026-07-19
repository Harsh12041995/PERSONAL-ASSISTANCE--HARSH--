/// <reference lib="webworker" />
// Custom service worker (vite-plugin-pwa injectManifest). Handles Workbox
// precaching (offline app shell) plus Web Push + notification clicks.
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { clientsClaim } from "workbox-core";

declare let self: ServiceWorkerGlobalScope & {
    __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// autoUpdate: take control as soon as a new SW is available.
self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

interface PushPayload {
    title?: string;
    body?: string;
    url?: string;
    tag?: string;
}

self.addEventListener("push", (event: PushEvent) => {
    let data: PushPayload = {};
    try {
        data = event.data ? (event.data.json() as PushPayload) : {};
    } catch {
        data = { title: "Personal Portal", body: event.data?.text() };
    }
    const title = data.title || "Personal Portal";
    const options: NotificationOptions = {
        body: data.body || "",
        icon: "/icons/pwa-192.png",
        badge: "/icons/pwa-192.png",
        tag: data.tag,
        data: { url: data.url || "/" },
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
    event.notification.close();
    const target = (event.notification.data && event.notification.data.url) || "/";
    event.waitUntil(
        (async () => {
            const all = await self.clients.matchAll({
                type: "window",
                includeUncontrolled: true,
            });
            for (const client of all) {
                // Focus an existing tab and route it to the target.
                if ("focus" in client) {
                    await client.focus();
                    if ("navigate" in client) {
                        try {
                            await (client as WindowClient).navigate(target);
                        } catch {
                            /* cross-origin or not allowed — ignore */
                        }
                    }
                    return;
                }
            }
            await self.clients.openWindow(target);
        })(),
    );
});
