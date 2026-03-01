import { useEffect, useState } from "react";
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

export function WorkerMyReportsPage() {
  const [reports, setReports] = useState<WasteReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    void load();
  }, []);

  function statusBadgeClass(status: WasteReport["status"]) {
    if (status === "RESOLVED") return "bg-emerald-100 text-emerald-700";
    if (status === "IN_PROGRESS") return "bg-sky-100 text-sky-700";
    return "bg-amber-100 text-amber-700";
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-white/20 bg-slate-950/26 p-5 shadow-[0_24px_50px_rgba(5,22,27,0.38)] backdrop-blur-xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/16 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-emerald-100 shadow-sm shadow-emerald-950/30 backdrop-blur-md">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Waste Worker · My Assigned
        </div>
        <h1 className="mt-3 text-4xl font-semibold !text-[#dffaf0]" style={{ color: "#dffaf0" }}>My Assigned Reports</h1>
        <p className="mt-1 text-sm text-emerald-100">Update report lifecycle and close tasks as field work progresses.</p>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="surface-card-strong rounded-[1.8rem] px-5 py-4">
        <h2 className="mb-3 text-4xl font-semibold text-slate-900">{loading ? "..." : reports.length} assigned reports</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-emerald-100 text-xs uppercase tracking-[0.12em] text-slate-500">
                <th className="px-3 py-2 text-left">Report</th>
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-left">Created</th>
                <th className="px-3 py-2 text-left">Resolved</th>
                <th className="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">Loading assigned reports...</td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">No assigned reports yet.</td>
                </tr>
              ) : (
                reports.map((r) => {
                  return (
                    <tr key={r.id} className="border-b border-emerald-100/70">
                      <td className="px-3 py-2 text-slate-900">
                        {r.public_id || `Report #${r.id}`}
                        <div className="text-xs text-slate-500">{r.status.replaceAll("_", " ")}</div>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{r.description || "-"}</td>
                      <td className="px-3 py-2 text-slate-700">{formatIST(r.created_at) || "-"}</td>
                      <td className="px-3 py-2 text-slate-700">{formatIST(r.resolved_at) || "-"}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(r.status)}`}>
                          {r.status.replaceAll("_", " ")}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
