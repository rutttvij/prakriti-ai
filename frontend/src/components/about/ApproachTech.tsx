import { motion } from "framer-motion";

import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { approach } from "../../lib/aboutCopy";
import { fadeLift } from "../../lib/motion";

export function ApproachTech() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-12">
      <motion.div {...fadeLift} className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="surface-card-strong p-6 sm:p-8">
          <Badge>Approach / Technology</Badge>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">{approach.heading}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">{approach.body}</p>
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-slate-900">Core platform capabilities</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {approach.stack.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      </motion.div>
    </section>
  );
}
