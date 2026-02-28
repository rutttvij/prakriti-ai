import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

import { Button } from "../ui/Button";
import { CardStrong } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { childLift, fadeLift, staggerParent } from "../../lib/motion";
import { aboutHero } from "../../lib/aboutCopy";
import type { PublicStats } from "../../lib/types";

type Props = {
  stats: PublicStats;
  onRequestDemo: () => void;
  onViewImpact: () => void;
};

function useCount(target: number, duration = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const safeTarget = Number.isFinite(target) ? target : 0;
    const start = performance.now();
    let raf = 0;

    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      setValue(Math.round(safeTarget * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

export function AboutHero({ stats, onRequestDemo, onViewImpact }: Props) {
  const users = useCount(stats.total_users);
  const verified = useCount(stats.total_verified_actions);
  const carbon = useCount(Math.round(stats.total_carbon_saved));
  const pcc = useCount(Math.round(stats.total_pcc_issued));

  const statCards = useMemo(
    () => [
      { label: "Active Users", value: `${users.toLocaleString()}+` },
      { label: "Verified Actions", value: verified.toLocaleString() },
      { label: "Carbon Saved", value: `${carbon.toLocaleString()} kgCO2e` },
      { label: "PCC Issued", value: pcc.toLocaleString() },
    ],
    [users, verified, carbon, pcc]
  );

  return (
    <section className="relative px-4 pb-10 pt-12">
      <div className="pointer-events-none absolute left-0 top-20 h-72 w-72 rounded-full bg-emerald-300/20 blur-[110px]" />
      <div className="pointer-events-none absolute right-0 top-10 h-80 w-80 rounded-full bg-cyan-300/18 blur-[120px]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-9 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div {...staggerParent} className="space-y-6">
          <motion.p {...childLift} className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/95">
            About Prakriti.AI
          </motion.p>

          <motion.h1 {...childLift} className="max-w-2xl text-5xl font-extrabold leading-[0.95] text-white sm:text-6xl">
            {aboutHero.title}
          </motion.h1>

          <motion.p {...childLift} className="max-w-xl text-base leading-relaxed text-emerald-50/92 sm:text-lg">
            {aboutHero.subheadline}
          </motion.p>

          <motion.div {...childLift} className="flex flex-wrap gap-3">
            <Button onClick={onRequestDemo} className="px-7 py-3">
              Request Demo
            </Button>
            <Button variant="secondary" onClick={onViewImpact} className="px-7 py-3">
              View Impact
            </Button>
          </motion.div>

          <motion.p {...childLift} className="text-sm font-medium text-emerald-100/90">
            {aboutHero.microcopy}
          </motion.p>
        </motion.div>

        <motion.div {...fadeLift}>
          <CardStrong className="p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Institution Readiness Snapshot</h2>
              <Badge className="bg-emerald-50/90">LIVE STATS</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {statCards.map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </CardStrong>
        </motion.div>
      </div>
    </section>
  );
}
