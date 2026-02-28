import { Link } from "react-router-dom";
import CtaStrip from "../components/CtaStrip";

const METRICS = [
  { label: "Resolved Incidents", value: "52K+" },
  { label: "CO2e Avoided", value: "1,240t" },
  { label: "Active City Users", value: "210K+" },
  { label: "PCC Transactions", value: "4.8M" },
];

const WORKFLOW = [
  {
    title: "Capture",
    text: "Residents and bulk entities log waste with location, photos, and weight. AI enriches metadata instantly.",
  },
  {
    title: "Coordinate",
    text: "Workers receive contextual tasks and route priorities. Supervisors track SLAs and bottlenecks live.",
  },
  {
    title: "Verify",
    text: "On-ground verification confirms weight and quality. Only verified actions earn rewards and carbon credits.",
  },
  {
    title: "Reward",
    text: "Tokenized climate value flows into transparent wallets, creating trust across citizens, campuses, and city teams.",
  },
];

const ROLES = [
  {
    name: "Citizen",
    value: "Faster complaint resolution",
    text: "Photo-first reporting with visibility into status, accountability and neighborhood impact.",
  },
  {
    name: "Waste Workforce",
    value: "Field clarity at scale",
    text: "Operational dashboards for assignment, pickup progression, and proof-backed closure.",
  },
  {
    name: "Bulk Generators",
    value: "Compliance + carbon returns",
    text: "Structured segregation logs, pickup workflows, and verification-led credit accrual.",
  },
  {
    name: "City Admin",
    value: "Decision-grade analytics",
    text: "Real-time progress views across wards with carbon, quality, and SLA intelligence.",
  },
];

export const LandingPage: React.FC = () => {
  return (
    <main className="relative overflow-hidden pt-6">
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-20 pt-14 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="animate-rise">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            City Intelligence Platform
          </p>
          <h1 className="text-4xl font-extrabold leading-[0.98] text-slate-950 sm:text-5xl lg:text-6xl">
            Waste Ops
            <br />
            <span className="text-slate-700">That Cities Trust.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
            Prakriti.AI unifies reporting, operations, verification and carbon incentives into one precision workflow built for modern municipalities and institutions.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="btn-primary px-7 py-3">Launch Your Account</Link>
            <Link to="/contact" className="btn-secondary px-7 py-3">Book City Demo</Link>
          </div>

          <div className="mt-8 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
            {METRICS.map((m) => (
              <div key={m.label} className="rounded-2xl border border-slate-200/90 bg-white/80 p-3 backdrop-blur-xl">
                <p className="text-xl font-bold text-slate-900">{m.value}</p>
                <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">{m.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card-strong animate-rise p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Live Operations Snapshot</h2>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-emerald-800">Real-time</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Open Reports</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">128</p>
              <p className="mt-1 text-xs text-slate-500">Across 14 wards</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Avg Resolution</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">5.7h</p>
              <p className="mt-1 text-xs text-slate-500">Down 18% this month</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Segregation Quality Trend</p>
              <div className="mt-3 flex h-28 items-end gap-1 rounded-xl border border-emerald-100 bg-gradient-to-b from-emerald-50 to-white p-3">
                {[28, 38, 44, 42, 53, 56, 49, 62, 67, 64, 72, 74, 70, 81].map((h, idx) => (
                  <div key={idx} className="flex-1 rounded-t-sm bg-gradient-to-t from-emerald-400 to-emerald-600/80" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="surface-card-strong p-6 sm:p-8">
          <h2 className="section-heading">How the Platform Executes Daily</h2>
          <p className="subtle-copy mt-2 max-w-2xl">A deterministic workflow from intake to reward, designed to eliminate operational blind spots.</p>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {WORKFLOW.map((step, idx) => (
              <div key={step.title} className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700">Step {idx + 1}</p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((role) => (
            <div key={role.name} className="surface-card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700">{role.name}</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900">{role.value}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{role.text}</p>
            </div>
          ))}
        </div>
      </section>

      <CtaStrip />
    </main>
  );
};
