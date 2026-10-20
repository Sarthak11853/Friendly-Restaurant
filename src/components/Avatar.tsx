import type { Profile } from "@/lib/types";

export default function Avatar({ profile, size = 36 }: { profile: Pick<Profile, "username" | "display_name" | "avatar_url">; size?: number }) {
  const name = profile.display_name || profile.username;
  const style = { width: size, height: size, fontSize: size * 0.42 };
  return profile.avatar_url ? (
    <img src={profile.avatar_url} alt={name} style={style} className="shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
  ) : (
    <span style={style} className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
