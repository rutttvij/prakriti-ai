import { motion } from "framer-motion";

import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { problems } from "../../lib/aboutCopy";
import { fadeLift } from "../../lib/motion";

export function ProblemCards() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-12">
      <motion.div {...fadeLift} className="space-y-5">
        <Badge>The Problem</Badge>
        <h2 className="text-3xl font-bold text-white sm:text-4xl">Waste systems lack dependable accountability loops.</h2>

        <div className="grid gap-4 md:grid-cols-3">
          {problems.map((item) => (
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
