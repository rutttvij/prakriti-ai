import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";

type BulkDashboard = {
  total_logs: number;
  total_logged_weight_kg: number;
  total_verified_weight_kg: number;
  total_pickup_requests: number;
  completed_pickups: number;
  segregation_score: number;
  total_carbon_saved_kg: number;
  wallet_balance_points: number;
};

type BadgeEntry = {
  badge: {
    code: string;
    name: string;
    category: string;
  };
  awarded_at: string;
};

type Impact = {
  total_carbon_saved_kgco2e: number;
  total_pcc_earned: number;
  current_streak_days: number;
  rolling_quality_30d: number;
};

export default function BulkDashboardPage() {
  const [dashboard, setDashboard] = useState<BulkDashboard | null>(null);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [badges, setBadges] = useState<BadgeEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [dashRes, impactRes, badgesRes] = await Promise.allSettled([
          api.get("/bulk/dashboard"),
          api.get("/impact/me"),
          api.get("/badges/me"),
        ]);

        if (!mounted) return;

        if (dashRes.status === "fulfilled") {
          setDashboard(dashRes.value.data?.data?.dashboard ?? null);
        } else {
          setError(
            dashRes.reason?.response?.data?.message ||
              dashRes.reason?.response?.data?.detail ||
              "Failed to load bulk dashboard.",
          );
        }

        if (impactRes.status === "fulfilled") {
          setImpact(impactRes.value.data?.data?.impact ?? null);
        } else {
          setImpact(null);
        }

        if (badgesRes.status === "fulfilled") {
          setBadges(badgesRes.value.data?.data?.earned_badges ?? []);
        } else {
          setBadges([]);
        }
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.response?.data?.message || err?.response?.data?.detail || "Failed to load bulk dashboard.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-white/20 bg-slate-950/26 p-5 shadow-[0_24px_50px_rgba(5,22,27,0.38)] backdrop-blur-xl">
        <h1 className="text-4xl font-semibold !text-[#dffaf0]" style={{ color: "#dffaf0" }}>Bulk Dashboard</h1>
        <p className="mt-1 text-sm text-emerald-100">Monitor waste logs, pickups, verification and earned credits.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/bulk/training" className="btn-secondary px-4 py-2 text-sm">
            Go to Training
          </Link>
          <Link to="/bulk/waste-log" className="btn-secondary px-4 py-2 text-sm">
            Log Waste
          </Link>
          <Link to="/bulk/insights" className="btn-secondary px-4 py-2 text-sm">
            View Insights
          </Link>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="surface-card p-4">
          <p className="text-sm text-slate-500">Waste Logs</p>
          <p className="mt-1 text-4xl font-bold text-slate-900">{loading ? "--" : dashboard?.total_logs ?? 0}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-sm text-slate-500">Logged Weight</p>
          <p className="mt-1 text-4xl font-bold text-slate-900">{loading ? "--" : `${(dashboard?.total_logged_weight_kg ?? 0).toFixed(2)} kg`}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-sm text-slate-500">Verified Weight</p>
          <p className="mt-1 text-4xl font-bold text-slate-900">{loading ? "--" : `${(dashboard?.total_verified_weight_kg ?? 0).toFixed(2)} kg`}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-sm text-slate-500">Wallet Balance</p>
          <p className="mt-1 text-4xl font-bold text-slate-900">{loading ? "--" : (dashboard?.wallet_balance_points ?? 0).toFixed(2)}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface-card p-5">
          <h2 className="text-2xl font-bold text-slate-900">Pickup Requests</h2>
          <p className="mt-2 text-3xl font-bold text-emerald-700">
            {loading ? "--" : `${dashboard?.completed_pickups ?? 0} / ${dashboard?.total_pickup_requests ?? 0}`}
          </p>
          <p className="text-sm text-slate-600">Completed out of total requests.</p>
        </div>

        <div className="surface-card p-5">
          <h2 className="text-2xl font-bold text-slate-900">Segregation Score</h2>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{loading ? "--" : `${(dashboard?.segregation_score ?? 0).toFixed(2)}%`}</p>
          <p className="text-sm text-slate-600">Quality based on verified logs.</p>
        </div>

        <div className="surface-card p-5">
          <h2 className="text-2xl font-bold text-slate-900">Carbon Saved</h2>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{loading ? "--" : `${(impact?.total_carbon_saved_kgco2e ?? dashboard?.total_carbon_saved_kg ?? 0).toFixed(2)} kg CO2e`}</p>
          <p className="text-sm text-slate-600">PCC earned: {(impact?.total_pcc_earned ?? 0).toFixed(2)}</p>
        </div>
      </div>

      <div className="surface-card-strong p-5">
        <h3 className="text-lg font-bold text-slate-900">Recent Badges</h3>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Loading badges...</p>
        ) : badges.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No badges earned yet. Verify more logs to unlock badges.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {badges.slice(0, 8).map((entry, idx) => (
              <span key={`${entry.badge.code}-${idx}`} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                {entry.badge.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
