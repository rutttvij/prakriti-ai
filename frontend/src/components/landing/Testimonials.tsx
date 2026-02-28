import type { Testimonial } from "../../lib/types";
import { Card } from "../ui/Card";

export function Testimonials({ testimonials }: { testimonials: Testimonial[] }) {
  if (!testimonials.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-14">
      <h2 className="section-heading">Trusted by operations leaders</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {testimonials.slice(0, 3).map((t) => (
          <Card key={t.id} className="p-5">
            <p className="text-sm leading-relaxed text-slate-700">“{t.quote}”</p>
            <p className="mt-4 text-sm font-semibold text-slate-900">{t.name}</p>
            <p className="text-xs text-slate-600">{[t.title, t.org].filter(Boolean).join(" • ")}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
