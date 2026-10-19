"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window`, so it can only render in the browser.
const FriendsMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-2xl bg-stone-200" />,
});

export default FriendsMap;
