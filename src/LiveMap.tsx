import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useRef } from "react";

import { LatLng, TrackPoint } from "./data";

type Props = {
  position?: LatLng;
  trail?: TrackPoint[];
  active?: boolean;
  className?: string;
};

function meIcon(active: boolean) {
  const color = active ? "#10b981" : "#3b82f6";
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;display:grid;place-items:center;width:44px;height:44px">
        ${
          active
            ? `<span style="position:absolute;width:44px;height:44px;border-radius:50%;background:${color};opacity:.35;animation:sgPing 1.6s ease-out infinite"></span>`
            : ""
        }
        <span style="position:relative;width:22px;height:22px;border-radius:50%;background:${color};border:4px solid #fff;box-shadow:0 6px 18px rgba(2,6,23,.45)"></span>
      </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

export default function LiveMap({ position, trail = [], active = false, className }: Props) {
  const node = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const follow = useRef(true);

  useEffect(() => {
    if (!node.current || map.current) return;

    map.current = L.map(node.current, { zoomControl: false }).setView([16.3167, -91.9833], 16);
    L.control.zoom({ position: "topleft" }).addTo(map.current);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap · CARTO",
      maxZoom: 20,
      subdomains: "abcd",
    }).addTo(map.current);

    layer.current = L.layerGroup().addTo(map.current);
    map.current.on("dragstart", () => (follow.current = false));

    setTimeout(() => map.current?.invalidateSize(), 200);
  }, []);

  useEffect(() => {
    if (!map.current || !layer.current || !position) return;
    layer.current.clearLayers();

    if (trail.length > 1) {
      L.polyline(
        trail.map((p) => [p.lat, p.lng] as L.LatLngTuple),
        { color: "#10b981", weight: 5, opacity: 0.85 },
      ).addTo(layer.current);
    }

    L.circle([position.lat, position.lng], {
      radius: 60,
      color: active ? "#10b981" : "#3b82f6",
      fillColor: active ? "#10b981" : "#3b82f6",
      fillOpacity: 0.12,
      weight: 1,
    }).addTo(layer.current);

    L.marker([position.lat, position.lng], { icon: meIcon(active) })
      .bindPopup(active ? "🟢 Transmitiendo en vivo" : "Tu ubicación actual")
      .addTo(layer.current);

    if (follow.current) map.current.setView([position.lat, position.lng], map.current.getZoom());
  }, [active, position, trail]);

  return (
    <div className="relative h-full w-full">
      <div ref={node} className={className ?? "h-full w-full"} />
      <button
        onClick={() => {
          follow.current = true;
          if (position) map.current?.setView([position.lat, position.lng], 17);
        }}
        className="absolute bottom-3 right-3 z-[500] rounded-xl bg-white/95 px-3 py-2 text-xs font-black text-slate-900 shadow-lg"
      >
        📍 Centrar
      </button>
    </div>
  );
}
