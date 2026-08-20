import { useEffect, useMemo, useRef, useState } from "react";

import LiveMap from "./LiveMap";
import {
  CITY,
  Contact,
  DEFAULT_CENTER,
  LatLng,
  TrackPoint,
  clockNow,
  distanceKm,
  fmtElapsed,
  loadContacts,
  loadName,
  mapsLink,
  saveContacts,
  saveName,
} from "./data";

export default function App() {
  const [position, setPosition] = useState<LatLng | undefined>();
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [active, setActive] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [trail, setTrail] = useState<TrackPoint[]>([]);
  const [name, setName] = useState(loadName);
  const [contacts, setContacts] = useState<Contact[]>(loadContacts);
  const [showContacts, setShowContacts] = useState(false);
  const [cName, setCName] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [toast, setToast] = useState("");
  const [gpsError, setGpsError] = useState("");
  const watchId = useRef<number | null>(null);

  /* ---------- ubicación inicial ---------- */
  useEffect(() => {
    if (!navigator.geolocation) {
      setPosition(DEFAULT_CENTER);
      setGpsError("Tu navegador no soporta GPS.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPosition({ lat: p.coords.latitude, lng: p.coords.longitude });
        setAccuracy(p.coords.accuracy);
      },
      () => {
        setPosition(DEFAULT_CENTER);
        setGpsError("Activa el permiso de ubicación para usar el rastreo.");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  /* ---------- rastreo en vivo ---------- */
  useEffect(() => {
    if (!active || !navigator.geolocation) return;

    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        const pt: TrackPoint = { lat: p.coords.latitude, lng: p.coords.longitude, t: Date.now() };
        setPosition({ lat: pt.lat, lng: pt.lng });
        setAccuracy(p.coords.accuracy);
        setTrail((prev) => (prev.length > 400 ? [...prev.slice(-400), pt] : [...prev, pt]));
        setGpsError("");
      },
      () => setGpsError("No se pudo obtener tu ubicación. Revisa los permisos."),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    );

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [active]);

  /* ---------- cronómetro ---------- */
  useEffect(() => {
    if (!active || !startedAt) return;
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(id);
  }, [active, startedAt]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => saveName(name), [name]);
  useEffect(() => saveContacts(contacts), [contacts]);

  const traveled = useMemo(() => {
    let d = 0;
    for (let i = 1; i < trail.length; i++) d += distanceKm(trail[i - 1], trail[i]);
    return d;
  }, [trail]);

  /* ---------- acciones ---------- */

  function toggleTracking() {
    if (active) {
      setActive(false);
      setStartedAt(null);
      setToast("Rastreo detenido. Ya no compartes tu ubicación.");
      return;
    }
    setActive(true);
    setStartedAt(Date.now());
    setElapsed(0);
    setTrail(position ? [{ ...position, t: Date.now() }] : []);
    setToast("¡Rastreo activo! Tu ubicación se actualiza en vivo.");
  }

  function liveText() {
    const quien = name.trim() || "Alguien";
    const link = position ? mapsLink(position) : "";
    return `🟢 SÍGUEME EN VIVO\n\nSoy ${quien}. Estoy compartiendo mi ubicación en tiempo real por seguridad.\n\n📍 Mi ubicación ahora:\n${link}\n\n🕒 ${clockNow()}\n📌 ${CITY}\n\nSi algo pasa, esta es mi última posición conocida.`;
  }

  function sosText() {
    const quien = name.trim() || "Alguien";
    const link = position ? mapsLink(position) : "";
    return `🚨 *ALERTA SOS* 🚨\n\n¡NECESITO AYUDA URGENTE!\n\nSoy ${quien}\n\n📍 Mi ubicación exacta:\n${link}\n\n🕒 Hora: ${clockNow()}\n📌 ${CITY}\n\nPor favor comunícate conmigo o llama a emergencias.`;
  }

  function sendWhatsapp(to?: string) {
    const txt = encodeURIComponent(liveText());
    const url = to ? `https://wa.me/${to.replace(/[^0-9]/g, "")}?text=${txt}` : `https://wa.me/?text=${txt}`;
    window.open(url, "_blank");
  }

  function sendSOS() {
    const ok = window.confirm("¿Enviar ALERTA SOS con tu ubicación exacta?");
    if (!ok) return;

    if (!active) {
      setActive(true);
      setStartedAt(Date.now());
    }

    const txt = encodeURIComponent(sosText());
    const first = contacts[0];
    const url = first
      ? `https://wa.me/${first.phone.replace(/[^0-9]/g, "")}?text=${txt}`
      : `https://wa.me/?text=${txt}`;
    window.open(url, "_blank");

    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
    setToast("🚨 Alerta SOS enviada con tu ubicación.");
  }

  async function shareApp() {
    const url = window.location.href.split("#")[0];
    const text = `📍 SÍGUEME · Seguridad Personal\n\nComparte tu ubicación en tiempo real con quien tú elijas. Botón SOS para emergencias.\n\nDescárgala aquí:\n${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "SÍGUEME", text, url });
        return;
      } catch {
        /* cancelado */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setToast("¡Enlace copiado! Ya puedes pegarlo donde quieras.");
    } catch {
      setToast(url);
    }
  }

  function addContact() {
    const phone = cPhone.replace(/[^0-9]/g, "");
    if (!cName.trim() || phone.length < 10) {
      setToast("Escribe el nombre y el número con lada. Ej: 529611234567");
      return;
    }
    setContacts((prev) => [...prev, { id: `c${Date.now()}`, name: cName.trim(), phone }]);
    setCName("");
    setCPhone("");
    setToast("Contacto agregado ✅");
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-10 text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-[600] border-b border-white/10 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500 text-xl shadow-lg shadow-emerald-500/30">
              📍
            </span>
            <div>
              <h1 className="text-lg font-black leading-none tracking-tight">SÍGUEME</h1>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-400">Seguridad Personal</p>
            </div>
          </div>

          <span
            className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-black ${
              active ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-slate-400"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${active ? "animate-pulse bg-emerald-400" : "bg-slate-500"}`}
            />
            {active ? "EN VIVO" : "Inactivo"}
          </span>
        </div>
      </header>

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[900] w-[92%] max-w-md -translate-x-1/2 rounded-2xl bg-emerald-500 px-4 py-3 text-center text-sm font-bold text-slate-950 shadow-2xl">
          {toast}
        </div>
      )}

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-4">
        {/* BOTÓN PRINCIPAL */}
        <button
          onClick={toggleTracking}
          className={`sg-main relative w-full overflow-hidden rounded-3xl px-6 py-9 text-center shadow-2xl transition active:scale-[.99] ${
            active ? "sg-live" : "sg-idle"
          }`}
        >
          <span className="sg-shine" />
          <span className="relative block text-2xl font-black tracking-tight md:text-4xl">
            {active ? "DETENER RASTREO" : "SÍGUEME EN VIVO"}
          </span>
          <span className="relative mt-1.5 block text-sm font-semibold opacity-90">
            {active ? `Transmitiendo · ${fmtElapsed(elapsed)}` : "para mi seguridad es en tiempo real"}
          </span>
        </button>

        {gpsError && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-300">
            ⚠️ {gpsError}
          </div>
        )}

        {/* ESTADO + MAPA */}
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
            <h2 className="text-sm font-black text-slate-300">Estado del Rastreo</h2>

            <div className="mt-4 flex items-center gap-4">
              <span
                className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl ${
                  active ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-slate-400"
                }`}
              >
                {active ? "🟢" : "⚡"}
              </span>
              <div>
                <p className="text-2xl font-black leading-none">{active ? "Activo" : "Inactivo"}</p>
                <p className="mt-1.5 text-sm text-slate-400">
                  {active ? "Compartiendo en tiempo real" : "Presiona para iniciar"}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { v: fmtElapsed(elapsed), l: "Tiempo" },
                { v: `${traveled.toFixed(2)}`, l: "Km" },
                { v: accuracy ? `${Math.round(accuracy)}m` : "—", l: "Precisión" },
              ].map((k) => (
                <div key={k.l} className="rounded-2xl bg-white/5 py-3 text-center">
                  <p className="text-lg font-black text-emerald-400">{k.v}</p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{k.l}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl bg-white/5 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Coordenadas</p>
              <p className="mt-1 font-mono text-sm text-slate-200">
                {position ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}` : "Buscando GPS..."}
              </p>
            </div>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre (aparece en el mensaje)"
              className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-semibold outline-none placeholder:text-slate-600 focus:border-emerald-500"
            />
          </section>

          <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900">
            <LiveMap position={position} trail={trail} active={active} className="h-[300px] w-full md:h-full" />
          </section>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => sendWhatsapp(contacts[0]?.phone)}
            className="flex flex-col items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-950/60 px-3 py-5 font-black transition active:scale-95"
          >
            <span className="text-2xl">💬</span>
            <span className="text-xs md:text-sm">WhatsApp</span>
          </button>

          <button
            onClick={sendSOS}
            className="sg-sos flex flex-col items-center gap-2 rounded-2xl border border-red-500/40 px-3 py-5 font-black text-red-100 transition active:scale-95"
          >
            <span className="text-2xl">🚨</span>
            <span className="text-xs md:text-sm">SOS</span>
          </button>

          <button
            onClick={shareApp}
            className="flex flex-col items-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-950/60 px-3 py-5 font-black transition active:scale-95"
          >
            <span className="text-2xl">📤</span>
            <span className="text-xs md:text-sm">Compartir</span>
          </button>
        </div>

        {/* CONTACTOS DE CONFIANZA */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
          <button
            onClick={() => setShowContacts((v) => !v)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span>
              <span className="block font-black">👥 Contactos de confianza</span>
              <span className="mt-0.5 block text-sm text-slate-400">
                {contacts.length === 0
                  ? "Agrega a quién avisar en una emergencia"
                  : `${contacts.length} contacto${contacts.length > 1 ? "s" : ""} guardado${contacts.length > 1 ? "s" : ""}`}
              </span>
            </span>
            <span className="text-xl text-slate-400">{showContacts ? "▲" : "▼"}</span>
          </button>

          {showContacts && (
            <div className="mt-5 space-y-3">
              {contacts.map((c) => (
                <div key={c.id} className="flex items-center gap-2 rounded-2xl bg-white/5 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{c.name}</p>
                    <p className="truncate text-xs text-slate-400">+{c.phone}</p>
                  </div>
                  <button
                    onClick={() => sendWhatsapp(c.phone)}
                    className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-slate-950"
                  >
                    Enviar
                  </button>
                  <button
                    onClick={() => setContacts((p) => p.filter((x) => x.id !== c.id))}
                    className="rounded-xl border border-red-500/50 px-3 py-2 text-xs font-black text-red-400"
                  >
                    ✕
                  </button>
                </div>
              ))}

              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  placeholder="Nombre"
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-emerald-500"
                />
                <input
                  value={cPhone}
                  onChange={(e) => setCPhone(e.target.value)}
                  placeholder="529611234567"
                  inputMode="numeric"
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-emerald-500"
                />
                <button
                  onClick={addContact}
                  className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950"
                >
                  Agregar
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Usa el formato internacional: 52 + tu número. Ejemplo: 529611234567
              </p>
            </div>
          )}
        </section>

        {/* CÓMO FUNCIONA */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
          <div className="flex gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
              ℹ️
            </span>
            <div>
              <h3 className="font-black">¿Cómo funciona?</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                Presiona <b className="text-emerald-400">SÍGUEME EN VIVO</b> para compartir tu ubicación en
                tiempo real. Usa <b className="text-red-400">SOS</b> para alertas de emergencia inmediatas. Tus
                contactos reciben un enlace de Google Maps con tu posición exacta.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500">
        <p className="font-semibold">SÍGUEME · {CITY}</p>
        <p className="mt-1">© 2026 · Seguridad Personal</p>
      </footer>
    </div>
  );
}
