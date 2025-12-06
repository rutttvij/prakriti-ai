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

export function WorkerMyReportsPage() {
  const [reports, setReports] = useState<WasteReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<WasteReport[]>("/waste/reports/assigned/me");
        setReports(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load your assigned reports.");
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

  async function updateStatus(reportId: number, status: WasteReportStatus) {
    try {
      setUpdatingId(reportId);
      const res = await api.patch<WasteReport>(
        `/waste/reports/${reportId}/worker-status`,
        { status },
      );
      const updated = res.data;
      setReports((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r)),
      );
    } catch (err: any) {
      console.error(err);
      const detail =
        err?.response?.data?.detail || "Could not update report status.";
      setError(detail);
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return <p className="text-slate-600">Loading your assigned reports…</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-emerald-800">
          My Assigned Reports
        </h1>
        <p className="text-sm text-slate-600">
          Manage the waste reports that are assigned to you. Update their status
          as you work.
        </p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {reports.length === 0 && !error && (
        <p className="text-sm text-slate-500">
          You don&apos;t have any assigned reports yet. Claim a report from{" "}
          <span className="font-medium">Available reports</span>.
        </p>
      )}

      <div className="space-y-3">
        {reports.map((r) => {
          const created = new Date(r.created_at).toLocaleString();
          const resolved = r.resolved_at
            ? new Date(r.resolved_at).toLocaleString()
            : null;

          const canStart =
            r.status === "OPEN" || r.status === "IN_PROGRESS";
          const canResolve = r.status !== "RESOLVED";

          return (
            <div
              key={r.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-stretch md:justify-between"
            >
              <div className="flex-1 space-y-2">
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
                  {resolved && (
                    <>
                      {" • "}Resolved: {resolved}
                    </>
                  )}
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

              <div className="flex w-full flex-col items-stretch justify-center gap-2 md:w-44">
                <button
                  type="button"
                  onClick={() => updateStatus(r.id, "IN_PROGRESS")}
                  disabled={!canStart || updatingId === r.id}
                  className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-50"
                >
                  {updatingId === r.id && canStart
                    ? "Updating…"
                    : "Mark in progress"}
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(r.id, "RESOLVED")}
                  disabled={!canResolve || updatingId === r.id}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {updatingId === r.id && canResolve
                    ? "Updating…"
                    : "Mark resolved"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
