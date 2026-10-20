"use client";

import { useEffect, useState, useTransition } from "react";
import { openPlace } from "@/app/places/actions";
import { checkNearby, remindLater } from "@/app/reminders/actions";
import { currentPosition, detectionEnabled, dismissPlaces, recentlyDismissed } from "@/lib/reminders-client";
import type { PlaceCandidate } from "@/lib/types";

type Nearby = PlaceCandidate & { distance: number };

const CHECK_EVERY_MS = 5 * 60_000;
let lastCheck = 0;

/**
 * While the app is open, notices when you're at a restaurant and asks you to
 * rate it for your friends, now or after your meal.
 */
export default function VisitPrompt() {
  const [options, setOptions] = useState<Nearby[]>([]);
  const [selected, setSelected] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, startTransition] = useTransition();

  useEffect(() => {
    navigator.serviceWorker?.register("/sw.js").catch(() => {});

    async function check() {
      if (document.visibilityState !== "visible" || !detectionEnabled() || Date.now() - lastCheck < CHECK_EVERY_MS) return;
      // Never pop a permission dialog from here; that only happens when the user turns detection on.
      const permission = await navigator.permissions?.query({ name: "geolocation" }).catch(() => null);
      if (permission && permission.state !== "granted") return;
      lastCheck = Date.now();

      const pos = await currentPosition().catch(() => null);
      if (!pos) return;
      const found = await checkNearby(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy).catch(() => []);
      const fresh = found.filter((p) => !recentlyDismissed(p));
      if (fresh.length) {
        setOptions(fresh);
        setSelected(0);
      }
    }

    check();
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, []);

  if (message) {
    return (
      <Sheet>
        <p className="text-sm">{message}</p>
        <button onClick={() => setMessage("")} className="btn-secondary mt-3 w-full">OK</button>
      </Sheet>
    );
  }
  if (options.length === 0) return null;
  const place = options[selected];

  return (
    <Sheet>
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">📍 Eating out?</p>
      <h2 className="mt-1 text-lg font-bold">
        Are you at {options.length === 1 ? place.name : "one of these"}?
      </h2>
      <p className="text-sm text-stone-600">Your friends would love to know how it is.</p>

      {options.length > 1 && (
        <div className="mt-3 space-y-1">
          {options.map((o, i) => (
            <label key={o.provider_id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-stone-50">
              <input type="radio" checked={selected === i} onChange={() => setSelected(i)} className="accent-brand-500" />
              <span className="flex-1 truncate text-sm font-medium">{o.name}</span>
              <span className="text-xs text-stone-500">{Math.round(o.distance)} m</span>
            </label>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-2">
        <button disabled={busy} onClick={() => startTransition(() => openPlace(place))} className="btn-primary py-3">
          ⭐ Rate it now
        </button>
        <button
          disabled={busy}
          onClick={() =>
            startTransition(async () => {
              await remindLater(place);
              setOptions([]);
              setMessage(
                typeof Notification !== "undefined" && Notification.permission === "granted"
                  ? `Enjoy your meal! We'll remind you to rate ${place.name} in about 1.5 hours.`
                  : `Saved to your "To review" list. Turn on notifications in Me to get a reminder.`,
              );
            })
          }
          className="btn-secondary py-3"
        >
          ⏰ Remind me after my meal
        </button>
        <button
          disabled={busy}
          onClick={() => {
            dismissPlaces(options);
            setOptions([]);
          }}
          className="py-2 text-sm text-stone-500"
        >
          Not here
        </button>
      </div>
    </Sheet>
  );
}

function Sheet({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-16 z-[1100] px-3 sm:bottom-4">
      <div role="dialog" className="card mx-auto max-w-md shadow-xl ring-1 ring-black/5">
        {children}
      </div>
    </div>
  );
}
