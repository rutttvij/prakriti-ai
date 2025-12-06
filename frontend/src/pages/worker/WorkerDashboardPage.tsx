import { useEffect, useState } from "react";
import api from "../../lib/api";
import type { WasteReport, WasteReportStatus } from "../../types/wasteReport";

interface Stats {
  assignedTotal: number;
  open: number;
  inProgress: number;
  resolved: number;
  availableOpen: number;
}

function statusCounts(reports: WasteReport[]): Record<WasteReportStatus, number> {
  const counts: any = {
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
          open: counts.OPEN,
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

    load();
  }, []);

  if (loading) {
    return <p className="text-slate-600">Loading your dashboard…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  if (!stats) return null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-emerald-800">
          Waste Worker Dashboard
        </h1>
        <p className="text-sm text-slate-600">
          View the waste reports assigned to you and what&apos;s waiting to be
          picked up.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            Assigned to you
          </p>
          <p className="mt-1 text-2xl font-semibold text-emerald-900">
            {stats.assignedTotal}
          </p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
            Open jobs
          </p>
          <p className="mt-1 text-2xl font-semibold text-amber-900">
            {stats.open}
          </p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
            In progress
          </p>
          <p className="mt-1 text-2xl font-semibold text-blue-900">
            {stats.inProgress}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
            Completed
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {stats.resolved}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-sm text-slate-700">
          <span className="font-semibold">{stats.availableOpen}</span> open
          reports in the city are waiting for a worker. Head to{" "}
          <span className="font-semibold">Available reports</span> to claim a
          new job.
        </p>
      </div>
    </div>
  );
}
