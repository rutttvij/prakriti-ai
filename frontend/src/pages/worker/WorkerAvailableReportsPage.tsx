import { useEffect, useState } from "react";
import api from "../../lib/api";
import type { WasteReport, WasteReportStatus } from "../../types/wasteReport";
import { BACKEND_ORIGIN } from "../../lib/config";

function statusStyles(status: WasteReportStatus) {
  switch (status) {
    case "OPEN":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "IN_PROGRESS":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "RESOLVED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

export function WorkerAvailableReportsPage() {
  const [reports, setReports] = useState<WasteReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<WasteReport[]>("/waste/reports/available");
        setReports(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load available reports.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function buildImageUrl(imagePath: string) {
    if (imagePath.startsWith("http")) return imagePath;
    return `${BACKEND_ORIGIN}/${imagePath.replace(/^\/+/, "")}`;
  }

  async function handleClaim(reportId: number) {
    try {
      setClaimingId(reportId);
      const res = await api.post<WasteReport>(
        `/waste/reports/${reportId}/claim`,
      );
      const claimed = res.data;

      // Remove from available list once claimed
      setReports((prev) => prev.filter((r) => r.id !== claimed.id));
    } catch (err: any) {
      console.error(err);
      const detail =
        err?.response?.data?.detail || "Could not claim this report.";
      setError(detail);
    } finally {
      setClaimingId(null);
    }
  }

  if (loading) {
    return <p className="text-slate-600">Loading available reports…</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-emerald-800">
          Available Reports
        </h1>
        <p className="text-sm text-slate-600">
          These are open reports that do not yet have a worker. Claim one to
          start working on it.
        </p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {reports.length === 0 && !error && (
        <p className="text-sm text-slate-500">
          There are currently no unassigned reports. Great job keeping the city
          clean!
        </p>
      )}

      <div className="space-y-3">
        {reports.map((r) => {
          const created = new Date(r.created_at).toLocaleString();

          return (
            <div
              key={r.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-stretch md:justify-between"
            >
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-800">
                    {r.public_id ? `Report ${r.public_id}` : `Report #${r.id}`}
                  </h2>
                  <span
                    className={
                      "inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-medium " +
                      statusStyles(r.status)
                    }
                  >
                    {r.status.replace("_", " ")}
                  </span>
                </div>
                {r.description && (
                  <p className="text-sm text-slate-600">{r.description}</p>
                )}

                <p className="text-xs text-slate-500">
                  Created: {created}
                  {r.latitude && r.longitude && (
                    <>
                      {" • "}
                      Location: {r.latitude}, {r.longitude}
                    </>
                  )}
                </p>
              </div>

              {r.image_path && (
                <div className="w-full flex-shrink-0 md:w-40">
                  <div className="relative aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                    <img
                      src={buildImageUrl(r.image_path)}
                      alt={`Waste report ${r.id}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              )}

              <div className="flex w-full items-center justify-start md:w-40 md:justify-end">
                <button
                  type="button"
                  onClick={() => handleClaim(r.id)}
                  disabled={claimingId === r.id}
                  className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 md:w-auto"
                >
                  {claimingId === r.id ? "Claiming…" : "Accept job"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
