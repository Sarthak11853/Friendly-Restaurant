"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function google() {
    const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    }
  }

  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const { error } = await createClient().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
    setStatus(error ? "error" : "sent");
    setMessage(error?.message ?? "");
  }

  if (status === "sent") {
    return (
      <div className="card text-center">
        <p className="text-lg font-semibold">Check your inbox 📬</p>
        <p className="mt-1 text-sm text-stone-600">We sent a sign-in link to {email}. Open it on this device.</p>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <button onClick={google} className="btn-secondary w-full py-3">
        <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        Continue with Google
      </button>
      <div className="flex items-center gap-3 text-xs text-stone-400">
        <hr className="flex-1" /> or <hr className="flex-1" />
      </div>
      <form onSubmit={magicLink} className="space-y-3">
        <input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
        <button disabled={status === "sending"} className="btn-primary w-full py-3">
          {status === "sending" ? "Sending…" : "Email me a sign-in link"}
        </button>
      </form>
      {status === "error" && <p className="text-sm text-red-600">{message}</p>}
    </div>
  );
}
