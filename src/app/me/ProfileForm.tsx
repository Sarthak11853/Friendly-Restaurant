"use client";

import { useActionState } from "react";
import type { Profile } from "@/lib/types";
import { updateProfile } from "./actions";

export default function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, saving] = useActionState(updateProfile, null);
  return (
    <form action={action} className="card space-y-4">
      <div>
        <label className="label" htmlFor="display_name">Name</label>
        <input id="display_name" name="display_name" maxLength={50} defaultValue={profile.display_name ?? ""} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="username">Username</label>
        <div className="flex items-center gap-1">
          <span className="text-stone-500">@</span>
          <input id="username" name="username" required pattern="[a-z0-9_]{3,20}" defaultValue={profile.username} className="input" />
        </div>
        <p className="mt-1 text-xs text-stone-500">This is your invite link, so changing it breaks links you already shared.</p>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.saved && !saving && <p className="text-sm text-green-700">Saved!</p>}
      <button disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save"}</button>
    </form>
  );
}
