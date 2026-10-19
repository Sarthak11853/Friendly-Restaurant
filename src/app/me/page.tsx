import Link from "next/link";
import Avatar from "@/components/Avatar";
import { requireUser } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import ProfileForm from "./ProfileForm";

export default async function MePage() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", user.id)
    .single<Profile>();
  if (!profile) throw new Error("Profile missing");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar profile={profile} size={64} />
        <div>
          <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
          <Link href={`/u/${profile.username}`} className="text-sm text-brand-600 hover:underline">
            View my reviews →
          </Link>
        </div>
      </div>
      <ProfileForm profile={profile} />
      <form action="/auth/signout" method="post">
        <button className="btn-secondary w-full">Sign out</button>
      </form>
    </div>
  );
}
