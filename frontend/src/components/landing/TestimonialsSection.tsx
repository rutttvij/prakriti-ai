import { motion } from "framer-motion";

import type { Testimonial } from "../../lib/types";

export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-6">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-[#0d1f2a]/80 via-[#123640]/70 to-[#1c4d46]/70" />
      <div className="pointer-events-none absolute right-10 top-0 h-80 w-80 rounded-full bg-emerald-400/20 blur-[120px]" />

      <div className="mx-auto max-w-7xl">
        <h2 className="text-4xl font-bold text-white">Voices from live deployments</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {testimonials.slice(0, 3).map((t) => (
            <motion.article key={t.id} whileHover={{ y: -3 }} className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-xl">
              <p className="text-sm leading-relaxed text-emerald-50/95">“{t.quote}”</p>
              <p className="mt-4 text-sm font-semibold text-white">{t.name}</p>
              <p className="text-xs text-emerald-100/80">{[t.title, t.org].filter(Boolean).join(" • ")}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
