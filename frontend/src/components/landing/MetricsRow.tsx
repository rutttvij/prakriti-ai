import { motion } from "framer-motion";

import type { PublicStats } from "../../lib/types";

function card(value: string, label: string) {
  return { value, label };
}

export function MetricsRow({ stats, labels }: { stats: PublicStats; labels?: string[] }) {
  const defaultLabels = ["Resolved Incidents", "CO2e Avoided", "Verified Actions", "PCC Issued"];
  const useLabels = labels && labels.length >= 4 ? labels : defaultLabels;

  const items = [
    card(`${Math.round(stats.total_waste_logs / 1000)}K+`, useLabels[0]),
    card(`${stats.total_carbon_saved.toLocaleString()} kg`, useLabels[1]),
    card(`${stats.total_verified_actions.toLocaleString()}`, useLabels[2]),
    card(`${Math.round(stats.total_pcc_issued).toLocaleString()}`, useLabels[3]),
  ];

  return (
    <div className="grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((m) => (
        <motion.div
          key={m.label}
          whileHover={{ y: -2 }}
          className="rounded-2xl border border-white/45 bg-white/75 p-3 shadow-[0_10px_24px_rgba(6,22,30,0.18)]"
        >
          <p className="text-xl font-bold text-slate-900">{m.value}</p>
          <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-600">{m.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
