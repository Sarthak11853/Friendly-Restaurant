export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface Place {
  id: string;
  provider: "osm" | "google";
  provider_id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  category: string | null;
}

export interface Review {
  id: string;
  user_id: string;
  place_id: string;
  rating: number;
  body: string | null;
  must_try: string | null;
  price_level: number | null;
  would_return: boolean | null;
  visited_on: string | null;
  created_at: string;
}

export type ReviewWithRelations = Review & { author: Profile; place: Place };

/** Place search result, signed by the server so it can't be forged when saved. */
export interface PlaceCandidate {
  provider: Place["provider"];
  provider_id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  category: string | null;
  sig: string;
}

/** Only redirect to same-site relative paths. */
export function safeNext(next: string | null | undefined, fallback = "/") {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}

/** Symbol used for price levels (1–4). */
export const CURRENCY = "₹";
