import { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import type { WasteReport } from "../../types/wasteReport";
import { useAuth } from "../../contexts/AuthContext";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

type LatLng = { lat: number; lng: number };

function isValidCoord(n: unknown) {
  return typeof n === "number" && Number.isFinite(n);
}

function haversineKm(a: LatLng, b: LatLng) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R * c;
}

function buildRoute(start: LatLng, points: Array<{ id: number; pos: LatLng }>) {
  const remaining = [...points];
  const ordered: Array<{ id: number; pos: LatLng; kmFromPrev: number }> = [];
  let cur = start;
  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(cur, remaining[i].pos);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push({ ...next, kmFromPrev: bestDist });
    cur = next.pos;
  }
  return ordered;
}

function googleMapsDirLink(from: LatLng, to: LatLng) {
  const origin = `${from.lat},${from.lng}`;
  const dest = `${to.lat},${to.lng}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&travelmode=driving`;
}

function googleMapsPinLink(to: LatLng) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${to.lat},${to.lng}`)}`;
}

export default function WorkerRouteMapPage() {
  const { user } = useAuth();

  const [reports, setReports] = useState<WasteReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [workerPos, setWorkerPos] = useState<LatLng | null>(null);
  const [geoErr, setGeoErr] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "WASTE_WORKER") return;

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await api.get<WasteReport[]>("/waste/reports/assigned/me");
        setReports(res.data || []);
      } catch (e) {
        console.error(e);
        setErr("Could not load assigned reports.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "WASTE_WORKER") return;

    setGeoErr(null);

    if (!("geolocation" in navigator)) {
      setGeoErr("Geolocation is not available in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setWorkerPos({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (error) => {
        console.error(error);
        setGeoErr("Location permission denied. Enable location to build the route.");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }, [user]);

  const geoReports = useMemo(() => {
    return reports
      .filter((r) => isValidCoord(r.latitude) && isValidCoord(r.longitude))
      .map((r) => ({
        report: r,
        pos: { lat: r.latitude as number, lng: r.longitude as number },
      }));
  }, [reports]);

  const startPos = useMemo<LatLng | null>(() => {
    if (workerPos) return workerPos;
    if (geoReports.length) return geoReports[0].pos;
    return null;
  }, [workerPos, geoReports]);

  const route = useMemo(() => {
    if (!startPos) return [];
    const points = geoReports.map((x) => ({ id: x.report.id, pos: x.pos }));
    return buildRoute(startPos, points);
  }, [geoReports, startPos]);

  const polyline = useMemo(() => {
    if (!startPos) return [];
    const pts: [number, number][] = [[startPos.lat, startPos.lng]];
    for (const s of route) pts.push([s.pos.lat, s.pos.lng]);
    return pts;
  }, [route, startPos]);

  const center = useMemo<[number, number]>(() => {
    if (selectedId) {
      const hit = geoReports.find((x) => x.report.id === selectedId);
      if (hit) return [hit.pos.lat, hit.pos.lng];
    }
    if (startPos) return [startPos.lat, startPos.lng];
    return [19.076, 72.8777];
  }, [selectedId, geoReports, startPos]);

  if (user && user.role !== "WASTE_WORKER") {
    return (
      <div className="min-h-[60vh] bg-gradient-to-b from-emerald-50/70 to-white flex items-center">
        <div className="max-w-xl mx-auto rounded-2xl border border-emerald-100 bg-white/80 shadow-sm p-6">
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 mb-3">
            Route map
          </span>
          <h1 className="text-2xl font-semibold text-emerald-900 mb-2">Worker route planner</h1>
          <p className="text-sm text-slate-600">
            This page is only for <span className="font-semibold text-emerald-800">Waste Workers</span>.
          </p>
        </div>
      </div>
    );
  }

  const hasCoords = geoReports.length > 0;

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-emerald-50/70 to-white -m-4 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 mb-2">
              Waste Worker · Route map
            </span>
            <h1 className="text-2xl md:text-3xl font-semibold text-emerald-900">Visit route planner</h1>
            <p className="mt-1 text-sm text-slate-600 max-w-2xl">
              Reports with coordinates are shown on the map. The route is ordered so the closest stops are attended first.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedId(null);
                if (!("geolocation" in navigator)) return;
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    setWorkerPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setGeoErr(null);
                  },
                  () => setGeoErr("Location permission denied. Enable location to build the route."),
                  { enableHighAccuracy: true, timeout: 12000 }
                );
              }}
              className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 border border-emerald-100 shadow-sm hover:bg-emerald-50/60"
            >
              Refresh location
            </button>
          </div>
        </div>

        {(err || geoErr) && (
          <div className="rounded-2xl border border-red-100 bg-red-50/70 px-4 py-3 text-sm text-red-700">
            {err || geoErr}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.25fr,0.75fr]">
          <div className="rounded-2xl border border-emerald-100 bg-white/90 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-100">
              <div className="text-sm font-semibold text-emerald-900">Map</div>
              <div className="text-[11px] text-slate-500">
                Stops: <span className="font-semibold text-slate-700">{route.length}</span>
              </div>
            </div>

            <div className="h-[520px]">
              <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {startPos && (
                  <Marker position={[startPos.lat, startPos.lng]}>
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold">You</div>
                        <div className="text-xs text-slate-600">
                          {startPos.lat.toFixed(6)}, {startPos.lng.toFixed(6)}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {route.length > 0 && <Polyline positions={polyline as any} />}

                {geoReports.map(({ report, pos }) => {
                  const orderIdx = route.findIndex((x) => x.id === report.id);
                  const label = orderIdx >= 0 ? `Stop ${orderIdx + 1}` : "Stop";
                  return (
                    <Marker
                      key={report.id}
                      position={[pos.lat, pos.lng]}
                      eventHandlers={{
                        click: () => setSelectedId(report.id),
                      }}
                    >
                      <Popup>
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-emerald-900">{label}</div>
                          <div className="text-xs text-slate-600">
                            {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
                          </div>
                          <div className="text-xs text-slate-700">
                            {report.public_id ?? `Report #${report.id}`} · {String(report.status).replaceAll("_", " ")}
                          </div>
                          <div className="pt-1">
                            <a
                              href={googleMapsPinLink(pos)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-2"
                            >
                              Open in Google Maps
                            </a>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white/90 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-emerald-900">Today’s stop order</h2>
              <span className="text-[11px] text-slate-500">
                {hasCoords ? "Nearest-first" : "No coordinates"}
              </span>
            </div>

            {loading ? (
              <p className="mt-3 text-sm text-slate-600">Loading assigned reports…</p>
            ) : !hasCoords ? (
              <div className="mt-3 rounded-xl border border-dashed border-emerald-100 bg-emerald-50/60 p-4">
                <p className="text-sm font-medium text-emerald-900">No reports with coordinates yet.</p>
                <p className="mt-1 text-xs text-emerald-800/80">
                  Ask citizens/bulk generators to enable location while reporting, or ensure latitude/longitude are stored.
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {route.map((stop, idx) => {
                  const hit = geoReports.find((x) => x.report.id === stop.id)?.report;
                  if (!hit) return null;
                  const to = stop.pos;
                  const from = idx === 0 ? startPos! : route[idx - 1].pos;
                  const dir = googleMapsDirLink(from, to);
                  const isSelected = selectedId === hit.id;
                  return (
                    <button
                      key={stop.id}
                      type="button"
                      onClick={() => setSelectedId(hit.id)}
                      className={[
                        "w-full text-left rounded-xl border px-3 py-2 transition",
                        isSelected
                          ? "border-emerald-200 bg-emerald-50/80"
                          : "border-slate-100 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-emerald-800">
                            Stop {idx + 1}{" "}
                            <span className="text-slate-500 font-medium">
                              · {hit.public_id ?? `Report #${hit.id}`}
                            </span>
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-600">
                            {to.lat.toFixed(6)}, {to.lng.toFixed(6)}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            Distance from previous:{" "}
                            <span className="font-semibold text-slate-700">
                              {stop.kmFromPrev.toFixed(2)} km
                            </span>
                          </div>
                        </div>

                        <a
                          href={dir}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 inline-flex items-center rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-emerald-600"
                        >
                          Navigate
                        </a>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {hasCoords && startPos && route.length > 0 && (
              <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                <div className="text-xs font-semibold text-emerald-900">Tip</div>
                <div className="mt-1 text-[11px] text-emerald-900/80">
                  The drawn line is an approximate path. “Navigate” uses Google Maps roads for real directions.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
