import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/types";
import LoginForm from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(safeNext(next));
  const inviter = safeNext(next).match(/^\/u\/([a-z0-9_]{3,20})$/)?.[1];

  return (
    <div className="mx-auto mt-8 max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-1 text-stone-600">
          {inviter ? `Sign in to add @${inviter} as a friend and see their reviews.` : "See where your friends actually like to eat."}
        </p>
      </div>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">Sign-in failed. Please try again.</p>}
      <LoginForm next={safeNext(next)} />
    </div>
  );
}
