import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const steps = [
  {
    title: "Capture",
    body: "Residents and bulk entities log waste with location, photos, and weight. AI enriches metadata instantly.",
    panelTitle: "Intake panel",
  },
  {
    title: "Coordinate",
    body: "Workers receive contextual tasks and route priorities. Supervisors track SLAs and bottlenecks live.",
    panelTitle: "Dispatch board",
  },
  {
    title: "Verify",
    body: "On-ground verification confirms weight and quality. Only verified actions earn rewards and credits.",
    panelTitle: "Evidence validation",
  },
  {
    title: "Reward",
    body: "Tokenized climate value flows into transparent wallets, creating trust across stakeholders.",
    panelTitle: "PCC ledger",
  },
];

export function HowItWorksStepper() {
  const [index, setIndex] = useState(0);
  const stepRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (!visible.length) return;

        const idx = Number((visible[0].target as HTMLElement).dataset.stepIndex);
        if (!Number.isNaN(idx)) setIndex(idx);
      },
      {
        threshold: [0.4, 0.55, 0.7],
        rootMargin: "-20% 0px -20% 0px",
      }
    );

    stepRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-4 pb-16">
      <div className="surface-card-strong grid gap-6 p-6 lg:grid-cols-[0.85fr_1.15fr] lg:p-8">
        <div>
          <h2 className="section-heading">How the platform executes daily</h2>
          <p className="subtle-copy mt-2">Scroll through the core loop from capture to reward.</p>

          <div className="mt-6 space-y-3">
            {steps.map((step, i) => (
              <div
                key={step.title}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                data-step-index={i}
                className={`rounded-2xl border p-4 transition ${
                  i === index
                    ? "border-emerald-300 bg-white/90 shadow-md"
                    : "border-slate-200/70 bg-white/60"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Step {i + 1}</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">{step.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{step.body}</p>
              </div>
            ))}
          </div>
        </div>

        <motion.div className="rounded-3xl border border-white/45 bg-gradient-to-br from-slate-900/90 to-emerald-900/80 p-5 text-emerald-50 shadow-[0_20px_40px_rgba(5,20,26,0.35)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">{steps[index].panelTitle}</p>
          <h3 className="mt-2 text-2xl font-bold">{steps[index].title}</h3>
          <p className="mt-2 text-sm text-emerald-100/85">{steps[index].body}</p>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-16 rounded-xl border border-emerald-200/30 bg-emerald-50/10" />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
