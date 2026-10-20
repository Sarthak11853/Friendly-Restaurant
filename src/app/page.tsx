import Link from "next/link";
import FriendsMap from "@/components/FriendsMap";
import RemindersCard from "@/components/RemindersCard";
import ReviewCard from "@/components/ReviewCard";
import Stars from "@/components/Stars";
import { friendPicks, type PlaceStats } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";
import type { ReviewWithRelations } from "@/lib/types";
import { dismissVisit } from "./reminders/actions";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <Landing />;

  const [{ data }, { data: visits }] = await Promise.all([
    // RLS limits this to my own and my friends' reviews.
    supabase
      .from("reviews")
      .select("*, author:profiles(id, username, display_name, avatar_url), place:places(*)")
      .order("created_at", { ascending: false })
      .limit(300)
      .returns<ReviewWithRelations[]>(),
    supabase
      .from("visits")
      .select("id, created_at, place:places(id, name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<{ id: string; created_at: string; place: { id: string; name: string } }[]>(),
  ]);
  const reviews = data ?? [];
  const picks = friendPicks(reviews, user.id);
  const feed = reviews.filter((r) => r.user_id !== user.id).slice(0, 30);

  return (
    <div className="space-y-6">
      <RemindersCard />
      {visits && visits.length > 0 && (
        <section className="card">
          <h2 className="font-semibold">📝 To review</h2>
          <ul className="divide-y divide-stone-100">
            {visits.map((v) => (
              <li key={v.id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{v.place.name}</div>
                  <div className="text-xs text-stone-500">
                    Visited {new Date(v.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </div>
                </div>
                <Link href={`/places/${v.place.id}`} className="btn-primary">Rate</Link>
                <form action={dismissVisit.bind(null, v.id)}>
                  <button className="btn-secondary" aria-label={`Skip ${v.place.name}`}>Skip</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
      {picks.length === 0 ? <EmptyFeed /> : <FriendsFeed picks={picks} feed={feed} />}
    </div>
  );
}

function EmptyFeed() {
  return (
    <div className="card space-y-4 text-center">
      <p className="text-4xl">👋</p>
      <h1 className="text-xl font-bold">Your friends haven&apos;t reviewed anything yet</h1>
      <p className="text-stone-600">
        Invite friends to start seeing their favourite places, and review a place you love so they can see yours.
      </p>
      <div className="flex justify-center gap-2">
        <Link href="/friends" className="btn-primary">Invite friends</Link>
        <Link href="/search" className="btn-secondary">Write a review</Link>
      </div>
    </div>
  );
}

function FriendsFeed({ picks, feed }: { picks: PlaceStats[]; feed: ReviewWithRelations[] }) {
  return (
    <>
      <section className="space-y-2">
        <h1 className="text-xl font-bold">Where your friends eat</h1>
        <FriendsMap
          pins={picks.map(({ place, avg, count }) => ({ id: place.id, name: place.name, lat: place.lat, lng: place.lng, avg, count }))}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Top picks from friends</h2>
        <ul className="card divide-y divide-stone-100 py-1">
          {picks.slice(0, 8).map(({ place, avg, count, reviewers }) => (
            <li key={place.id}>
              <Link href={`/places/${place.id}`} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{place.name}</div>
                  <div className="truncate text-xs text-stone-500">
                    {reviewers.slice(0, 3).map((p) => p.display_name || p.username).join(", ")}
                    {count > 3 && ` +${count - 3} more`}
                  </div>
                </div>
                <div className="text-right">
                  <Stars value={avg} className="text-sm" />
                  <div className="text-xs text-stone-500">{avg.toFixed(1)}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Latest from friends</h2>
        {feed.map((r) => (
          <ReviewCard key={r.id} review={r} />
        ))}
      </section>
    </>
  );
}

function Landing() {
  return (
    <div className="space-y-10 py-6">
      <section className="space-y-4 text-center">
        <p className="text-5xl">🍜</p>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Restaurant reviews from <span className="text-brand-500">people you actually know</span>.
        </h1>
        <p className="mx-auto max-w-xl text-lg text-stone-600">
          No paid reviews. No bots. No strangers. Just honest picks from your friends.
        </p>
        <Link href="/login" className="btn-primary px-6 py-3 text-base">
          Get started, it&apos;s free
        </Link>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["👥", "Add your friends", "Share your invite link on WhatsApp, Instagram or Snapchat."],
          ["⭐", "Review places you love", "Rate it, name the dish to try, say if you'd go again."],
          ["🗺️", "Eat with confidence", "See a map of where your friends eat, and skip the fake 5★ reviews."],
        ].map(([icon, title, text]) => (
          <div key={title} className="card text-center">
            <div className="text-3xl">{icon}</div>
            <h3 className="mt-2 font-semibold">{title}</h3>
            <p className="text-sm text-stone-600">{text}</p>
          </div>
        ))}
      </section>
      <p className="text-center text-xs text-stone-500">
        <Link href="/privacy" className="hover:underline">Privacy</Link>
      </p>
    </div>
  );
}
