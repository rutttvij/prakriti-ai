import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import type { WasteReport } from "../../types/wasteReport";

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
    hour12: false,
  }).format(d);
}

function extractApiError(err: any): string {
  const data = err?.response?.data;
  if (!data) return "Something went wrong.";
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.message === "string") return data.message;
  return "Something went wrong.";
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
        setError(extractApiError(err) || "Failed to load available reports.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const withCoords = useMemo(
    () => reports.filter((r) => typeof r.latitude === "number" && typeof r.longitude === "number").length,
    [reports]
  );

  async function handleClaim(reportId: number) {
    try {
      setError(null);
      setClaimingId(reportId);
      const res = await api.post(`/waste/reports/${reportId}/claim`);
      const claimed = res.data;
      setReports((prev) => prev.filter((r) => r.id !== claimed.id));
    } catch (err: any) {
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

    const code = report.public_id ? report.public_id : `CIT-${report.id.toString().padStart(3, "0")}`;

    navigate(
      `/worker/segregation?householdId=${report.household_id}` +
        `&reportCode=${encodeURIComponent(code)}` +
        `&reportId=${report.id}`
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-white/20 bg-slate-950/26 p-5 shadow-[0_24px_50px_rgba(5,22,27,0.38)] backdrop-blur-xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/16 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-emerald-100 shadow-sm shadow-emerald-950/30 backdrop-blur-md">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Waste Worker · Available Reports
        </div>
        <h1 className="mt-3 text-4xl font-semibold !text-[#dffaf0]" style={{ color: "#dffaf0" }}>Available Reports</h1>
        <p className="mt-1 text-sm text-emerald-100">Claim open reports and move them into your active execution queue.</p>
      </section>

      <section className="surface-card-strong rounded-[1.8rem] px-5 py-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">Open reports</p>
            <p className="mt-1 text-4xl font-semibold text-slate-900">{loading ? "--" : reports.length}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">With coordinates</p>
            <p className="mt-1 text-4xl font-semibold text-slate-900">{loading ? "--" : withCoords}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Without coordinates</p>
            <p className="mt-1 text-4xl font-semibold text-slate-900">{loading ? "--" : Math.max(reports.length - withCoords, 0)}</p>
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="surface-card-strong rounded-[1.8rem] px-5 py-4">
        <h2 className="mb-3 text-4xl font-semibold text-slate-900">{reports.length} reports in view</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-emerald-100 text-xs uppercase tracking-[0.12em] text-slate-500">
                <th className="px-3 py-2 text-left">Report</th>
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-left">Created</th>
                <th className="px-3 py-2 text-left">Location</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">Loading available reports...</td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">No unassigned reports right now.</td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id} className="border-b border-emerald-100/70">
                    <td className="px-3 py-2 text-slate-900">
                      {r.public_id || `Report #${r.id}`}
                      <div className="text-xs text-slate-500">{r.status.replaceAll("_", " ")}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{r.description || "-"}</td>
                    <td className="px-3 py-2 text-slate-700">{formatIST(r.created_at) || "-"}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {typeof r.latitude === "number" && typeof r.longitude === "number"
                        ? `${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}`
                        : "Not provided"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleClaim(r.id)}
                          disabled={claimingId === r.id}
                          className="btn-primary px-3 py-1 text-xs"
                        >
                          {claimingId === r.id ? "Claiming..." : "Claim"}
                        </button>
                        {!!r.household_id && (
                          <button className="btn-secondary px-3 py-1 text-xs" onClick={() => handleLogSegregation(r)}>
                            Log Segregation
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
