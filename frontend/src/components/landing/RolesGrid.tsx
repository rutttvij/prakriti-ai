import { motion } from "framer-motion";

const roles = [
  {
    name: "Citizen",
    value: "Faster complaint resolution",
    text: "Photo-first reporting with visibility into status, accountability, and neighborhood impact.",
  },
  {
    name: "Workforce",
    value: "Field clarity at scale",
    text: "Operational dashboards for assignment, pickup progression, and proof-backed closure.",
  },
  {
    name: "Bulk Generators",
    value: "Compliance + carbon returns",
    text: "Structured segregation logs, pickup workflows, and verification-led credit accrual.",
  },
  {
    name: "Admin",
    value: "Decision-grade analytics",
    text: "Real-time progress views across wards with carbon, quality, and SLA intelligence.",
  },
];

export function RolesGrid() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16">
      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((role) => (
          <motion.article
            key={role.name}
            whileHover={{ y: -4 }}
            className="surface-card group p-6 transition"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700">{role.name}</p>
            <h3 className="mt-2 text-2xl font-bold text-slate-900">{role.value}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{role.text}</p>
            <a href="#final-cta" className="mt-4 inline-block text-sm font-semibold text-emerald-700 opacity-80 group-hover:opacity-100">Learn more →</a>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
