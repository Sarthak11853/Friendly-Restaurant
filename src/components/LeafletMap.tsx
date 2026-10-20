"use client";

import "leaflet/dist/leaflet.css";
import { latLngBounds } from "leaflet";
import Link from "next/link";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

export interface MapPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  avg: number;
  count: number;
}

function color(avg: number) {
  return avg >= 4 ? "#16a34a" : avg >= 3 ? "#f59e0b" : "#dc2626";
}

export default function LeafletMap({ pins }: { pins: MapPin[] }) {
  const bounds = latLngBounds(pins.map((p) => [p.lat, p.lng]));
  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [30, 30], maxZoom: 15 }}
      scrollWheelZoom={false}
      className="z-0 h-72 rounded-2xl border border-stone-200"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pins.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={8 + Math.min(p.count, 5) * 2}
          pathOptions={{ color: "#fff", weight: 2, fillColor: color(p.avg), fillOpacity: 0.9 }}
        >
          <Popup>
            <Link href={`/places/${p.id}`} className="font-semibold">
              {p.name}
            </Link>
            <br />★ {p.avg.toFixed(1)} · {p.count} friend{p.count > 1 ? "s" : ""}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
