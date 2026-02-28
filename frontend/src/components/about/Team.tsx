import { motion } from "framer-motion";

import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { team } from "../../lib/aboutCopy";
import { fadeLift } from "../../lib/motion";

export function Team() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-12">
      <motion.div {...fadeLift} className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="surface-card-strong p-6 sm:p-8">
          <Badge>Team</Badge>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">{team.heading}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">{team.body}</p>
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-slate-900">How we operate</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {team.bullets.map((item) => (
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
