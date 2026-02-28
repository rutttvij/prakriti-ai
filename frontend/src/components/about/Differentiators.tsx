import { motion } from "framer-motion";

import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { differentiators } from "../../lib/aboutCopy";
import { fadeLift } from "../../lib/motion";

export function Differentiators() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-12">
      <motion.div {...fadeLift} className="surface-card-strong p-6 sm:p-8">
        <Badge>What Makes Us Different</Badge>
        <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">Designed for measurable trust, not just reporting.</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {differentiators.map((item) => (
            <Card key={item.title} className="p-5">
              <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.text}</p>
            </Card>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
