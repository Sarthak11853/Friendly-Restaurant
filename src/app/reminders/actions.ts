"use server";

import { revalidatePath } from "next/cache";
import { nearbyPlaces, savePlace } from "@/lib/places";
import { sendPush } from "@/lib/push";
import { createServiceClient, requireUser } from "@/lib/supabase/server";
import type { PlaceCandidate } from "@/lib/types";

const REMIND_AFTER_MINUTES = 90;
const QUIET_HOURS = 12;

/**
 * Returns up to 3 food places the user is probably at right now, or [] when
 * there's nothing to ask about (no place close enough, already reviewed, or
 * already asked recently). Coordinates are used for the lookup only, never stored.
 */
export async function checkNearby(lat: number, lng: number, accuracy: number) {
  const { supabase, user } = await requireUser();
  if (![lat, lng, accuracy].every(Number.isFinite) || accuracy > 150) return [];

  const radius = Math.min(Math.max(accuracy, 35), 80);
  const nearby = (await nearbyPlaces(lat, lng, radius).catch(() => [])).slice(0, 3);
  if (nearby.length === 0) return [];

  // Skip the prompt if the closest place was already reviewed or asked about recently.
  const closest = nearby[0];
  const { data: place } = await supabase
    .from("places")
    .select("id")
    .eq("provider", closest.provider)
    .eq("provider_id", closest.provider_id)
    .maybeSingle();
  if (place) {
    const since = new Date(Date.now() - QUIET_HOURS * 3600_000).toISOString();
    const [{ count: reviewed }, { count: recent }] = await Promise.all([
      supabase.from("reviews").select("id", { count: "exact", head: true }).eq("place_id", place.id).eq("user_id", user.id),
      supabase.from("visits").select("id", { count: "exact", head: true }).eq("place_id", place.id).gte("created_at", since),
    ]);
    if (reviewed || recent) return [];
  }
  return nearby;
}

/** Saves the visit and schedules a "How was it?" notification. */
export async function remindLater(candidate: PlaceCandidate) {
  const { supabase } = await requireUser();
  const placeId = await savePlace(candidate);
  const remindAt = new Date(Date.now() + REMIND_AFTER_MINUTES * 60_000).toISOString();
  const { error } = await supabase.from("visits").insert({ place_id: placeId, remind_at: remindAt });
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function dismissVisit(visitId: string) {
  const { supabase } = await requireUser();
  await supabase.from("visits").update({ status: "dismissed" }).eq("id", visitId);
  revalidatePath("/");
}

interface BrowserSubscription {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

export async function savePushSubscription(sub: BrowserSubscription) {
  const { user } = await requireUser();
  const { endpoint, keys } = sub;
  if (!endpoint?.startsWith("https://") || !keys?.p256dh || !keys.auth) throw new Error("Invalid subscription");
  // Upsert with the secret key: the same device may have belonged to another account before.
  const { error } = await createServiceClient()
    .from("push_subscriptions")
    .upsert({ endpoint, user_id: user.id, p256dh: keys.p256dh, auth: keys.auth }, { onConflict: "endpoint" });
  if (error) throw new Error(error.message);
}

export async function removePushSubscription(endpoint: string) {
  const { user } = await requireUser();
  await createServiceClient().from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id);
}

export async function sendTestPush() {
  const { user } = await requireUser();
  await sendPush([user.id], {
    title: "Notifications are on 🎉",
    body: "We'll ping you to rate places you visit, and when friends add you.",
    url: "/me",
    tag: "test",
  });
}
