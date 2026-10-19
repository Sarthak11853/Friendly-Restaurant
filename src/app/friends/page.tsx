import FriendButton from "@/components/FriendButton";
import InviteLink from "@/components/InviteLink";
import PersonRow from "@/components/PersonRow";
import { getFriendships } from "@/lib/friends";
import { requireUser } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export default async function FriendsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const { supabase, user } = await requireUser();
  const { friends, incoming, outgoing, statusOf } = await getFriendships(supabase, user.id);
  const { data: me } = await supabase.from("profiles").select("username").eq("id", user.id).single();

  const term = q.trim().replace(/[%_\\,()."]/g, "").slice(0, 50);
  let found: Profile[] = [];
  if (term.length >= 2) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
      .neq("id", user.id)
      .limit(15);
    found = data ?? [];
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Friends</h1>

      <section className="card space-y-2">
        <h2 className="font-semibold">Invite your friends</h2>
        <p className="text-sm text-stone-600">
          Share your link on WhatsApp, or put it in your Instagram / Snapchat bio. Anyone who opens it can add you.
        </p>
        {me && <InviteLink username={me.username} />}
      </section>

      {incoming.length > 0 && (
        <section className="card">
          <h2 className="font-semibold">Friend requests ({incoming.length})</h2>
          <ul className="divide-y divide-stone-100">
            {incoming.map((p) => (
              <PersonRow key={p.id} profile={p}>
                <FriendButton userId={p.id} status="incoming" />
              </PersonRow>
            ))}
          </ul>
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="font-semibold">Find people</h2>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Search by name or @username" className="input" />
          <button className="btn-primary">Search</button>
        </form>
        {term.length >= 2 && (
          <ul className="divide-y divide-stone-100">
            {found.length === 0 && <li className="py-2 text-sm text-stone-500">No one found. Send them your invite link!</li>}
            {found.map((p) => (
              <PersonRow key={p.id} profile={p}>
                <FriendButton userId={p.id} status={statusOf(p.id)} />
              </PersonRow>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="font-semibold">Your friends ({friends.length})</h2>
        {friends.length === 0 ? (
          <p className="py-2 text-sm text-stone-500">No friends yet. Share your invite link to get started.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {friends.map((p) => (
              <PersonRow key={p.id} profile={p} />
            ))}
          </ul>
        )}
      </section>

      {outgoing.length > 0 && (
        <section className="card">
          <h2 className="font-semibold">Sent requests</h2>
          <ul className="divide-y divide-stone-100">
            {outgoing.map((p) => (
              <PersonRow key={p.id} profile={p}>
                <FriendButton userId={p.id} status="outgoing" />
              </PersonRow>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
