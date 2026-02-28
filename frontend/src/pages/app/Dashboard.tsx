import { Navbar } from "../../components/Navbar";

export default function AppDashboard() {
  return (
    <main className="public-shell landing-aurora">
      <Navbar />
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-8">
        <div className="surface-card-strong p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">App Dashboard</p>
          <h1 className="mt-2 text-4xl font-bold text-slate-900">Welcome to Prakriti.AI</h1>
          <p className="mt-3 text-slate-600">Your role-specific workspace is loading. Continue from the navigation panel.</p>
        </div>
      </section>
    </main>
  );
}
