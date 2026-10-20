"use server";

import { revalidatePath } from "next/cache";
import { sendPush } from "@/lib/push";
import { requireUser } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refresh() {
  revalidatePath("/", "layout");
}

type Supabase = Awaited<ReturnType<typeof requireUser>>["supabase"];

async function myName(supabase: Supabase, id: string) {
  const { data } = await supabase.from("profiles").select("username, display_name").eq("id", id).single();
  return { username: data?.username ?? "", name: data?.display_name || data?.username || "Someone" };
}

export async function sendFriendRequest(targetId: string) {
  const { supabase, user } = await requireUser();
  const { data: status, error } = await supabase.rpc("send_friend_request", { target: targetId });
  if (error) throw new Error(error.message);

  const me = await myName(supabase, user.id);
  if (status === "pending") {
    await sendPush([targetId], {
      title: `${me.name} wants to be friends`,
      body: "Accept to see each other's restaurant reviews.",
      url: "/friends",
      tag: `friend-${user.id}`,
    });
  } else if (status === "accepted") {
    await notifyAccepted(targetId, me);
  }
  refresh();
}

export async function acceptFriendRequest(requesterId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.rpc("accept_friend_request", { requester: requesterId });
  if (error) throw new Error(error.message);
  await notifyAccepted(requesterId, await myName(supabase, user.id));
  refresh();
}

async function notifyAccepted(userId: string, me: { username: string; name: string }) {
  await sendPush([userId], {
    title: `You and ${me.name} are now friends`,
    body: "See where they like to eat.",
    url: `/u/${me.username}`,
  });
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
