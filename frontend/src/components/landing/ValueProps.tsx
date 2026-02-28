import { motion } from "framer-motion";

import { valueProps } from "../../lib/defaults";
import { childLift, staggerParent } from "../../lib/motion";

export function ValueProps() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16">
      <motion.div {...staggerParent} className="grid gap-4 md:grid-cols-3">
        {valueProps.map((item) => (
          <motion.div key={item.title} {...childLift} className="surface-card p-6">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-xl text-emerald-800">
              {item.icon}
            </div>
            <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
