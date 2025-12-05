import { Link } from "react-router-dom";

export const LandingPage: React.FC = () => {
  const stats = [
    { label: "Kg Waste Segregated", value: "12,450" },
    { label: "Reports Resolved", value: "839" },
    { label: "Carbon Saved (kg CO₂e)", value: "3,210" },
    { label: "PCC Tokens Issued", value: "9,540" },
  ];

  return (
    <main className="bg-gradient-to-b from-emerald-50/60 to-white min-h-screen">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-16">
        <div className="grid gap-10 md:grid-cols-2 items-center">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-800 mb-4">
              Clean City.{" "}
              <span className="text-emerald-600">Smart Waste.</span>
            </h1>
            <p className="text-slate-600 mb-6 max-w-xl">
              Prakriti.AI tracks waste reports, segregation, and carbon impact
              across your city — rewarding citizens, waste workers, and bulk
              generators for real climate action.
            </p>
            <div className="flex flex-wrap gap-3 mb-4">
              <Link
                to="/register"
                className="rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition"
              >
                Get Started – Register
              </Link>
              <Link
                to="/login"
                className="rounded-full border border-emerald-500 px-6 py-2.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 transition"
              >
                Already registered? Login
              </Link>
            </div>
            <p className="text-xs text-slate-500">
              Register as a Citizen, Waste Worker, or Bulk Generator. Your
              account will be activated after verification by the city admin.
            </p>
          </div>

          {/* Dashboard preview */}
          <div className="bg-white rounded-2xl shadow-md border border-emerald-100 p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">
              City Impact Snapshot (Demo)
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-emerald-50 bg-emerald-50/60 px-3 py-2.5"
                >
                  <div className="text-[0.7rem] uppercase tracking-wide text-emerald-600">
                    {s.label}
                  </div>
                  <div className="text-lg font-semibold text-slate-800">
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-100 p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-slate-600">
                  14-day Waste Segregation Trend
                </span>
                <span className="text-[0.65rem] text-slate-400">
                  Demo preview
                </span>
              </div>
              <div className="h-28 w-full rounded-lg bg-gradient-to-r from-emerald-100 via-emerald-50 to-emerald-100 flex items-end gap-1 overflow-hidden">
                {[40, 60, 55, 70, 65, 80, 75, 90, 85, 70, 60, 65, 72, 88].map(
                  (h, idx) => (
                    <div
                      key={idx}
                      className="flex-1 rounded-t-full bg-emerald-400/80"
                      style={{ height: `${h}%` }}
                    />
                  )
                )}
              </div>
              <div className="mt-2 flex justify-between text-[0.65rem] text-slate-400">
                <span>Dry</span>
                <span>Wet</span>
                <span>Reject</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">
          One platform. Different roles. Shared impact.
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-white border border-emerald-100 p-4">
            <h3 className="text-sm font-semibold text-emerald-600 mb-2">
              Citizens
            </h3>
            <ul className="text-xs text-slate-600 space-y-1.5">
              <li>• Report uncollected garbage with photos.</li>
              <li>• Track resolution status for your area.</li>
              <li>• Earn PCC tokens for consistent segregation.</li>
            </ul>
          </div>

          <div className="rounded-2xl bg-white border border-emerald-100 p-4">
            <h3 className="text-sm font-semibold text-emerald-600 mb-2">
              Waste Workers
            </h3>
            <ul className="text-xs text-slate-600 space-y-1.5">
              <li>• Log household-wise dry, wet, reject in kg.</li>
              <li>• See your 14-day segregation performance.</li>
              <li>• Unlock badges for clean collection routes.</li>
            </ul>
          </div>

          <div className="rounded-2xl bg-white border border-emerald-100 p-4">
            <h3 className="text-sm font-semibold text-emerald-600 mb-2">
              Bulk Generators
            </h3>
            <ul className="text-xs text-slate-600 space-y-1.5">
              <li>• Log building-level segregation and pickups.</li>
              <li>• View monthly compliance reports.</li>
              <li>• Demonstrate climate action to residents.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Strip */}
      <section className="bg-emerald-600">
        <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-emerald-50">
            Ready to turn waste data into climate action? Register today and
            start building a cleaner city.
          </p>
          <Link
            to="/register"
            className="rounded-full bg-white px-5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition"
          >
            Register Now
          </Link>
        </div>
      </section>
    </main>
  );
};
