import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import type { WasteReport, WasteReportStatus } from "../../types/wasteReport";

interface Stats {
  assignedTotal: number;
  openQueue: number;
  inProgress: number;
  resolved: number;
  availableOpen: number;
}

function statusCounts(reports: WasteReport[]): Record<WasteReportStatus, number> {
  const counts: Record<WasteReportStatus, number> = {
    OPEN: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
  };
  for (const r of reports) {
    if (r.status in counts) counts[r.status as WasteReportStatus] += 1;
  }
  return counts;
}

export function WorkerDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [assignedRes, availableRes] = await Promise.all([
          api.get<WasteReport[]>("/waste/reports/assigned/me"),
          api.get<WasteReport[]>("/waste/reports/available"),
        ]);

        const assigned = assignedRes.data;
        const available = availableRes.data;
        const counts = statusCounts(assigned);

        setStats({
          assignedTotal: assigned.length,
          openQueue: available.length,
          inProgress: counts.IN_PROGRESS,
          resolved: counts.RESOLVED,
          availableOpen: available.length,
        });
      } catch (err) {
        console.error(err);
        setError("Could not load worker dashboard data.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  if (loading) return <div className="text-sm text-slate-600">Loading dashboard...</div>;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-white/20 bg-slate-950/26 p-5 shadow-[0_24px_50px_rgba(5,22,27,0.38)] backdrop-blur-xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/16 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-emerald-100 shadow-sm shadow-emerald-950/30 backdrop-blur-md">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Waste Worker · Operations
        </div>
        <h1 className="mt-3 text-4xl font-semibold !text-[#dffaf0]" style={{ color: "#dffaf0" }}>Worker Dashboard</h1>
        <p className="mt-1 text-sm text-emerald-100">Manage assigned reports, claim open jobs, and update field execution in real time.</p>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {stats && (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <div className="surface-card-strong rounded-[1.6rem] p-4">
              <p className="text-xs text-slate-500">Assigned reports</p>
              <p className="mt-1 text-4xl font-semibold text-slate-900">{stats.assignedTotal}</p>
            </div>
            <div className="surface-card-strong rounded-[1.6rem] p-4">
              <p className="text-xs text-slate-500">Open queue</p>
              <p className="mt-1 text-4xl font-semibold text-amber-700">{stats.openQueue}</p>
            </div>
            <div className="surface-card-strong rounded-[1.6rem] p-4">
              <p className="text-xs text-slate-500">In progress</p>
              <p className="mt-1 text-4xl font-semibold text-sky-700">{stats.inProgress}</p>
            </div>
            <div className="surface-card-strong rounded-[1.6rem] p-4">
              <p className="text-xs text-slate-500">Resolved</p>
              <p className="mt-1 text-4xl font-semibold text-emerald-700">{stats.resolved}</p>
            </div>
          </section>

          <section className="surface-card-strong rounded-[1.8rem] px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Execution Queue</h2>
                <p className="mt-1 text-sm text-slate-600">{stats.availableOpen} unassigned reports are waiting to be claimed.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/worker/reports/available" className="btn-primary px-4 py-2 text-sm">Open Available Reports</Link>
                <Link to="/worker/reports/my" className="btn-secondary px-4 py-2 text-sm">Open My Assigned</Link>
                <Link to="/worker/route-map" className="btn-secondary px-4 py-2 text-sm">Open Route Map</Link>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
