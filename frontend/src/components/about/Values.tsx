import { motion } from "framer-motion";

import { values } from "../../lib/aboutCopy";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { fadeLift } from "../../lib/motion";

export function Values() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-12">
      <motion.div {...fadeLift} className="surface-card p-6 sm:p-8">
        <Badge>Values</Badge>
        <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">Principles behind every product decision.</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {values.map((item) => (
            <Card key={item.title} className="p-4">
              <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.text}</p>
            </Card>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
