import { useEffect, useState } from "react";
import CitizenPageHero from "../../components/citizen/CitizenPageHero";
import { fetchCitizenWasteReports } from "../../lib/api";
import type { CitizenWasteReport } from "../../lib/types";
import { BACKEND_ORIGIN } from "../../lib/config";

function statusClass(status: string) {
  if (status === "resolved") return "bg-emerald-100 text-emerald-800";
  return "bg-amber-100 text-amber-800";
}

function toImageSrc(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${BACKEND_ORIGIN}${url}`;
  return `${BACKEND_ORIGIN}/${url}`;
}

export default function CitizenMyReportsPage() {
  const [items, setItems] = useState<CitizenWasteReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCitizenWasteReports();
        setItems(data);
      } catch (e: any) {
        setError(e?.response?.data?.detail || "Failed to load reports.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  useEffect(() => {
    if (!previewSrc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewSrc(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewSrc]);

  return (
    <div className="space-y-5">
      <CitizenPageHero
        badge="CITIZEN · REPORTS"
        title="My Reports"
        subtitle="Track report status, classification details, and resolution timeline."
      />

      {error && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((r) => (
          <div key={r.id} className="surface-card-strong rounded-3xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-slate-500">Report #{r.public_id || r.id}</p>
                <p className="mt-1 text-sm text-slate-700">{new Date(r.created_at).toLocaleString()}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs ${statusClass(r.status)}`}>{r.status}</span>
            </div>

            {toImageSrc(r.image_url) && (
              <button
                type="button"
                className="mt-3 block w-full overflow-hidden rounded-xl border border-white/40 bg-white/40"
                onClick={() => setPreviewSrc(toImageSrc(r.image_url)!)}
              >
                <img
                  src={toImageSrc(r.image_url)!}
                  alt="report"
                  className="h-32 w-full object-cover transition hover:scale-[1.02]"
                />
              </button>
            )}

            <p className="mt-3 text-sm text-slate-800">{r.description || "No description"}</p>
            <p className="mt-2 text-xs text-slate-500">
              {r.classification_label ? `Classified as ${r.classification_label}` : "No classification"}
              {typeof r.classification_confidence === "number" ? ` · ${(r.classification_confidence * 100).toFixed(1)}%` : ""}
            </p>
            <p className="mt-1 text-xs text-slate-500">Resolved: {r.resolved_at ? new Date(r.resolved_at).toLocaleString() : "Not yet"}</p>
          </div>
        ))}
      </div>

      {loading && <div className="surface-card-strong rounded-xl p-3 text-sm text-slate-600">Loading reports...</div>}
      {!loading && items.length === 0 && (
        <div className="surface-card-strong rounded-xl p-3 text-sm text-slate-600">No reports yet. Submit your first report from Report Waste.</div>
      )}

      {previewSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
          onClick={() => setPreviewSrc(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-5xl overflow-hidden rounded-2xl border border-white/20 bg-slate-900 p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-sm text-white"
              onClick={() => setPreviewSrc(null)}
            >
              Close
            </button>
            <img src={previewSrc} alt="Report full preview" className="max-h-[86vh] max-w-[90vw] rounded-xl object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
