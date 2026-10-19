import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "./types";

export type FriendStatus = "self" | "friends" | "incoming" | "outgoing" | "none";

const PROFILE_COLS = "id, username, display_name, avatar_url";

interface FriendshipRow {
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
  requester: Profile;
  addressee: Profile;
}

/** All of the current user's friendships, grouped. */
export async function getFriendships(supabase: SupabaseClient, me: string) {
  const { data } = await supabase
    .from("friendships")
    .select(
      `requester_id, addressee_id, status,
       requester:profiles!friendships_requester_id_fkey(${PROFILE_COLS}),
       addressee:profiles!friendships_addressee_id_fkey(${PROFILE_COLS})`,
    )
    .order("created_at", { ascending: false })
    .returns<FriendshipRow[]>();

  const friends: Profile[] = [];
  const incoming: Profile[] = [];
  const outgoing: Profile[] = [];
  const status = new Map<string, FriendStatus>([[me, "self"]]);

  for (const f of data ?? []) {
    const sentByMe = f.requester_id === me;
    const other = sentByMe ? f.addressee : f.requester;
    const s: FriendStatus = f.status === "accepted" ? "friends" : sentByMe ? "outgoing" : "incoming";
    status.set(other.id, s);
    if (s === "friends") friends.push(other);
    else if (s === "incoming") incoming.push(other);
    else outgoing.push(other);
  }

  return { friends, incoming, outgoing, statusOf: (id: string) => status.get(id) ?? "none" };
}
