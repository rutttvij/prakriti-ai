// src/pages/admin/AdminDashboardPage.tsx
import { useEffect, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const getAuthToken = () => localStorage.getItem("access_token");

interface AdminSummary {
  total_users: number;
  total_citizens: number;
  total_waste_workers: number;
  total_bulk_generators: number;
  pending_approvals: number;
  total_waste_reports: number;
  open_waste_reports: number;
  resolved_waste_reports: number;
  total_segregation_logs: number;
  avg_segregation_score: number | null;
  total_carbon_kg: number;
  total_pcc_tokens: number;
}

interface CarbonDailyPoint {
  date: string; // ISO date
  carbon_kg: number;
  pcc_tokens: number;
}

interface CarbonSummary {
  total_carbon_kg: number;
  total_pcc_tokens: number;
  by_role: Record<string, { carbon_kg: number; pcc_tokens: number }>;
  by_activity_type: Record<string, { carbon_kg: number; pcc_tokens: number }>;
  daily: CarbonDailyPoint[];
}

export const AdminDashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [carbon, setCarbon] = useState<CarbonSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setError("Not authenticated.");
      setLoading(false);
      return;
    }

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    const fetchData = async () => {
      try {
        const [summaryRes, carbonRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/admin/summary`, { headers }),
          fetch(`${API_BASE_URL}/api/v1/admin/analytics/carbon`, { headers }),
        ]);

        if (!summaryRes.ok) {
          throw new Error("Failed to load admin summary");
        }
        if (!carbonRes.ok) {
          throw new Error("Failed to load carbon analytics");
        }

        const summaryData = (await summaryRes.json()) as AdminSummary;
        const carbonData = (await carbonRes.json()) as CarbonSummary;

        setSummary(summaryData);
        setCarbon(carbonData);
      } catch (err: any) {
        console.error(err);
        setError(err.message ?? "Error loading dashboard.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Simple check for super admin role by hitting /auth/me if you want:
  // For now, we assume ProtectedRoute + backend protection handles it.

  const renderCarbonChart = () => {
    if (!carbon || carbon.daily.length === 0) {
      return <p className="text-xs text-slate-500">No carbon data yet.</p>;
    }

    const maxValue = Math.max(
      ...carbon.daily.map((d) => Math.max(d.carbon_kg, d.pcc_tokens)),
      1
    );

    return (
      <div className="mt-3 space-y-2">
        <div className="flex justify-between text-[0.7rem] text-slate-500">
          <span>Last {carbon.daily.length} days</span>
          <span>kg CO₂e / PCC</span>
        </div>
        <div className="flex items-end gap-1 h-32 bg-emerald-50/60 rounded-lg p-2 overflow-x-auto">
          {carbon.daily.map((point) => (
            <div key={point.date} className="flex flex-col items-center">
              <div className="flex items-end gap-0.5 h-24">
                {/* Carbon bar */}
                <div
                  className="w-2 rounded-t-full bg-emerald-500"
                  style={{
                    height: `${(point.carbon_kg / maxValue) * 100}%`,
                  }}
                  title={`${point.carbon_kg.toFixed(1)} kg CO₂e`}
                />
                {/* PCC bar */}
                <div
                  className="w-2 rounded-t-full bg-emerald-300"
                  style={{
                    height: `${(point.pcc_tokens / maxValue) * 100}%`,
                  }}
                  title={`${point.pcc_tokens.toFixed(1)} PCC`}
                />
              </div>
              <span className="mt-1 text-[0.6rem] text-slate-500">
                {new Date(point.date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[0.65rem] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Carbon (kg CO₂e)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-300" />
            PCC tokens
          </span>
        </div>
      </div>
    );
  };

  if (loading) {
    return <p className="text-sm text-slate-600">Loading admin dashboard…</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">
        {error}
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-slate-800">City Dashboard</h1>
        <p className="text-xs text-slate-500">
          Overview of users, operations, and carbon impact across Prakriti.AI.
        </p>
      </header>

      {/* KPI cards */}
      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-emerald-100 bg-white p-3">
          <div className="text-[0.7rem] font-medium text-slate-500">
            Total Users
          </div>
          <div className="mt-1 text-xl font-semibold text-slate-800">
            {summary.total_users}
          </div>
          <div className="mt-1 text-[0.65rem] text-slate-500">
            Citizens: {summary.total_citizens} • Workers:{" "}
            {summary.total_waste_workers} • Bulk:{" "}
            {summary.total_bulk_generators}
          </div>
        </div>

        <div className="rounded-xl border border-amber-100 bg-white p-3">
          <div className="text-[0.7rem] font-medium text-slate-500">
            Pending Approvals
          </div>
          <div className="mt-1 text-xl font-semibold text-amber-600">
            {summary.pending_approvals}
          </div>
          <div className="mt-1 text-[0.65rem] text-slate-500">
            Users awaiting activation.
          </div>
        </div>

        <div className="rounded-xl border border-sky-100 bg-white p-3">
          <div className="text-[0.7rem] font-medium text-slate-500">
            Waste Reports
          </div>
          <div className="mt-1 text-xl font-semibold text-slate-800">
            {summary.total_waste_reports}
          </div>
          <div className="mt-1 text-[0.65rem] text-slate-500">
            Open: {summary.open_waste_reports} • Resolved:{" "}
            {summary.resolved_waste_reports}
          </div>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-white p-3">
          <div className="text-[0.7rem] font-medium text-slate-500">
            Segregation Score
          </div>
          <div className="mt-1 text-xl font-semibold text-emerald-700">
            {summary.avg_segregation_score
              ? summary.avg_segregation_score.toFixed(1)
              : "—"}
          </div>
          <div className="mt-1 text-[0.65rem] text-slate-500">
            Logs: {summary.total_segregation_logs}
          </div>
        </div>
      </section>

      {/* Carbon + PCC */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-1 rounded-xl border border-emerald-100 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800">
            Carbon &amp; PCC Overview
          </h2>
          <p className="text-[0.7rem] text-slate-500 mt-1">
            Total climate impact across all modules.
          </p>
          <div className="mt-4 space-y-1">
            <div className="text-[0.7rem] text-slate-500">Total Carbon</div>
            <div className="text-lg font-semibold text-emerald-700">
              {summary.total_carbon_kg.toFixed(1)} kg CO₂e
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="text-[0.7rem] text-slate-500">Total PCC Tokens</div>
            <div className="text-lg font-semibold text-emerald-700">
              {summary.total_pcc_tokens.toFixed(1)} PCC
            </div>
          </div>
        </div>

        <div className="md:col-span-2 rounded-xl border border-emerald-100 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800">
            Carbon &amp; PCC Trend
          </h2>
          {renderCarbonChart()}
        </div>
      </section>
    </div>
  );
};
