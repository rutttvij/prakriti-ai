// src/pages/LandingPage.tsx
import { Link } from "react-router-dom";
import CtaStrip from "../components/CtaStrip";

const ImpactSnapshotCard: React.FC = () => {
  const stats = [
    { label: "Waste segregated (kg)", value: "12,450" },
    { label: "Reports resolved", value: "839" },
    { label: "PCC tokens issued", value: "9,540" },
  ];

  const chartHeights = [40, 60, 55, 70, 65, 80, 75, 90, 85, 70, 60, 65, 72, 88];

  return (
    <div
      className="
        relative rounded-[2rem]
        border border-emerald-100/80
        bg-white/80
        p-5 sm:p-6 lg:p-7
        shadow-xl shadow-emerald-200/70
        backdrop-blur-md
        transition-transform duration-200
        hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-300/70
      "
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            City Impact Snapshot
          </h2>
          <p className="text-xs text-slate-500">Demo view for Prakriti.AI</p>
        </div>
        <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2 py-1 text-[0.65rem] font-medium text-emerald-800">
          Demo data
        </span>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="
              rounded-2xl border border-emerald-100/80
              bg-emerald-50/70
              px-3 py-2.5
              backdrop-blur-sm
            "
          >
            <div className="text-[0.65rem] font-medium uppercase tracking-wide text-emerald-800">
              {s.label}
            </div>
            <div className="mt-0.5 text-lg font-semibold text-slate-900">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div
        className="
          rounded-2xl border border-emerald-50/80
          bg-gradient-to-b from-emerald-50/80 via-white/80 to-emerald-50/70
          p-3
          backdrop-blur-sm
        "
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-800">
            14-day segregation trend
          </span>
          <span className="text-[0.65rem] text-slate-400">
            Dry · Wet · Reject
          </span>
        </div>
        <div className="flex h-28 w-full items-end gap-1 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-200/80 via-emerald-100/80 to-emerald-200/80">
          {chartHeights.map((h, idx) => (
            <div
              key={idx}
              className="flex-1 rounded-t-full bg-gradient-to-t from-emerald-600/90 to-emerald-400/90"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[0.65rem] text-slate-400">
          <span>Higher bars = better segregation</span>
          <span>Demo preview</span>
        </div>
      </div>
    </div>
  );
};

export const LandingPage: React.FC = () => {
  const scrollToImpact = () => {
    const el = document.getElementById("impact-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToCitizenRole = () => {
    const el = document.getElementById("citizen-role");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <main
      className="
        relative overflow-hidden
        bg-gradient-to-b from-emerald-50 via-emerald-50 to-slate-50
      "
    >
      {/* Decorative background glows – softened to blend with navbar */}
      <div className="pointer-events-none absolute inset-x-0 -top-40 h-80 bg-[radial-gradient(circle_at_top,_#bbf7d0,_transparent_65%)] opacity-80" />
      <div className="pointer-events-none absolute -right-40 top-24 h-72 w-72 rounded-full bg-emerald-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -left-40 top-72 h-72 w-72 rounded-full bg-emerald-100/60 blur-3xl" />

      {/* 1️⃣ HERO */}
      <section className="relative mx-auto max-w-6xl px-4 pt-24 pb-20 lg:pt-28 lg:pb-24">
        <div className="grid items-center gap-10 md:grid-cols-3 lg:grid-cols-[1.1fr_minmax(0,1.3fr)_1fr]">
          {/* Left – headline + CTAs */}
          <div className="space-y-4 md:col-span-2 lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/80">
              AI-powered waste intelligence for cities
            </p>
            <h1 className="text-4xl font-extrabold leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
              CLEAN CITY.
              <br />
              <span className="text-emerald-800">SMART WASTE.</span>
            </h1>
            <p className="max-w-xl text-sm text-slate-700 sm:text-base">
              Prakriti.AI helps residents, waste workers and bulk generators
              report, resolve and reward every waste event in your city — while
              tracking real climate impact.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-400/50 hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-50"
              >
                Get started – Register
              </Link>
              <button
                type="button"
                onClick={scrollToImpact}
                className="inline-flex items-center justify-center rounded-full border border-emerald-500/70 bg-white/80 px-6 py-2.5 text-sm font-semibold text-emerald-800 shadow-sm shadow-emerald-100/60 hover:bg-emerald-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-50 backdrop-blur-sm"
              >
                View demo impact
              </button>
            </div>

            <p className="max-w-md text-[0.7rem] text-slate-600">
              Register as a Citizen, Waste Worker, or Bulk Generator. Your
              account is activated after verification by the city admin.
            </p>
          </div>

          {/* Center – impact snapshot card */}
          <div className="order-last mt-4 md:order-none md:col-span-3 md:mt-0 lg:col-span-1 lg:-mb-10 lg:translate-y-4">
            <ImpactSnapshotCard />
          </div>

          {/* Right – why + bullets */}
          <aside className="space-y-4 md:col-span-2 lg:col-span-1">
            <p className="text-sm text-slate-700">
              Built for Indian cities, Prakriti.AI connects citizens, waste
              workers and bulk generators on a single climate-action platform —
              from street-level photos to ward-level carbon reports.
            </p>
            <ul className="space-y-3 text-sm text-slate-800">
              <li className="flex gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs shadow-sm shadow-emerald-200/80">
                  📸
                </span>
                <div>
                  <p className="font-semibold text-slate-900">
                    Report waste with AI
                  </p>
                  <p className="text-xs text-slate-600">
                    Snap a photo, let Prakriti.AI classify the waste and capture
                    the location automatically.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs shadow-sm shadow-emerald-200/80">
                  🧹
                </span>
                <div>
                  <p className="font-semibold text-slate-900">
                    Assign & track in real time
                  </p>
                  <p className="text-xs text-slate-600">
                    Waste workers claim open reports, update status on the
                    field and close them when resolved.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs shadow-sm shadow-emerald-200/80">
                  ♻️
                </span>
                <div>
                  <p className="font-semibold text-slate-900">
                    Reward climate-positive behaviour
                  </p>
                  <p className="text-xs text-slate-600">
                    The PCC engine records carbon savings, issues tokens and
                    surfaces insights for admins.
                  </p>
                </div>
              </li>
            </ul>
          </aside>
        </div>
      </section>

      {/* 2️⃣ How Prakriti.AI works */}
      <section className="relative border-y border-emerald-100/70 bg-gradient-to-b from-emerald-50/90 via-emerald-100/80 to-emerald-50/90">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-14">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-950">
              How Prakriti.AI keeps your city clean
            </h2>
            <p className="mt-2 text-sm text-slate-700">
              Three simple loops that run every day in your city.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div
              className="
                rounded-2xl border border-emerald-100/80
                bg-white/80 p-5
                shadow-md shadow-emerald-100/70
                backdrop-blur-sm
              "
            >
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-lg shadow-sm shadow-emerald-200/80">
                📱
              </div>
              <h3 className="mb-1 text-sm font-semibold text-slate-900">
                Report
              </h3>
              <p className="text-xs text-slate-700">
                Citizens snap a photo, Prakriti.AI classifies the waste and
                captures the location automatically — no complex forms.
              </p>
            </div>

            <div
              className="
                rounded-2xl border border-emerald-100/80
                bg-white/80 p-5
                shadow-md shadow-emerald-100/70
                backdrop-blur-sm
              "
            >
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-lg shadow-sm shadow-emerald-200/80">
                ✅
              </div>
              <h3 className="mb-1 text-sm font-semibold text-slate-900">
                Assign &amp; Resolve
              </h3>
              <p className="text-xs text-slate-700">
                Waste workers see open reports in their zone, claim them,
                update status on the field and close them once resolved.
              </p>
            </div>

            <div
              className="
                rounded-2xl border border-emerald-100/80
                bg-white/80 p-5
                shadow-md shadow-emerald-100/70
                backdrop-blur-sm
              "
            >
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-lg shadow-sm shadow-emerald-200/80">
                🪙
              </div>
              <h3 className="mb-1 text-sm font-semibold text-slate-900">
                Reward &amp; Learn
              </h3>
              <p className="text-xs text-slate-700">
                The PCC engine records carbon savings, issues tokens and
                surfaces insights for ward officers, city admins and campuses.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3️⃣ Role sections */}
      <section className="relative mx-auto max-w-6xl space-y-12 px-4 py-14">
        {/* Citizens */}
        <div
          id="citizen-role"
          className="grid scroll-mt-24 items-center gap-8 md:grid-cols-2"
        >
          <div className="order-last md:order-none">
            <div className="relative rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-200 via-emerald-50 to-emerald-100 px-6 py-10 shadow-md shadow-emerald-100/80">
              <div className="absolute -top-3 -left-3 rounded-full bg-white px-4 py-1 text-[0.7rem] font-semibold text-emerald-900 shadow-md shadow-emerald-200/80">
                For Citizens
              </div>
              <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-white/80 text-center backdrop-blur-sm">
                <span className="mb-2 text-3xl">📸</span>
                <p className="text-xs font-medium text-slate-800">
                  Take a photo of a dump / overflowing bin
                </p>
                <p className="mt-1 text-[0.7rem] text-slate-500">
                  Prakriti.AI tags location and waste type automatically.
                </p>
              </div>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900">
              For Citizens
            </p>
            <h3 className="mb-3 text-xl font-bold text-slate-950 sm:text-2xl">
              Report waste in seconds, see what happens next.
            </h3>
            <p className="mb-4 text-sm text-slate-700">
              Skip long calls and WhatsApp groups. Use a simple, guided flow to
              report uncollected waste and follow it until it&apos;s picked up.
            </p>
            <ul className="mb-5 space-y-2 text-sm text-slate-800">
              <li>• Take a quick photo and share your location.</li>
              <li>• AI tells you if it&apos;s recyclable and how to dispose it.</li>
              <li>• Track status from &quot;Open&quot; to &quot;Resolved&quot;.</li>
            </ul>
            <button
              type="button"
              onClick={scrollToCitizenRole}
              className="text-xs font-semibold text-emerald-800 underline-offset-4 hover:underline hover:text-emerald-900"
            >
              See citizen features →
            </button>
          </div>
        </div>

        {/* Waste workers */}
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900">
              For Waste Workers
            </p>
            <h3 className="mb-3 text-xl font-bold text-slate-950 sm:text-2xl">
              Claim jobs, optimise your route, close reports faster.
            </h3>
            <p className="mb-4 text-sm text-slate-700">
              Turn scattered citizen complaints into a clean, prioritised queue
              of jobs that match your route and zone.
            </p>
            <ul className="space-y-2 text-sm text-slate-800">
              <li>• See all open reports in your assigned area.</li>
              <li>• Claim jobs, change status and upload proof photos.</li>
              <li>• Earn PCC credit for every resolved report.</li>
            </ul>
          </div>
          <div className="order-first md:order-none">
            <div className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-8 text-slate-50 shadow-md shadow-slate-900/60">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#4ade80,_transparent_55%)] opacity-30" />
              <div className="relative space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/70 px-3 py-1 text-[0.7rem]">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Live route · Ward 12
                </div>
                <div className="space-y-2 rounded-2xl border border-slate-700/80 bg-slate-900/70 p-3 text-[0.7rem]">
                  <div className="flex justify-between">
                    <span>Open reports</span>
                    <span className="font-semibold">7</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Resolved today</span>
                    <span className="font-semibold text-emerald-300">
                      12
                    </span>
                  </div>
                  <div className="mt-2 flex gap-1 text-[0.65rem]">
                    <span className="inline-flex flex-1 items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-500/20 px-2 py-1">
                      Claim nearest job
                    </span>
                    <span className="inline-flex flex-1 items-center justify-center rounded-full bg-slate-800 px-2 py-1">
                      View route
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk generators */}
        <div className="flex flex-col items-start gap-6 rounded-3xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 px-6 py-8 text-emerald-50 shadow-lg shadow-emerald-900/50 md:flex-row md:items-center md:px-8 md:py-9">
          <div className="flex-1">
            <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-emerald-200">
              For Bulk Generators
            </p>
            <h3 className="mb-3 text-xl font-bold sm:text-2xl">
              Turn building-level data into monthly climate reports.
            </h3>
            <p className="mb-4 max-w-xl text-sm text-emerald-100/90">
              Connect your society, campus or office park. Log segregation,
              pickups and dry / wet / reject performance — get ready-made
              reports for residents and regulators.
            </p>
          </div>
          <div className="grid min-w-[220px] grid-cols-3 gap-3 text-xs">
            <div className="rounded-2xl border border-emerald-500/50 bg-emerald-950/40 px-3 py-2.5">
              <div className="text-[0.65rem] text-emerald-200/90">
                Segregation score
              </div>
              <div className="mt-1 text-lg font-semibold">92%</div>
            </div>
            <div className="rounded-2xl border border-emerald-500/50 bg-emerald-950/40 px-3 py-2.5">
              <div className="text-[0.65rem] text-emerald-200/90">
                kg / flat / month
              </div>
              <div className="mt-1 text-lg font-semibold">3.4</div>
            </div>
            <div className="rounded-2xl border border-emerald-500/50 bg-emerald-950/40 px-3 py-2.5">
              <div className="text-[0.65rem] text-emerald-200/90">
                PCC earned
              </div>
              <div className="mt-1 text-lg font-semibold">1,280</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4️⃣ Dedicated Impact section */}
      <section
        id="impact-section"
        className="scroll-mt-24 border-t border-slate-100 bg-slate-50/90"
      >
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-950">
              City Impact Snapshot (Demo)
            </h2>
            <p className="mt-2 text-sm text-slate-700">
              See how segregation, reports and PCC tokens move together as your
              city starts using Prakriti.AI.
            </p>
          </div>

          <div className="mb-8">
            <ImpactSnapshotCard />
          </div>

          <div className="grid gap-5 text-xs text-slate-800 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm shadow-slate-100">
              <h3 className="mb-1 text-sm font-semibold text-slate-950">
                What counts as segregated waste?
              </h3>
              <p>
                When dry, wet and reject fractions are logged separately and
                exceed a minimum quality threshold at pickup. Mixed bags don&apos;t
                contribute to this metric.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm shadow-slate-100">
              <h3 className="mb-1 text-sm font-semibold text-slate-950">
                How PCC tokens are issued
              </h3>
              <p>
                Tokens are calculated based on verified kg of segregated waste,
                consistency over time and role (citizen, worker, facility).
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm shadow-slate-100">
              <h3 className="mb-1 text-sm font-semibold text-slate-950">
                How carbon savings are estimated
              </h3>
              <p>
                We apply emission factors to each waste stream, comparing
                segregated vs. mixed disposal paths — giving a transparent CO₂e
                estimate for your pilots.
              </p>
            </div>
          </div>

          <p className="mt-5 text-center text-[0.7rem] text-slate-500">
            Demo numbers are illustrative. Connect your ward, campus or society
            to see live data.
          </p>
        </div>
      </section>

      {/* 5️⃣ CTA strip only on landing page */}
      <CtaStrip />
    </main>
  );
};
