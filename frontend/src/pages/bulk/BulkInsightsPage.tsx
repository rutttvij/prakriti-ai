import { useEffect, useState } from "react";
import api from "../../lib/api";

type InsightsSummary = {
  carbon_saved_total: number;
  pcc_earned_total: number;
  current_streak_days: number;
  quality_30d: number;
  earned_badges: string[];
};

export default function BulkInsightsPage() {
  const [summary, setSummary] = useState<InsightsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get("/bulk/insights/summary");
        if (!active) return;
        setSummary(res.data?.data?.summary ?? null);
      } catch (err: any) {
        if (!active) return;
        setError(err?.response?.data?.detail || "Unable to load insights right now.");
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
        <h1 className="text-4xl font-semibold !text-[#dffaf0]" style={{ color: "#dffaf0" }}>Bulk Impact Insights</h1>
        <p className="mt-1 text-sm text-emerald-100">Carbon outcomes, PCC progression, streak performance, and earned badges.</p>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Carbon Saved</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">{loading ? "--" : `${(summary?.carbon_saved_total ?? 0).toFixed(2)}`}</p>
          <p className="text-xs text-slate-500">kg CO2e</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">PCC Earned</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">{loading ? "--" : (summary?.pcc_earned_total ?? 0).toFixed(2)}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Current Streak</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">{loading ? "--" : `${summary?.current_streak_days ?? 0}d`}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">30D Quality</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">{loading ? "--" : `${(summary?.quality_30d ?? 0).toFixed(1)}%`}</p>
        </div>
      </div>

      <div className="surface-card-strong p-5">
        <h2 className="text-xl font-bold text-slate-900">Earned Badges</h2>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Loading badge timeline...</p>
        ) : (summary?.earned_badges?.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No badges earned yet.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {summary?.earned_badges.map((badge, idx) => (
              <div key={`${badge}-${idx}`} className="rounded-2xl border border-slate-200 bg-white/85 p-4">
                <p className="text-sm font-semibold text-slate-900">{badge.replaceAll("_", " ")}</p>
                <p className="mt-1 text-xs text-slate-500">Milestone unlocked via verified bulk operations.</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
