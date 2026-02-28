import type { CaseStudy } from "../../lib/types";
import { CardStrong } from "../ui/Card";

export function CaseStudies({ studies }: { studies: CaseStudy[] }) {
  if (!studies.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-14">
      <CardStrong className="p-6">
        <h2 className="section-heading">Case Study</h2>
        {studies.slice(0, 2).map((s) => (
          <div key={s.id} className="mt-4 rounded-2xl border border-slate-200 bg-white/85 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-emerald-700">{s.org}</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">{s.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{s.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-emerald-800">
              {s.metric_1 ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1">{s.metric_1}</span> : null}
              {s.metric_2 ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1">{s.metric_2}</span> : null}
            </div>
          </div>
        ))}
      </CardStrong>
    </section>
  );
}
