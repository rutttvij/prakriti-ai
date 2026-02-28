import { motion } from "framer-motion";

import type { Partner } from "../../lib/types";

export function PartnersStrip({ partners }: { partners: Partner[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-12">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/85">Trusted by cities, campuses, societies, and enterprises</p>
      <div className="surface-card flex flex-wrap gap-3 p-4">
        {partners.map((p) => (
          <motion.a
            whileHover={{ y: -2 }}
            key={p.id}
            href={p.href || "#"}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-white/35 bg-white/75 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
          >
            {p.name}
          </motion.a>
        ))}
      </div>
    </section>
  );
}
