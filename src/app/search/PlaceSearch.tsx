"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { PlaceCandidate } from "@/lib/types";
import { openPlace } from "../places/actions";

export default function PlaceSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [opening, startOpening] = useTransition();
  const coords = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => (coords.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { maximumAge: 10 * 60 * 1000 },
    );
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ q });
      if (coords.current) {
        params.set("lat", String(coords.current.lat));
        params.set("lng", String(coords.current.lng));
      }
      try {
        const res = await fetch(`/api/places/search?${params}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setResults(data.results);
      } catch (e) {
        if (!controller.signal.aborted) setError((e as Error).message || "Search failed");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="space-y-3">
      <input
        autoFocus
        type="search"
        placeholder="e.g. Pizza Hut Connaught Place"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="input py-3"
      />
      {loading && <p className="text-sm text-stone-500">Searching…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
        <p className="text-sm text-stone-500">No places found. Try adding the area or city name.</p>
      )}
      <ul className="space-y-2">
        {results.map((r) => (
          <li key={`${r.provider}:${r.provider_id}`}>
            <button
              disabled={opening}
              onClick={() => startOpening(() => openPlace(r))}
              className="card w-full text-left transition hover:border-brand-500 disabled:opacity-60"
            >
              <div className="font-semibold">{r.name}</div>
              <div className="text-sm text-stone-500">
                {[r.category, r.address].filter(Boolean).join(" · ")}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
