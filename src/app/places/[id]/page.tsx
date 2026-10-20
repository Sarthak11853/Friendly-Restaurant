import Link from "next/link";
import { notFound } from "next/navigation";
import ReviewCard from "@/components/ReviewCard";
import Stars from "@/components/Stars";
import { mapsUrl } from "@/lib/places";
import { requireUser } from "@/lib/supabase/server";
import type { Place, Profile, Review } from "@/lib/types";
import ReviewForm from "./ReviewForm";

export default async function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const [{ data: place }, { data: rows }] = await Promise.all([
    supabase.from("places").select("*").eq("id", id).maybeSingle<Place>(),
    // RLS only returns my review and my friends' reviews.
    supabase
      .from("reviews")
      .select("*, author:profiles(id, username, display_name, avatar_url)")
      .eq("place_id", id)
      .order("created_at", { ascending: false })
      .returns<(Review & { author: Profile })[]>(),
  ]);
  if (!place) notFound();

  const reviews = (rows ?? []).map((r) => ({ ...r, place }));
  const mine = reviews.find((r) => r.user_id === user.id);
  const friends = reviews.filter((r) => r.user_id !== user.id);
  const avg = friends.length ? friends.reduce((s, r) => s + r.rating, 0) / friends.length : null;
  const goAgain = friends.filter((r) => r.would_return).length;

  return (
    <div className="space-y-6">
      <section className="card space-y-3">
        <div>
          <h1 className="text-2xl font-bold">{place.name}</h1>
          <p className="text-sm text-stone-500">{[place.category, place.address].filter(Boolean).join(" · ")}</p>
        </div>
        {avg != null ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">{avg.toFixed(1)}</span>
              <div>
                <Stars value={avg} />
                <div className="text-xs text-stone-500">
                  from {friends.length} friend{friends.length > 1 ? "s" : ""}
                </div>
              </div>
            </div>
            {goAgain > 0 && (
              <span className="text-sm text-stone-600">
                👍 {goAgain} of {friends.length} would go again
              </span>
            )}
          </div>
        ) : (
          <p className="text-stone-600">None of your friends have reviewed this place yet.</p>
        )}
        <a href={mapsUrl(place)} target="_blank" rel="noopener noreferrer" className="btn-secondary">
          📍 Directions in Google Maps
        </a>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{mine ? "Your review" : "Been here? Leave a review"}</h2>
        <ReviewForm key={mine ? "edit" : "new"} placeId={place.id} review={mine} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">What your friends say</h2>
        {friends.length ? (
          friends.map((r) => <ReviewCard key={r.id} review={r} showPlace={false} />)
        ) : (
          <p className="text-sm text-stone-500">
            No friend reviews yet. <Link href="/friends" className="text-brand-600 underline">Invite friends</Link> to see their picks.
          </p>
        )}
      </section>
    </div>
  );
}
