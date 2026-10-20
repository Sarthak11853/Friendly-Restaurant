import type { Place, Profile, ReviewWithRelations } from "./types";

export interface PlaceStats {
  place: Place;
  avg: number;
  count: number;
  reviewers: Profile[];
}

/** Groups friends' reviews (excluding mine) by place, best first. */
export function friendPicks(reviews: ReviewWithRelations[], me: string): PlaceStats[] {
  const byPlace = new Map<string, { place: Place; total: number; reviewers: Profile[] }>();
  for (const r of reviews) {
    if (r.user_id === me) continue;
    const entry = byPlace.get(r.place_id) ?? { place: r.place, total: 0, reviewers: [] };
    entry.total += r.rating;
    entry.reviewers.push(r.author);
    byPlace.set(r.place_id, entry);
  }
  return [...byPlace.values()]
    .map(({ place, total, reviewers }) => ({ place, avg: total / reviewers.length, count: reviewers.length, reviewers }))
    .sort((a, b) => b.avg - a.avg || b.count - a.count);
}
