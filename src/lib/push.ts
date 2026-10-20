import webpush from "web-push";
import "server-only";
import { createServiceClient } from "./supabase/server";

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  /** Notifications with the same tag replace each other instead of stacking. */
  tag?: string;
}

export const pushConfigured = () => !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

/** Sends a notification to every device of the given users. Never throws. */
export async function sendPush(userIds: string[], payload: PushPayload) {
  if (!pushConfigured() || userIds.length === 0) return;
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@example.com",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
    const admin = createServiceClient();
    const { data: subs } = await admin.from("push_subscriptions").select("endpoint, p256dh, auth").in("user_id", userIds);

    await Promise.all(
      (subs ?? []).map(async ({ endpoint, p256dh, auth }) => {
        try {
          await webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, JSON.stringify(payload), { TTL: 6 * 3600 });
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          // The browser unsubscribed or the app was uninstalled.
          if (status === 404 || status === 410) await admin.from("push_subscriptions").delete().eq("endpoint", endpoint);
          else console.error("push failed", status, e);
        }
      }),
    );
  } catch (e) {
    console.error("sendPush failed", e);
  }
}
