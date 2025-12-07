import { useAuth } from "../../contexts/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-emerald-800">
            Welcome back, {user?.full_name || user?.email}
          </h1>
          <p className="text-sm text-slate-500">
            Your personal view of training, segregation, reports, and carbon
            impact.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-emerald-700">
            Training &amp; Badges
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Complete mandatory green training and earn recognition.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-emerald-700">
            Daily Segregation
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Track segregation quality and support cleaner wards.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-emerald-700">
            Carbon &amp; PCC Credits
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Each correct action translates to CO₂ savings and PCC tokens.
          </p>
        </div>
      </div>
    </div>
  );
}
