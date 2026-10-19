"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refresh() {
  revalidatePath("/", "layout");
}

export async function sendFriendRequest(targetId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("send_friend_request", { target: targetId });
  if (error) throw new Error(error.message);
  refresh();
}

export async function acceptFriendRequest(requesterId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("accept_friend_request", { requester: requesterId });
  if (error) throw new Error(error.message);
  refresh();
}

/** Cancels a sent request, declines a received one, or unfriends. */
export async function removeFriendship(otherId: string) {
  if (!UUID.test(otherId)) throw new Error("Invalid user");
  const { supabase, user } = await requireUser();
  const me = user.id;
  const { error } = await supabase
    .from("friendships")
    .delete()
    .or(`and(requester_id.eq.${me},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${me})`);
  if (error) throw new Error(error.message);
  refresh();
}
