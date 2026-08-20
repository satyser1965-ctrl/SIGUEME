export type LatLng = { lat: number; lng: number };

export type Contact = { id: string; name: string; phone: string };

export type TrackPoint = LatLng & { t: number };

export const DEFAULT_CENTER: LatLng = { lat: 16.3167, lng: -91.9833 }; // Las Margaritas, Chiapas

export const CITY = "Las Margaritas, Chiapas";

export function distanceKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const l1 = (a.lat * Math.PI) / 180;
  const l2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(l1) * Math.cos(l2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function mapsLink(p: LatLng) {
  return `https://maps.google.com/?q=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
}

export function clockNow() {
  return new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

export function fmtElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/* ---- almacenamiento local ---- */

export function loadContacts(): Contact[] {
  try {
    return JSON.parse(localStorage.getItem("sigueme_contacts") || "[]");
  } catch {
    return [];
  }
}

export function saveContacts(list: Contact[]) {
  try {
    localStorage.setItem("sigueme_contacts", JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function loadName() {
  try {
    return localStorage.getItem("sigueme_name") || "";
  } catch {
    return "";
  }
}

export function saveName(v: string) {
  try {
    localStorage.setItem("sigueme_name", v);
  } catch {
    /* ignore */
  }
}
