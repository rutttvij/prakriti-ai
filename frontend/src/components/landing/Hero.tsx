import { motion } from "framer-motion";

import type { OrgTypeCopy, PublicStats } from "../../lib/types";
import { fadeLift, staggerParent, childLift } from "../../lib/motion";
import { RolePills, type RoleKey } from "./RolePills";
import { LiveOpsSnapshot } from "./LiveOpsSnapshot";
import { MetricsRow } from "./MetricsRow";

export function Hero({
  role,
  onRoleChange,
  rolesConfig,
  roleCopy,
  stats,
  trendValues,
  onRequestDemo,
  onSeeWorkflow,
}: {
  role: RoleKey;
  onRoleChange: (value: RoleKey) => void;
  rolesConfig: OrgTypeCopy;
  roleCopy: { headline: string; subheadline: string; bullets?: string[]; snapshot_focus?: string; metric_labels?: string[] };
  stats: PublicStats;
  trendValues?: number[];
  onRequestDemo: () => void;
  onSeeWorkflow: () => void;
}) {
  return (
    <section className="relative min-h-[70vh] overflow-hidden px-4 pb-8 pt-12 lg:min-h-[74vh]">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-emerald-400/25 blur-[110px]" />
        <div className="absolute right-8 top-24 h-80 w-80 rounded-full bg-cyan-300/20 blur-[120px]" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div {...staggerParent} className="space-y-6">
          <motion.p {...childLift} className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/95">
            CITY INTELLIGENCE PLATFORM
          </motion.p>

          <motion.h1 {...childLift} className="max-w-xl text-5xl font-extrabold leading-[0.95] text-white sm:text-6xl">
            {roleCopy.headline}
          </motion.h1>

          <motion.p {...childLift} className="max-w-xl text-base leading-relaxed text-[#dffaf0] sm:text-lg">
            {roleCopy.subheadline}
          </motion.p>

          <motion.div {...childLift}>
            <RolePills selected={role} onChange={onRoleChange} config={rolesConfig} />
          </motion.div>

          <motion.ul {...childLift} className="space-y-2 text-sm font-medium text-emerald-100/95">
            {(roleCopy.bullets || ["Pilot-ready in weeks", "Verified audit trail", "No credit card"]).map((b) => (
              <li key={b} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                {b}
              </li>
            ))}
          </motion.ul>

          <motion.div {...childLift} className="flex flex-wrap gap-3">
            <button onClick={onRequestDemo} className="btn-primary px-7 py-3">Request Demo</button>
            <button onClick={onSeeWorkflow} className="btn-secondary px-7 py-3">See Live Workflow</button>
          </motion.div>

          <motion.div {...childLift}>
            <MetricsRow stats={stats} labels={roleCopy.metric_labels} />
          </motion.div>
        </motion.div>

        <motion.div {...fadeLift}>
          <LiveOpsSnapshot
            stats={stats}
            focus={roleCopy.snapshot_focus || "SLA and verification confidence"}
            trendValues={trendValues}
          />
        </motion.div>
      </div>
    </section>
  );
}
