import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import type { WasteReport, WasteReportStatus } from "../../types/wasteReport";
import { BACKEND_ORIGIN } from "../../lib/config";

function statusStyles(status: WasteReportStatus) {
  switch (status) {
    case "OPEN":
      return "bg-amber-50/80 text-amber-700 border-amber-200 shadow-[0_0_6px_rgba(251,191,36,0.25)]";
    case "IN_PROGRESS":
      return "bg-blue-50/80 text-blue-700 border-blue-200 shadow-[0_0_6px_rgba(59,130,246,0.25)]";
    case "RESOLVED":
      return "bg-emerald-50/80 text-emerald-700 border-emerald-200 shadow-[0_0_6px_rgba(16,185,129,0.25)]";
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

function extractApiError(err: any): string {
  const data = err?.response?.data;
  if (!data) return "Something went wrong.";

  if (typeof data?.detail === "string") return data.detail;

  if (Array.isArray(data?.detail)) {
    const first = data.detail[0];
    const msg = first?.msg ? String(first.msg) : "Validation error.";
    const loc = Array.isArray(first?.loc) ? first.loc.join(" → ") : "";
    return loc ? `${msg} (${loc})` : msg;
  }

  if (typeof data?.message === "string") return data.message;

  try {
    return JSON.stringify(data);
  } catch {
    return "Something went wrong.";
  }
}

export function WorkerAvailableReportsPage() {
  const [reports, setReports] = useState<WasteReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<number | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const res = await api.get<WasteReport[]>("/waste/reports/available");
        setReports(res.data);
      } catch (err) {
        console.error(err);
        setError(extractApiError(err) || "Failed to load available reports.");
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
      setError(null);
      setClaimingId(reportId);
      const res = await api.post(`/waste/reports/${reportId}/claim`);
      const claimed = res.data;

      setReports((prev) => prev.filter((r) => r.id !== claimed.id));
    } catch (err: any) {
      console.error(err);
      setError(extractApiError(err) || "Could not claim this report.");
    } finally {
      setClaimingId(null);
    }
  }

  function handleLogSegregation(report: WasteReport) {
    setError(null);

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
      <div className="animate-pulse text-slate-600 text-sm">
        Loading available reports…
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute inset-x-0 -top-10 h-24 bg-[radial-gradient(circle_at_top,_#bbf7d0,_transparent_65%)] opacity-70" />

      <header className="relative z-10 space-y-1">
        <h1 className="text-2xl font-bold text-emerald-900">
          Available Reports
        </h1>
        <p className="text-sm text-slate-600">
          These are open reports that do not yet have a worker.
          <br /> Claim one to start working on it.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {reports.length === 0 && !error && (
        <div
          className="
            rounded-2xl border border-emerald-100 bg-white/70
            p-6 text-center text-slate-600 shadow-md shadow-emerald-100/50
            backdrop-blur-sm
          "
        >
          No unassigned reports right now!
          <br />
          <span className="text-emerald-700 font-medium">
            Great job keeping the city clean 🌿
          </span>
        </div>
      )}

      <div className="space-y-4">
        {reports.map((r) => {
          const created = formatIST(r.created_at);

          return (
            <div
              key={r.id}
              className="
                group relative flex flex-col gap-4 rounded-3xl
                border border-emerald-100/70 bg-white/70
                p-5 shadow-lg shadow-emerald-100/50
                backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-emerald-200/70
                md:flex-row md:items-center
              "
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-semibold text-slate-900">
                    {r.public_id ? `Report ${r.public_id}` : `Report #${r.id}`}
                  </h2>

                  <span
                    className={`
                      inline-flex items-center rounded-full border px-3 py-0.5
                      text-[0.7rem] font-medium
                      ${statusStyles(r.status)}
                    `}
                  >
                    {r.status.replace("_", " ")}
                  </span>
                </div>

                {r.description && (
                  <p className="text-sm text-slate-700">{r.description}</p>
                )}

                <p className="text-xs text-slate-500">
                  Created: {created}
                  {r.latitude && r.longitude && (
                    <>
                      {" • "}
                      Location: {r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}
                    </>
                  )}
                </p>
              </div>

              {r.image_path && (
                <div className="w-full md:w-44 flex-shrink-0">
                  <div
                    className="
                      relative overflow-hidden rounded-2xl border border-emerald-100
                      bg-white/60 shadow-inner shadow-emerald-100/40
                      backdrop-blur-sm aspect-video
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

              <div className="flex flex-col items-stretch md:items-end md:w-44 gap-2">
                <button
                  onClick={() => handleClaim(r.id)}
                  disabled={claimingId === r.id}
                  className="
                    rounded-full bg-emerald-600 px-5 py-2
                    text-sm font-medium text-white shadow-md shadow-emerald-400/40
                    hover:bg-emerald-700 transition disabled:opacity-60
                  "
                >
                  {claimingId === r.id ? "Claiming…" : "Accept Job"}
                </button>

                {r.household_id && (
                  <button
                    type="button"
                    onClick={() => handleLogSegregation(r)}
                    className="
                      rounded-full border border-emerald-100 bg-emerald-50/70 px-5 py-2
                      text-xs font-medium text-emerald-800 hover:bg-emerald-100
                      transition
                    "
                  >
                    Log segregation for this site
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
