import { motion } from "framer-motion";

import { aboutCta } from "../../lib/aboutCopy";
import { Button } from "../ui/Button";
import { fadeLift } from "../../lib/motion";

export function AboutCTA({ onRequestDemo }: { onRequestDemo: () => void }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16">
      <motion.div
        {...fadeLift}
        className="rounded-[2rem] border border-emerald-200/40 bg-gradient-to-r from-[#153935]/95 via-[#226358]/92 to-[#d9ece5] px-6 py-8 shadow-[0_26px_44px_rgba(5,24,20,0.36)] sm:px-8"
      >
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/90">Closing CTA</p>
            <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{aboutCta.heading}</h2>
            <p className="mt-2 max-w-2xl text-sm text-emerald-50/90">{aboutCta.text}</p>
          </div>

          <Button onClick={onRequestDemo} className="px-8 py-3">
            Request Demo
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
