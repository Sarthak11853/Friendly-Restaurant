import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import FriendButton from "@/components/FriendButton";
import ReviewCard from "@/components/ReviewCard";
import { getFriendships } from "@/lib/friends";
import { requireUser } from "@/lib/supabase/server";
import type { Profile, ReviewWithRelations } from "@/lib/types";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("username", username.toLowerCase())
    .maybeSingle<Profile>();
  if (!profile) notFound();

  const [{ statusOf }, { data: reviews }] = await Promise.all([
    getFriendships(supabase, user.id),
    // Empty unless we're friends (or it's me), thanks to RLS.
    supabase
      .from("reviews")
      .select("*, place:places(*)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .returns<Omit<ReviewWithRelations, "author">[]>(),
  ]);
  const status = statusOf(profile.id);
  const name = profile.display_name || profile.username;

  return (
    <div className="space-y-6">
      <section className="card flex flex-col items-center gap-3 text-center">
        <Avatar profile={profile} size={80} />
        <div>
          <h1 className="text-2xl font-bold">{name}</h1>
          <p className="text-stone-500">@{profile.username}</p>
        </div>
        {status === "self" ? (
          <Link href="/me" className="btn-secondary">Edit profile</Link>
        ) : (
          <FriendButton userId={profile.id} status={status} />
        )}
        {status === "incoming" && <p className="text-sm text-stone-600">{name} sent you a friend request.</p>}
      </section>

      {status === "self" || status === "friends" ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            {status === "self" ? "Your" : `${name}'s`} reviews ({reviews?.length ?? 0})
          </h2>
          {reviews?.length ? (
            reviews.map((r) => <ReviewCard key={r.id} review={{ ...r, author: profile }} />)
          ) : (
            <p className="text-sm text-stone-500">No reviews yet.</p>
          )}
        </section>
      ) : (
        <p className="card text-center text-stone-600">🔒 Become friends with {name} to see where they like to eat.</p>
      )}
    </div>
  );
}
