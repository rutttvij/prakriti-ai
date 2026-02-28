import { motion } from "framer-motion";

import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { mission } from "../../lib/aboutCopy";
import { fadeLift } from "../../lib/motion";

export function Mission() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-12">
      <motion.div {...fadeLift} className="surface-card-strong p-6 sm:p-8">
        <Badge>{mission.heading}</Badge>
        <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">Built for trusted civic operations.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">{mission.statement}</p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {mission.principles.map((item) => (
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
