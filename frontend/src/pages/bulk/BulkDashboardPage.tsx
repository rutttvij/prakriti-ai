import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";

type BulkSummary = {
  total_waste_logs: number;
  total_logged_weight_kg: number;
  verified_weight_kg: number;
  wallet_balance_pcc: number;
  pickup_completed: number;
  pickup_total: number;
  segregation_score: number;
  carbon_saved_total: number;
  recent_badges: string[];
};

export default function BulkDashboardPage() {
  const [summary, setSummary] = useState<BulkSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get("/bulk/dashboard/summary");
        if (!active) return;
        setSummary(res.data?.data?.summary ?? null);
      } catch (err: any) {
        if (!active) return;
        setError(err?.response?.data?.detail || err?.response?.data?.message || "Failed to load bulk dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-white/20 bg-slate-950/26 p-5 shadow-[0_24px_50px_rgba(5,22,27,0.38)] backdrop-blur-xl">
        <h1 className="text-4xl font-semibold !text-[#dffaf0]" style={{ color: "#dffaf0" }}>Bulk Dashboard</h1>
        <p className="mt-1 text-sm text-emerald-100">Operations overview for waste logs, pickups, verification and rewards.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/bulk/log-waste" className="btn-secondary px-4 py-2 text-sm">Log Waste</Link>
          <Link to="/bulk/pickup-requests" className="btn-secondary px-4 py-2 text-sm">Create Pickup Request</Link>
          <Link to="/bulk/training" className="btn-secondary px-4 py-2 text-sm">Go to Training</Link>
          <Link to="/bulk/impact-insights" className="btn-secondary px-4 py-2 text-sm">View Insights</Link>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="surface-card p-4">
          <p className="text-sm text-slate-500">Total Waste Logs</p>
          <p className="mt-1 text-4xl font-bold text-slate-900">{loading ? "--" : summary?.total_waste_logs ?? 0}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-sm text-slate-500">Total Logged Weight</p>
          <p className="mt-1 text-4xl font-bold text-slate-900">{loading ? "--" : `${(summary?.total_logged_weight_kg ?? 0).toFixed(2)} kg`}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-sm text-slate-500">Verified Weight</p>
          <p className="mt-1 text-4xl font-bold text-slate-900">{loading ? "--" : `${(summary?.verified_weight_kg ?? 0).toFixed(2)} kg`}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-sm text-slate-500">Wallet / PCC Balance</p>
          <p className="mt-1 text-4xl font-bold text-slate-900">{loading ? "--" : (summary?.wallet_balance_pcc ?? 0).toFixed(2)}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface-card p-5">
          <h2 className="text-2xl font-bold text-slate-900">Pickup Requests</h2>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{loading ? "--" : `${summary?.pickup_completed ?? 0} / ${summary?.pickup_total ?? 0}`}</p>
          <p className="text-sm text-slate-600">Completed out of total requests.</p>
        </div>

        <div className="surface-card p-5">
          <h2 className="text-2xl font-bold text-slate-900">Segregation Score</h2>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{loading ? "--" : `${(summary?.segregation_score ?? 0).toFixed(2)}%`}</p>
          <p className="text-sm text-slate-600">Based on verified logs.</p>
        </div>

        <div className="surface-card p-5">
          <h2 className="text-2xl font-bold text-slate-900">Carbon Saved</h2>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{loading ? "--" : `${(summary?.carbon_saved_total ?? 0).toFixed(2)} kg CO2e`}</p>
          <p className="text-sm text-slate-600">Cumulative climate impact.</p>
        </div>
      </div>

      <div className="surface-card-strong p-5">
        <h3 className="text-lg font-bold text-slate-900">Recent Badges</h3>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Loading badges...</p>
        ) : (summary?.recent_badges?.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No badges earned yet.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {summary?.recent_badges.map((badge, idx) => (
              <span key={`${badge}-${idx}`} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                {badge.replaceAll("_", " ")}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
