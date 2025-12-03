import { useEffect, useState } from "react";
import api from "../lib/api";
import type { WasteReport, WasteReportStatus } from "../types/wasteReport";
import { BACKEND_ORIGIN } from "../lib/config";

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

export default function MyReportsPage() {
  const [reports, setReports] = useState<WasteReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReports() {
      try {
        const res = await api.get<WasteReport[]>("/waste/reports/me");
        setReports(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load your reports.");
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  if (loading) {
    return <div className="text-slate-600">Loading your waste reports...</div>;
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-emerald-800">
          My Waste Reports
        </h1>
        <p className="text-sm text-slate-600">
          Track the status of waste issues you&apos;ve reported across the city.
        </p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {reports.length === 0 && !error && (
        <p className="text-sm text-slate-500">
          You haven&apos;t reported any waste yet. Use the{" "}
          <span className="font-medium">Report Waste</span> page to submit your
          first report.
        </p>
      )}

      <div className="space-y-3">
        {reports.map((r) => {
          const created = new Date(r.created_at).toLocaleString();
          const resolved = r.resolved_at
            ? new Date(r.resolved_at).toLocaleString()
            : null;

          return (
            <div
              key={r.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
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
                </p>
                {r.latitude && r.longitude && (
                  <p className="text-xs text-slate-500">
                    Location: {r.latitude}, {r.longitude}
                  </p>
                )}
              </div>

              {r.image_path && (
                    <div className="w-full md:w-40">
                        <div className="relative aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                            <img
                                src={
                                    r.image_path.startsWith("http")
                                       ? r.image_path
                                    : `${BACKEND_ORIGIN}/${r.image_path.replace(/^\/+/, "")}`
                                }
                                alt={`Waste report ${r.id}`}
                                className="h-full w-full object-cover"
                            />
                        </div>
                    </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
