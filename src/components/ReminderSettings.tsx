"use client";

import { useEffect, useState } from "react";
import { sendTestPush } from "@/app/reminders/actions";
import {
  detectionEnabled,
  disableDetection,
  disablePush,
  enableDetection,
  enablePush,
  pushState,
  type PushState,
} from "@/lib/reminders-client";

const PUSH_HELP: Partial<Record<PushState, string>> = {
  unconfigured: "Notifications aren't set up on the server yet (missing VAPID keys).",
  unsupported: "This browser doesn't support notifications.",
  "needs-install": "On iPhone: tap Share → Add to Home Screen, then open the app from your Home Screen to turn on notifications.",
  denied: "Notifications are blocked. Allow them for this site in your browser settings.",
};

export default function ReminderSettings() {
  const [detect, setDetect] = useState(false);
  const [push, setPush] = useState<PushState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDetect(detectionEnabled());
    pushState().then(setPush);
  }, []);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      const PERMISSION_DENIED = 1; // GeolocationPositionError.code
      setError(
        (e as { code?: number }).code === PERMISSION_DENIED
          ? "Location permission was denied. Allow it in your browser settings."
          : (e as Error).message || "Something went wrong.",
      );
    } finally {
      setBusy(false);
      setDetect(detectionEnabled());
      setPush(await pushState());
    }
  }

  return (
    <section className="card space-y-4">
      <h2 className="font-semibold">Reminders</h2>

      <Row
        title="Detect restaurant visits"
        text="When you open the app at a restaurant, we'll ask you to rate it. Your location is only checked while the app is open and is never stored."
        on={detect}
        disabled={busy}
        onToggle={() => run(async () => (detect ? disableDetection() : await enableDetection()))}
      />

      <Row
        title="Push notifications"
        text={PUSH_HELP[push ?? "off"] ?? "\"How was it?\" reminders after your meal, plus friend requests."}
        on={push === "on"}
        disabled={busy || (push !== "on" && push !== "off")}
        onToggle={() => run(push === "on" ? disablePush : enablePush)}
      />

      {push === "on" && (
        <button disabled={busy} onClick={() => run(sendTestPush)} className="btn-secondary w-full">
          Send me a test notification
        </button>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}

function Row(props: { title: string; text: string; on: boolean; disabled: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-1">
        <div className="font-medium">{props.title}</div>
        <p className="text-sm text-stone-600">{props.text}</p>
      </div>
      <button
        role="switch"
        aria-checked={props.on}
        aria-label={props.title}
        disabled={props.disabled}
        onClick={props.onToggle}
        className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${props.on ? "bg-brand-500" : "bg-stone-300"}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${props.on ? "left-6" : "left-1"}`} />
      </button>
    </div>
  );
}
