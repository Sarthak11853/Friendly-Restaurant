"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServiceClient, requireUser } from "@/lib/supabase/server";

export async function updateProfile(_prev: unknown, form: FormData) {
  const { supabase, user } = await requireUser();
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const display_name = String(form.get("display_name") ?? "").trim().slice(0, 50) || null;

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return { error: "Username must be 3–20 characters: lowercase letters, numbers, or _." };
  }
  const { error } = await supabase.from("profiles").update({ username, display_name }).eq("id", user.id);
  if (error) return { error: error.code === "23505" ? "That username is taken." : error.message };

  revalidatePath("/", "layout");
  return { error: null, saved: true };
}

/** Permanently deletes the account; reviews, friendships, and visits cascade. */
export async function deleteAccount() {
  const { supabase, user } = await requireUser();
  const { error } = await createServiceClient().auth.admin.deleteUser(user.id);
  if (error) throw new Error(error.message);
  await supabase.auth.signOut();
  redirect("/");
}
