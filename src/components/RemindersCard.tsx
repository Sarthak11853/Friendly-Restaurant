"use client";

import { useEffect, useState } from "react";
import { detectionEnabled, enableDetection, enablePush, pushState } from "@/lib/reminders-client";

const HIDE_KEY = "fr:hide-reminders-card";

/** One-time nudge on the home page to turn on visit detection + notifications. */
export default function RemindersCard() {
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let hidden = false;
    try {
      hidden = localStorage.getItem(HIDE_KEY) === "1";
    } catch {}
    setShow(!hidden && !detectionEnabled());
  }, []);

  function hide() {
    try {
      localStorage.setItem(HIDE_KEY, "1");
    } catch {}
    setShow(false);
  }

  async function turnOn() {
    setBusy(true);
    setError("");
    try {
      await enableDetection();
      if ((await pushState()) === "off") await enablePush().catch(() => {});
      hide();
    } catch {
      setError("Location permission was denied. You can turn this on later in Me → Reminders.");
    } finally {
      setBusy(false);
    }
  }

  if (!show) return null;
  return (
    <section className="card space-y-2 border-brand-100 bg-brand-50">
      <h2 className="font-semibold">🔔 Never forget to rate a place</h2>
      <p className="text-sm text-stone-700">
        When you&apos;re at a restaurant we&apos;ll ask you to rate it for your friends, and remind you after your meal.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button disabled={busy} onClick={turnOn} className="btn-primary">Turn on</button>
        <button onClick={hide} className="btn-secondary">Not now</button>
      </div>
    </section>
  );
}
