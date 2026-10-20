import { createHmac, timingSafeEqual } from "node:crypto";
import "server-only";
import { createServiceClient } from "./supabase/server";
import type { PlaceCandidate } from "./types";

type Unsigned = Omit<PlaceCandidate, "sig">;

function signature(p: Unsigned) {
  const payload = JSON.stringify([p.provider, p.provider_id, p.name, p.address, p.lat, p.lng, p.category]);
  return createHmac("sha256", process.env.SUPABASE_SECRET_KEY!).update("place:" + payload).digest("base64url");
}

export function verifyCandidate(p: PlaceCandidate) {
  const expected = Buffer.from(signature(p));
  const given = Buffer.from(String(p.sig));
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Stores a signed search result as a place (or refreshes it) and returns its id. */
export async function savePlace(candidate: PlaceCandidate) {
  if (!verifyCandidate(candidate)) throw new Error("Invalid place");
  const { provider, provider_id, name, address, lat, lng, category } = candidate;
  const { data, error } = await createServiceClient()
    .from("places")
    .upsert({ provider, provider_id, name, address, lat, lng, category }, { onConflict: "provider,provider_id" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function searchPlaces(q: string, lat?: number, lng?: number): Promise<PlaceCandidate[]> {
  const results = process.env.GOOGLE_MAPS_API_KEY ? await searchGoogle(q, lat, lng) : await searchOsm(q, lat, lng);
  return results.map((p) => ({ ...p, sig: signature(p) }));
}

// Free OpenStreetMap search via Photon (https://photon.komoot.io), filtered to food & drink.
const OSM_FOOD_TAGS = ["restaurant", "cafe", "fast_food", "bar", "pub", "food_court", "ice_cream", "biergarten"];

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_type: string;
    osm_id: number;
    osm_value?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

async function searchOsm(q: string, lat?: number, lng?: number): Promise<Unsigned[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "12");
  for (const tag of OSM_FOOD_TAGS) url.searchParams.append("osm_tag", `amenity:${tag}`);
  if (lat != null && lng != null) {
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
  }
  const res = await fetch(url, { headers: { "User-Agent": "FriendlyRestaurant/0.1" }, cache: "no-store" });
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  const data = (await res.json()) as { features: PhotonFeature[] };

  return data.features
    .filter((f) => f.properties.name)
    .map(({ geometry, properties: p }) => ({
      provider: "osm" as const,
      provider_id: `${p.osm_type}${p.osm_id}`,
      name: p.name!,
      address:
        [[p.housenumber, p.street].filter(Boolean).join(" "), p.district, p.city, p.state, p.country]
          .filter(Boolean)
          .join(", ") || null,
      lat: geometry.coordinates[1],
      lng: geometry.coordinates[0],
      category: p.osm_value?.replace(/_/g, " ") ?? null,
    }));
}

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location: { latitude: number; longitude: number };
  primaryTypeDisplayName?: { text: string };
}

// Google Places API (New) Text Search. Used when GOOGLE_MAPS_API_KEY is set.
async function searchGoogle(q: string, lat?: number, lng?: number): Promise<Unsigned[]> {
  const body: Record<string, unknown> = { textQuery: q, pageSize: 12 };
  if (lat != null && lng != null) {
    body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 20000 } };
  }
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY!,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.primaryTypeDisplayName",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  const data = (await res.json()) as { places?: GooglePlace[] };

  return (data.places ?? []).map(fromGoogle);
}

function fromGoogle(p: GooglePlace): Unsigned {
  return {
    provider: "google",
    provider_id: p.id,
    name: p.displayName?.text ?? "Unnamed place",
    address: p.formattedAddress ?? null,
    lat: p.location.latitude,
    lng: p.location.longitude,
    category: p.primaryTypeDisplayName?.text ?? null,
  };
}

/** Food & drink places within `radius` metres, nearest first. */
export async function nearbyPlaces(lat: number, lng: number, radius: number): Promise<(PlaceCandidate & { distance: number })[]> {
  const results = process.env.GOOGLE_MAPS_API_KEY ? await nearbyGoogle(lat, lng, radius) : await nearbyOsm(lat, lng, radius);
  return results
    .map((p) => ({ ...p, sig: signature(p), distance: distanceMeters(lat, lng, p.lat, p.lng) }))
    .filter((p) => p.distance <= radius)
    .sort((a, b) => a.distance - b.distance);
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags: Record<string, string>;
}

// OpenStreetMap via the Overpass API. IDs match Photon's (e.g. "N123") so places dedupe.
async function nearbyOsm(lat: number, lng: number, radius: number): Promise<Unsigned[]> {
  const query = `[out:json][timeout:10];
nwr(around:${Math.round(radius)},${lat},${lng})["amenity"~"^(${OSM_FOOD_TAGS.join("|")})$"]["name"];
out center 10;`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "FriendlyRestaurant/0.1" },
    body: new URLSearchParams({ data: query }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Nearby search failed (${res.status})`);
  const data = (await res.json()) as { elements: OverpassElement[] };

  return data.elements.flatMap((el) => {
    const point = el.type === "node" ? { lat: el.lat, lon: el.lon } : el.center;
    if (point?.lat == null || point.lon == null) return [];
    const t = el.tags;
    return [
      {
        provider: "osm" as const,
        provider_id: `${el.type[0].toUpperCase()}${el.id}`,
        name: t.name,
        address:
          [[t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" "), t["addr:suburb"], t["addr:city"]]
            .filter(Boolean)
            .join(", ") || null,
        lat: point.lat,
        lng: point.lon,
        category: t.amenity.replace(/_/g, " "),
      },
    ];
  });
}

async function nearbyGoogle(lat: number, lng: number, radius: number): Promise<Unsigned[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY!,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.primaryTypeDisplayName",
    },
    body: JSON.stringify({
      includedTypes: ["restaurant", "cafe", "bar", "bakery", "meal_takeaway"],
      maxResultCount: 5,
      rankPreference: "DISTANCE",
      locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius } },
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Nearby search failed (${res.status})`);
  const data = (await res.json()) as { places?: GooglePlace[] };
  return (data.places ?? []).map(fromGoogle);
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

export function mapsUrl(place: { name: string; address: string | null; provider: string; provider_id: string }) {
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", [place.name, place.address].filter(Boolean).join(", "));
  if (place.provider === "google") url.searchParams.set("query_place_id", place.provider_id);
  return url.toString();
}
