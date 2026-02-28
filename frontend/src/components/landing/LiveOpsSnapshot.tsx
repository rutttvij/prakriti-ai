import { motion } from "framer-motion";

import type { PublicStats } from "../../lib/types";
import { CardStrong } from "../ui/Card";

function formatValue(v: number) {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${Math.round(v / 1000)}K`;
  return `${Math.round(v)}`;
}

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.45 }}
      className="text-3xl font-bold text-slate-900"
    >
      {formatValue(value)}
      {suffix}
    </motion.span>
  );
}

export function LiveOpsSnapshot({
  stats,
  focus,
}: {
  stats: PublicStats;
  focus: string;
}) {
  return (
    <CardStrong className="relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Live Operations Snapshot</h2>
        <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-emerald-800">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600" />
          realtime
        </div>
      </div>

      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Focus: {focus}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Open Reports</p>
          <div className="mt-2"><AnimatedNumber value={stats.open_reports} /></div>
          <p className="mt-1 text-xs text-slate-500">Across active zones</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Avg Resolution</p>
          <div className="mt-2"><AnimatedNumber value={stats.avg_resolution_time_hours} suffix="h" /></div>
          <p className="mt-1 text-xs text-slate-500">Verification-adjusted SLA</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Segregation Quality Trend</p>
          <div className="mt-3 flex h-28 items-end gap-1 rounded-xl border border-emerald-100 bg-gradient-to-b from-emerald-50 to-white p-3">
            {[30, 44, 48, 50, 55, 52, 60, 68, 64, 72, 75, 70, 78, 82].map((h, idx) => (
              <motion.div
                key={idx}
                initial={{ height: 8, opacity: 0 }}
                whileInView={{ height: `${h}%`, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.03 }}
                className="flex-1 rounded-t-sm bg-gradient-to-t from-emerald-400 to-emerald-600/80"
              />
            ))}
          </div>
        </div>
      </div>
    </CardStrong>
  );
}
