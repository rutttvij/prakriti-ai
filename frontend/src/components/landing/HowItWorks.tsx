import { defaultWorkflow } from "../../lib/copy";
import { CardStrong } from "../ui/Card";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-4 pb-16">
      <CardStrong className="p-6 sm:p-8">
        <h2 className="section-heading">How the Platform Executes Daily</h2>
        <p className="subtle-copy mt-2 max-w-2xl">A deterministic workflow from intake to reward, designed to eliminate operational blind spots.</p>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {defaultWorkflow.map((step, idx) => (
            <div key={step.title} className="rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700">Step {idx + 1}</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.text}</p>
            </div>
          ))}
        </div>
      </CardStrong>
    </section>
  );
}
