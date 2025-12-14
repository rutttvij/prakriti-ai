import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import type { WasteReport, WasteReportStatus } from "../../types/wasteReport";
import { BACKEND_ORIGIN } from "../../lib/config";

function statusStyles(status: WasteReportStatus) {
  switch (status) {
    case "OPEN":
      return "bg-amber-50/80 text-amber-700 border-amber-200";
    case "IN_PROGRESS":
      return "bg-blue-50/80 text-blue-700 border-blue-200";
    case "RESOLVED":
      return "bg-emerald-50/80 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-50/80 text-slate-700 border-slate-200";
  }
}

function formatIST(input: string | Date | null | undefined) {
  if (!input) return "";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
}

export function WorkerMyReportsPage() {
  const [reports, setReports] = useState<WasteReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const navigate = useNavigate();

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
      setError(null);
      setUpdatingId(reportId);
      const res = await api.patch<WasteReport>(
        `/waste/reports/${reportId}/worker-status`,
        { status }
      );

      const updated = res.data;
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err: any) {
      console.error(err);
      const detail =
        err?.response?.data?.detail || "Could not update report status.";
      setError(detail);
    } finally {
      setUpdatingId(null);
    }
  }

  function handleLogSegregation(report: WasteReport) {
    if (!report.household_id) {
      setError("This report is not linked to a household yet.");
      return;
    }

    const code = report.public_id
      ? report.public_id
      : `CIT-${report.id.toString().padStart(3, "0")}`;

    navigate(
      `/worker/segregation?householdId=${report.household_id}` +
        `&reportCode=${encodeURIComponent(code)}` +
        `&reportId=${report.id}`
    );
  }

  if (loading) {
    return (
      <p className="text-sm text-slate-600 animate-pulse">
        Loading your assigned reports…
      </p>
    );
  }

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute inset-x-0 -top-12 h-24 bg-[radial-gradient(circle_at_top,_#bbf7d0,_transparent_65%)] opacity-70" />

      <header className="relative z-10 space-y-1">
        <h1 className="text-2xl font-bold text-emerald-900">
          My Assigned Reports
        </h1>
        <p className="text-sm text-slate-600">
          Manage your assigned waste reports and update progress in real time.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-xs text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {reports.length === 0 && !error && (
        <p className="text-sm text-slate-500">
          You don't have any assigned reports yet. Claim one from{" "}
          <span className="font-semibold text-emerald-700">
            Available Reports
          </span>
          .
        </p>
      )}

      <div className="relative space-y-4">
        {reports.map((r) => {
          const created = formatIST(r.created_at);
          const resolved = r.resolved_at ? formatIST(r.resolved_at) : null;

          const canStart = r.status === "OPEN" || r.status === "IN_PROGRESS";
          const canResolve = r.status !== "RESOLVED";

          return (
            <div
              key={r.id}
              className="
                relative z-10 flex flex-col gap-4 rounded-3xl
                border border-emerald-100/70 bg-white/70
                shadow-md shadow-emerald-100/60 backdrop-blur-xl
                p-5 md:flex-row md:items-stretch md:justify-between
              "
            >
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-900">
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
                  <p className="text-sm text-slate-700">{r.description}</p>
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
                      {" • "}Location: {r.latitude}, {r.longitude}
                    </>
                  )}
                </p>
              </div>

              {r.image_path && (
                <div className="w-full flex-shrink-0 md:w-40">
                  <div
                    className="
                      relative aspect-video overflow-hidden rounded-xl
                      border border-emerald-100/70 bg-emerald-50/40
                    "
                  >
                    <img
                      src={buildImageUrl(r.image_path)}
                      alt={`Waste report ${r.id}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              )}

              <div className="flex w-full flex-col items-stretch justify-center gap-2 md:w-56">
                {r.household_id && (
                  <button
                    type="button"
                    onClick={() => handleLogSegregation(r)}
                    className="
                      rounded-xl border border-emerald-100 bg-emerald-50/80 
                      px-3 py-2 text-xs font-semibold text-emerald-800
                      hover:bg-emerald-100 transition
                    "
                  >
                    Log segregation for this site
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => updateStatus(r.id, "IN_PROGRESS")}
                  disabled={!canStart || updatingId === r.id}
                  className="
                    rounded-xl border border-sky-200 bg-sky-50/80 
                    px-3 py-2 text-sm font-semibold text-sky-800
                    hover:bg-sky-100/80 disabled:opacity-50
                  "
                >
                  {updatingId === r.id && canStart ? "Updating…" : "Mark in progress"}
                </button>

                <button
                  type="button"
                  onClick={() => updateStatus(r.id, "RESOLVED")}
                  disabled={!canResolve || updatingId === r.id}
                  className="
                    rounded-xl bg-emerald-600 px-3 py-2 
                    text-sm font-semibold text-white
                    shadow-sm shadow-emerald-400/40
                    hover:bg-emerald-700 disabled:opacity-50
                  "
                >
                  {updatingId === r.id && canResolve ? "Updating…" : "Mark resolved"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
