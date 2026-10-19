import Link from "next/link";
import type { Profile } from "@/lib/types";
import Avatar from "./Avatar";

export default function PersonRow({ profile, children }: { profile: Profile; children?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <Link href={`/u/${profile.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar profile={profile} size={40} />
        <div className="min-w-0">
          <div className="truncate font-semibold">{profile.display_name || profile.username}</div>
          <div className="truncate text-sm text-stone-500">@{profile.username}</div>
        </div>
      </Link>
      {children}
    </li>
  );
}
