import type { CaseStudy } from "../../lib/types";

export function CaseStudySection({ studies }: { studies: CaseStudy[] }) {
  if (!studies.length) return null;
  const s = studies[0];

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16">
      <article className="surface-card-strong p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Case Study</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">{s.title}</h2>
        <p className="mt-2 text-sm text-slate-600">{s.org}</p>
        <p className="mt-4 max-w-3xl text-base text-slate-700">{s.summary}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {s.metric_1 ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">{s.metric_1}</span> : null}
          {s.metric_2 ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">{s.metric_2}</span> : null}
        </div>
      </article>
    </section>
  );
}
