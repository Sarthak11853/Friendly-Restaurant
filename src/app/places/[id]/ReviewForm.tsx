"use client";

import { useActionState, useState, useTransition } from "react";
import { CURRENCY, type Review } from "@/lib/types";
import { deleteReview, saveReview } from "../actions";

export default function ReviewForm({ placeId, review }: { placeId: string; review?: Review }) {
  const [state, action, saving] = useActionState(saveReview.bind(null, placeId), null);
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [deleting, startDelete] = useTransition();
  const wouldReturn = review?.would_return == null ? "" : review.would_return ? "yes" : "no";

  return (
    <form action={action} className="card space-y-4">
      <div>
        <span className="label">Rating</span>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer text-4xl leading-none">
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
              <span className={n <= rating ? "text-amber-500" : "text-stone-300"}>★</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="body">Your experience</label>
        <textarea id="body" name="body" rows={3} maxLength={2000} defaultValue={review?.body ?? ""} className="input" placeholder="Food, service, vibe… be honest, your friends are counting on you." />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="must_try">Must-try dish</label>
          <input id="must_try" name="must_try" maxLength={120} defaultValue={review?.must_try ?? ""} className="input" placeholder="e.g. Butter chicken" />
        </div>
        <div>
          <label className="label" htmlFor="visited_on">Visited on</label>
          <input id="visited_on" name="visited_on" type="date" defaultValue={review?.visited_on ?? ""} max={new Date().toISOString().slice(0, 10)} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="price_level">Price</label>
          <select id="price_level" name="price_level" defaultValue={review?.price_level ?? ""} className="input">
            <option value="">—</option>
            {["Cheap", "Moderate", "Pricey", "Splurge"].map((label, i) => (
              <option key={label} value={i + 1}>
                {CURRENCY.repeat(i + 1)} {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="would_return">Would you go again?</label>
          <select id="would_return" name="would_return" defaultValue={wouldReturn} className="input">
            <option value="">—</option>
            <option value="yes">👍 Yes</option>
            <option value="no">👎 No</option>
          </select>
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.saved && !saving && <p className="text-sm text-green-700">Saved! Your friends can see it now.</p>}

      <div className="flex gap-2">
        <button disabled={saving || !rating} className="btn-primary">
          {saving ? "Saving…" : review ? "Update review" : "Post review"}
        </button>
        {review && (
          <button
            type="button"
            disabled={deleting}
            onClick={() => confirm("Delete your review?") && startDelete(() => deleteReview(placeId))}
            className="btn-secondary text-red-600"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
