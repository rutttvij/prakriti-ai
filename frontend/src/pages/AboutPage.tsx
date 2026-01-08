// src/pages/AboutPage.tsx
export const AboutPage: React.FC = () => {
  return (
    <main className="relative">
      {/* Soft glow behind the card */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_#bbf7d0,_transparent_65%)] opacity-70" />

      <section className="relative mx-auto max-w-4xl px-4 pt-16 pb-20">
        <div
          className="
            rounded-3xl
            border border-emerald-100/80
            bg-white/80
            px-6 py-7 sm:px-8 sm:py-9
            shadow-lg shadow-emerald-100/70
            backdrop-blur-md
          "
        >
          <h1 className="mb-3 text-2xl font-bold text-slate-900">
            About Prakriti.AI
          </h1>
          <p className="mb-6 text-sm text-slate-700">
            Prakriti.AI is a clean-city intelligence platform that connects
            citizens, waste workers, bulk generators, and city administrators on
            a single dashboard.
          </p>

          <div className="grid gap-8 md:grid-cols-2">
            {/* What we solve */}
            <div>
              <h2 className="mb-2 text-sm font-semibold text-slate-900">
                What we solve
              </h2>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-700">
                <li>Scattered waste complaints with no feedback loop.</li>
                <li>
                  No visibility into segregation quality at household level.
                </li>
                <li>
                  Limited recognition for honest waste workers and compliant
                  societies.
                </li>
              </ul>
            </div>

            {/* How it works */}
            <div>
              <h2 className="mb-2 text-sm font-semibold text-slate-900">
                How it works
              </h2>
              <p className="mb-2 text-sm text-slate-700">
                Using simple mobile-friendly interfaces, Prakriti.AI converts
                daily waste operations into structured data. This data feeds a
                carbon engine and badge system, enabling cities to track climate
                impact and reward behaviour change.
              </p>
              <p className="text-[0.78rem] text-slate-500">
                The same platform powers citizen reporting, worker workflows and
                bulk generator analytics, so every action contributes to your
                city&apos;s climate story.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
