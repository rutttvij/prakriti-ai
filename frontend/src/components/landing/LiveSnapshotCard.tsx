import { CardStrong } from "../ui/Card";

import type { PublicStats } from "../../lib/types";

export function LiveSnapshotCard({ stats }: { stats: PublicStats | null }) {
  const openReports = stats?.open_reports ?? 0;
  const avgHours = stats?.avg_resolution_time_hours ?? 0;

  return (
    <CardStrong className="animate-rise p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Live Operations Snapshot</h2>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-emerald-800">real-time</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Open Reports</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{openReports}</p>
          <p className="mt-1 text-xs text-slate-500">Across active zones</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Avg Resolution</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{avgHours.toFixed(1)}h</p>
          <p className="mt-1 text-xs text-slate-500">Trend from verified workflows</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Segregation Quality Trend</p>
          <div className="mt-3 flex h-28 items-end gap-1 rounded-xl border border-emerald-100 bg-gradient-to-b from-emerald-50 to-white p-3">
            {[28, 38, 44, 42, 53, 56, 49, 62, 67, 64, 72, 74, 70, 81].map((h, idx) => (
              <div key={idx} className="flex-1 rounded-t-sm bg-gradient-to-t from-emerald-400 to-emerald-600/80" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>
    </CardStrong>
  );
}
