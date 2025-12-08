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

function statusCounts(
  reports: WasteReport[]
): Record<WasteReportStatus, number> {
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
    return (
      <p className="text-sm text-slate-600 animate-pulse">
        Loading your dashboard…
      </p>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-xs text-red-700 shadow-sm">
        {error}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="relative space-y-6">
      {/* soft emerald glow behind header */}
      <div className="pointer-events-none absolute inset-x-0 -top-10 h-24 bg-[radial-gradient(circle_at_top,_#bbf7d0,_transparent_65%)] opacity-70" />

      {/* HEADER */}
      <header className="relative z-10 space-y-1">
        <h1 className="text-2xl font-bold text-emerald-900">
          Waste Worker Dashboard
        </h1>
        <p className="text-sm text-slate-600">
          Track your report workload, see what&apos;s completed, and find new
          jobs to claim in the city.
        </p>
      </header>

      {/* STATS GRID */}
      <section className="relative z-10 grid gap-4 md:grid-cols-4">
        {/* Assigned to you */}
        <div
          className="
            rounded-2xl border border-emerald-100/80 bg-white/80
            px-4 py-3 shadow-md shadow-emerald-100/70 backdrop-blur-sm
          "
        >
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Assigned to you
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-900">
            {stats.assignedTotal}
          </p>
          <p className="mt-1 text-[0.7rem] text-slate-500">
            Total reports currently on your route.
          </p>
        </div>

        {/* Open */}
        <div
          className="
            rounded-2xl border border-amber-100/80 bg-amber-50/80
            px-4 py-3 shadow-md shadow-amber-100/60 backdrop-blur-sm
          "
        >
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-amber-700">
            Open jobs
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-900">
            {stats.open}
          </p>
          <p className="mt-1 text-[0.7rem] text-amber-800/80">
            Not started yet. Prioritise these first.
          </p>
        </div>

        {/* In progress */}
        <div
          className="
            rounded-2xl border border-sky-100/80 bg-sky-50/80
            px-4 py-3 shadow-md shadow-sky-100/60 backdrop-blur-sm
          "
        >
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-sky-700">
            In progress
          </p>
          <p className="mt-1 text-2xl font-bold text-sky-900">
            {stats.inProgress}
          </p>
          <p className="mt-1 text-[0.7rem] text-slate-600">
            Reports where work is already underway.
          </p>
        </div>

        {/* Completed */}
        <div
          className="
            rounded-2xl border border-emerald-100/80 bg-gradient-to-br
            from-emerald-50/90 via-white/90 to-emerald-50/80
            px-4 py-3 shadow-md shadow-emerald-100/70 backdrop-blur-sm
          "
        >
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-700">
            Completed reports
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-900">
            {stats.resolved}
          </p>
          <p className="mt-1 text-[0.7rem] text-slate-600">
            Closed with proof and confirmation.
          </p>
        </div>
      </section>

      {/* AVAILABLE + COMPLETED “SIDEBAR” SUMMARY */}
      <section
        className="
          relative z-10 rounded-3xl border border-emerald-100/80
          bg-white/80 px-5 py-4 shadow-md shadow-emerald-100/70
          backdrop-blur-sm flex flex-col gap-3 md:flex-row md:items-center md:justify-between
        "
      >
        {/* Left: open queue */}
        <div>
          <p className="text-sm text-slate-700">
            There are{" "}
            <span className="font-semibold text-emerald-800">
              {stats.availableOpen}
            </span>{" "}
            open reports in the city waiting to be claimed.
          </p>
          <p className="text-[0.7rem] text-slate-500">
            Go to <span className="font-semibold">Available Reports</span> to
            pick the nearest job on your route.
          </p>
        </div>

        {/* Right: compact chips – acts like a mini sidebar summary */}
        <div className="flex flex-wrap gap-2 justify-start md:justify-end">
          <span
            className="
              inline-flex items-center rounded-full border border-emerald-500/70
              bg-emerald-50/80 px-4 py-1.5 text-[0.75rem] font-semibold
              text-emerald-800 shadow-sm shadow-emerald-100
            "
          >
            🧹 Open queue · claim a job
          </span>

          <span
            className="
              inline-flex items-center rounded-full border border-emerald-200/80
              bg-emerald-50/70 px-4 py-1.5 text-[0.75rem] font-semibold
              text-emerald-900
            "
          >
            ✅ Completed reports: {stats.resolved}
          </span>
        </div>
      </section>
    </div>
  );
}
