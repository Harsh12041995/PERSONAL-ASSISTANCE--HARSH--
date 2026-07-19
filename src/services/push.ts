// src/services/push.ts
// Browser-side Web Push lifecycle: feature detection, permission request,
// subscribe/unsubscribe against the service worker + backend.
import { pushApi } from "./personalApi";

export const isPushSupported = () =>
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

export const notificationPermission = (): NotificationPermission =>
    isPushSupported() ? Notification.permission : "denied";

// VAPID public keys are base64url; the PushManager wants a Uint8Array.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = window.atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
}

/**
 * Ensure the browser is subscribed to push and the subscription is saved
 * server-side. Returns a status the UI can surface.
 */
export async function enablePush(): Promise<
    { ok: true } | { ok: false; reason: string }
> {
    if (!isPushSupported()) return { ok: false, reason: "unsupported" };

    const { enabled, publicKey } = await pushApi.vapid();
    if (!enabled || !publicKey)
        return { ok: false, reason: "server-not-configured" };

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: "denied" };

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
        sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
    }
    const json = sub.toJSON();
    await pushApi.subscribe({
        endpoint: sub.endpoint,
        keys: {
            p256dh: json.keys?.p256dh || "",
            auth: json.keys?.auth || "",
        },
    });
    return { ok: true };
}

export async function disablePush(): Promise<void> {
    if (!isPushSupported()) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
        await pushApi.unsubscribe(sub.endpoint).catch(() => { });
        await sub.unsubscribe().catch(() => { });
    }
}

export async function isSubscribed(): Promise<boolean> {
    if (!isPushSupported()) return false;
    try {
        const reg = await navigator.serviceWorker.ready;
        return !!(await reg.pushManager.getSubscription());
    } catch {
        return false;
    }
}
