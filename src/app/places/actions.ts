"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { savePlace } from "@/lib/places";
import { requireUser } from "@/lib/supabase/server";
import type { PlaceCandidate } from "@/lib/types";

/** Saves a signed search result as a place (if new) and opens its page. */
export async function openPlace(candidate: PlaceCandidate) {
  await requireUser();
  redirect(`/places/${await savePlace(candidate)}`);
}

export async function saveReview(placeId: string, _prev: unknown, form: FormData) {
  const { supabase, user } = await requireUser();
  const text = (key: string, max: number) => String(form.get(key) ?? "").trim().slice(0, max) || null;
  const int = (key: string) => (form.get(key) ? Number(form.get(key)) : null);
  const wouldReturn = form.get("would_return");

  const rating = int("rating");
  if (!rating || rating < 1 || rating > 5) return { error: "Please pick a star rating." };

  const { error } = await supabase.from("reviews").upsert(
    {
      user_id: user.id,
      place_id: placeId,
      rating,
      body: text("body", 2000),
      must_try: text("must_try", 120),
      price_level: int("price_level"),
      would_return: wouldReturn === "yes" ? true : wouldReturn === "no" ? false : null,
      visited_on: text("visited_on", 10),
    },
    { onConflict: "user_id,place_id" },
  );
  if (error) return { error: error.message };

  revalidatePath(`/places/${placeId}`);
  revalidatePath("/");
  return { error: null, saved: true };
}

export async function deleteReview(placeId: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("reviews").delete().eq("place_id", placeId).eq("user_id", user.id);
  revalidatePath(`/places/${placeId}`);
  revalidatePath("/");
}
