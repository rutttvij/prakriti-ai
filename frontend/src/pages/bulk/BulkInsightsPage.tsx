import { useEffect, useState } from "react";
import api from "../../lib/api";

type Impact = {
  total_carbon_saved_kgco2e: number;
  total_pcc_earned: number;
  current_streak_days: number;
  rolling_quality_30d: number | null;
};

type BadgeEntry = {
  badge: {
    name: string;
    category: string;
  };
  awarded_at: string;
};

export default function BulkInsightsPage() {
  const [impact, setImpact] = useState<Impact | null>(null);
  const [badges, setBadges] = useState<BadgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [impactRes, badgesRes] = await Promise.allSettled([
          api.get("/impact/me"),
          api.get("/badges/me"),
        ]);

        if (!active) return;

        if (impactRes.status === "fulfilled") {
          setImpact(impactRes.value.data?.data?.impact ?? null);
        }
        if (badgesRes.status === "fulfilled") {
          setBadges(badgesRes.value.data?.data?.earned_badges ?? []);
        }
        if (impactRes.status === "rejected" && badgesRes.status === "rejected") {
          setError("Unable to load insights right now.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Bulk Impact Insights</h1>
        <p className="mt-1 text-sm text-slate-600">Carbon performance, PCC progression, and badge trajectory for your bulk operations.</p>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Carbon Saved</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">{loading ? "--" : `${(impact?.total_carbon_saved_kgco2e ?? 0).toFixed(2)}`}</p>
          <p className="text-xs text-slate-500">kg CO2e</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">PCC Earned</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">{loading ? "--" : (impact?.total_pcc_earned ?? 0).toFixed(2)}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Current Streak</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">{loading ? "--" : `${impact?.current_streak_days ?? 0}d`}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">30D Quality</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">{loading ? "--" : `${(((impact?.rolling_quality_30d ?? 0) as number) * 100).toFixed(1)}%`}</p>
        </div>
      </div>

      <div className="surface-card-strong p-5">
        <h2 className="text-xl font-bold text-slate-900">Earned Badges</h2>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Loading badge timeline...</p>
        ) : badges.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No badges earned yet. Verify more logs to unlock milestones.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {badges.map((entry, idx) => (
              <div key={`${entry.badge.name}-${idx}`} className="rounded-2xl border border-slate-200 bg-white/85 p-4">
                <p className="text-sm font-semibold text-slate-900">{entry.badge.name}</p>
                <p className="text-xs text-slate-500">Category: {entry.badge.category}</p>
                <p className="mt-1 text-xs text-slate-500">Awarded: {new Date(entry.awarded_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
