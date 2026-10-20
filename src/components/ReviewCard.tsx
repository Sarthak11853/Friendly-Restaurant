import Link from "next/link";
import { CURRENCY, type ReviewWithRelations } from "@/lib/types";
import Avatar from "./Avatar";
import Stars from "./Stars";

export default function ReviewCard({ review, showPlace = true }: { review: ReviewWithRelations; showPlace?: boolean }) {
  const { author, place } = review;
  return (
    <article className="card space-y-2">
      <div className="flex items-center gap-3">
        <Link href={`/u/${author.username}`}>
          <Avatar profile={author} />
        </Link>
        <div className="min-w-0 flex-1 text-sm">
          <Link href={`/u/${author.username}`} className="font-semibold hover:underline">
            {author.display_name || author.username}
          </Link>
          {showPlace && (
            <>
              {" "}
              <span className="text-stone-500">reviewed</span>{" "}
              <Link href={`/places/${place.id}`} className="font-semibold text-brand-600 hover:underline">
                {place.name}
              </Link>
            </>
          )}
          <div className="text-xs text-stone-500">
            {new Date(review.visited_on ?? review.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
          </div>
        </div>
        <Stars value={review.rating} />
      </div>
      {review.body && <p className="whitespace-pre-line text-stone-800">{review.body}</p>}
      <div className="flex flex-wrap gap-2 text-xs">
        {review.must_try && <span className="rounded-full bg-brand-50 px-2 py-1 text-brand-700">🍽️ Must try: {review.must_try}</span>}
        {review.would_return != null && (
          <span className="rounded-full bg-stone-100 px-2 py-1">{review.would_return ? "👍 Would go again" : "👎 Wouldn't go again"}</span>
        )}
        {review.price_level && <span className="rounded-full bg-stone-100 px-2 py-1">{CURRENCY.repeat(review.price_level)}</span>}
      </div>
    </article>
  );
}
