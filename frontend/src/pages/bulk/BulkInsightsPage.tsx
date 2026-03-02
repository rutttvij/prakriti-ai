import { useEffect, useState } from "react";
import api from "../../lib/api";

type InsightsSummary = {
  carbon_saved_total: number;
  pcc_earned_total: number;
  current_streak_days: number;
  quality_30d: number;
  earned_badges: Array<
    | string
    | {
        code: string;
        name: string;
        description?: string | null;
        category: string;
        awarded_at?: string;
        metadata?: Record<string, unknown>;
      }
  >;
  badge_tiers?: Array<{
    tier_key: string;
    unlocked_count: number;
    total_count: number;
  }>;
};

function normalizeBadges(raw: InsightsSummary["earned_badges"] | undefined) {
  return (raw ?? []).map((item) => {
    if (typeof item === "string") {
      return {
        code: item.toLowerCase(),
        name: item.replaceAll("_", " "),
        description: null,
        category: "LEGACY",
        awarded_at: "",
      };
    }
    return {
      code: item.code,
      name: item.name || item.code.replaceAll("_", " "),
      description: item.description ?? null,
      category: item.category,
      awarded_at: item.awarded_at ?? "",
    };
  });
}

export default function BulkInsightsPage() {
  const [summary, setSummary] = useState<InsightsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const badges = normalizeBadges(summary?.earned_badges);

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
        <h2 className="text-xl font-bold text-slate-900">Badge Tiers</h2>
        {(summary?.badge_tiers?.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No tier progress available yet.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {summary?.badge_tiers?.map((tier) => (
              <div key={tier.tier_key} className="rounded-2xl border border-slate-200 bg-white/85 p-4">
                <p className="text-sm font-semibold text-slate-900">{tier.tier_key.replaceAll("_", " ")}</p>
                <p className="mt-2 text-2xl font-bold text-emerald-700">
                  {tier.unlocked_count} / {tier.total_count}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="surface-card-strong p-5">
        <h2 className="text-xl font-bold text-slate-900">Earned Badges</h2>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Loading badge timeline...</p>
        ) : badges.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No badges earned yet.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {badges.map((badge) => (
              <div key={`${badge.code}-${badge.awarded_at || ""}`} className="rounded-2xl border border-slate-200 bg-white/85 p-4">
                <p className="text-sm font-semibold text-slate-900">{badge.name}</p>
                <p className="mt-1 text-xs text-slate-500">{badge.description || "Milestone unlocked via verified bulk operations."}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{badge.category.replaceAll("_", " ")}</p>
                {badge.awarded_at ? <p className="mt-1 text-xs text-slate-500">Unlocked: {new Date(badge.awarded_at).toLocaleString()}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
