"use client";

import { useEffect, useState } from "react";

export default function InviteLink({ username }: { username: string }) {
  const [url, setUrl] = useState(`/u/${username}`);
  const [copied, setCopied] = useState(false);
  useEffect(() => setUrl(`${window.location.origin}/u/${username}`), [username]);

  const text = "Add me on Friendly Restaurant: only real reviews from friends, no fake ones 🍕";

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: "Friendly Restaurant", text, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input readOnly value={url} className="input font-mono text-sm" onFocus={(e) => e.target.select()} />
        <button onClick={share} className="btn-primary shrink-0">
          {copied ? "Copied!" : "Share"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <a className="btn-secondary" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}>
          WhatsApp
        </a>
        <button
          className="btn-secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          Copy for Insta / Snap bio
        </button>
      </div>
    </div>
  );
}
