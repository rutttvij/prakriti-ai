import { motion } from "framer-motion";

import { Badge } from "../ui/Badge";
import { workflowSteps } from "../../lib/aboutCopy";
import { fadeLift } from "../../lib/motion";

export function MiniWorkflow() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-12">
      <motion.div {...fadeLift} className="surface-card p-6 sm:p-8">
        <Badge>How Prakriti.AI Works</Badge>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {workflowSteps.map((step, idx) => (
            <div key={step.title} className="rounded-2xl border border-white/50 bg-white/80 p-4">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-emerald-700">Step {idx + 1}</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.text}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
