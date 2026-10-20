// Browser-only helpers for visit detection and push notifications.
import { removePushSubscription, savePushSubscription } from "@/app/reminders/actions";

const DETECT_KEY = "fr:detect";
const DISMISSED_KEY = "fr:dismissed";
const DISMISS_HOURS = 12;

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
}

export const detectionEnabled = () => read(DETECT_KEY) === "on";

export function currentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Location isn't available on this device."));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  });
}

/** Asks for location permission (if needed) and turns on visit detection. */
export async function enableDetection() {
  await currentPosition();
  write(DETECT_KEY, "on");
}

export function disableDetection() {
  write(DETECT_KEY, null);
}

type PlaceKey = { provider: string; provider_id: string };
const keyOf = (p: PlaceKey) => `${p.provider}:${p.provider_id}`;

function dismissedMap(): Record<string, number> {
  try {
    return JSON.parse(read(DISMISSED_KEY) ?? "{}");
  } catch {
    return {};
  }
}

/** Remember "Not here" so we don't ask about the same places again for a while. */
export function dismissPlaces(places: PlaceKey[]) {
  const cutoff = Date.now() - DISMISS_HOURS * 3600_000;
  const map = Object.fromEntries(Object.entries(dismissedMap()).filter(([, t]) => t > cutoff));
  for (const p of places) map[keyOf(p)] = Date.now();
  write(DISMISSED_KEY, JSON.stringify(map));
}

export function recentlyDismissed(p: PlaceKey) {
  return (dismissedMap()[keyOf(p)] ?? 0) > Date.now() - DISMISS_HOURS * 3600_000;
}

// ─── Push notifications ───

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export type PushState = "unconfigured" | "unsupported" | "needs-install" | "denied" | "off" | "on";

const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

export async function pushState(): Promise<PushState> {
  if (!VAPID_PUBLIC_KEY) return "unconfigured";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    // iPhones only allow web push for apps added to the Home Screen.
    return isIos() && !isStandalone() ? "needs-install" : "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ? "on" : "off";
}

function base64UrlToBytes(base64Url: string) {
  const base64 = (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

export async function enablePush() {
  if (!VAPID_PUBLIC_KEY) throw new Error("Notifications aren't set up on the server yet.");
  const reg = await navigator.serviceWorker.register("/sw.js");
  if ((await Notification.requestPermission()) !== "granted") throw new Error("Notifications were blocked.");
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY) }));
  await savePushSubscription(sub.toJSON());
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await removePushSubscription(sub.endpoint);
  await sub.unsubscribe();
}
