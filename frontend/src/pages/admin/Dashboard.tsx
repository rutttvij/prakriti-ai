import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api, { fetchAdminAnalyticsSummary } from "../../lib/api";
import type { AdminAnalyticsSummary } from "../../lib/types";

type AdminSummary = {
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
};

type CarbonDailyPoint = {
  date: string;
  carbon_kg: number;
  pcc_tokens: number;
};

type CarbonSummary = {
  total_carbon_kg: number;
  total_pcc_tokens: number;
  by_role: Record<string, { carbon_kg: number; pcc_tokens: number }>;
  by_activity_type: Record<string, { carbon_kg: number; pcc_tokens: number }>;
  daily: CarbonDailyPoint[];
};

type SegregationLogPreview = {
  id: number;
  waste_report_id?: number | null;
  household_id?: number | null;
  citizen_name?: string | null;
  score: number;
  pcc_awarded?: boolean | null;
  created_at?: string | null;
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [carbon, setCarbon] = useState<CarbonSummary | null>(null);
  const [recentLogs, setRecentLogs] = useState<SegregationLogPreview[]>([]);
  const [activity, setActivity] = useState<AdminAnalyticsSummary["recent_activity"]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [summaryRes, carbonRes, logsRes, insightsRes] = await Promise.all([
          api.get<AdminSummary>("/admin/summary"),
          api.get<CarbonSummary>("/admin/analytics/carbon"),
          api.get<SegregationLogPreview[]>("/admin/segregation/logs", { params: { limit: 5 } }),
          fetchAdminAnalyticsSummary(),
        ]);

        setSummary(summaryRes.data);
        setCarbon(carbonRes.data);
        setRecentLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
        setActivity(insightsRes.recent_activity || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const renderCarbonChart = () => {
    if (!carbon || carbon.daily.length === 0) {
      return (
        <p className="mt-4 text-xs text-slate-500">
          No carbon data yet. Start logging segregation and reports to see trends here.
        </p>
      );
    }

    const maxValue = Math.max(...carbon.daily.map((d) => Math.max(d.carbon_kg, d.pcc_tokens)), 1);

    return (
      <div className="mt-3 space-y-2">
        <div className="flex justify-between text-[0.7rem] text-slate-500">
          <span>Last {carbon.daily.length} days</span>
          <span>kg CO2e / PCC</span>
        </div>
        <div className="flex h-32 items-end gap-2 overflow-x-auto rounded-2xl bg-gradient-to-r from-emerald-50/80 via-emerald-50/60 to-emerald-100/70 p-2 shadow-inner">
          {carbon.daily.map((point) => (
            <div key={point.date} className="flex flex-col items-center">
              <div className="flex h-24 items-end gap-0.5">
                <div className="w-2 rounded-t-full bg-gradient-to-t from-emerald-600 to-emerald-400" style={{ height: `${(point.carbon_kg / maxValue) * 100}%` }} />
                <div className="w-2 rounded-t-full bg-gradient-to-t from-emerald-300 to-emerald-200" style={{ height: `${(point.pcc_tokens / maxValue) * 100}%` }} />
              </div>
              <span className="mt-1 text-[0.6rem] text-slate-500">
                {new Date(point.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading || !summary) {
    return <div className="surface-card-strong rounded-3xl px-6 py-5 text-sm text-slate-700">Loading city dashboard...</div>;
  }

  return (
    <div className="space-y-5">
      <header className="rounded-3xl border border-white/20 bg-slate-950/26 p-5 shadow-[0_24px_50px_rgba(5,22,27,0.38)] backdrop-blur-xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/16 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-emerald-100 shadow-sm shadow-emerald-950/30 backdrop-blur-md">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Super Admin · City control
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight !text-[#dffaf0]" style={{ color: "#dffaf0" }}>City Dashboard</h1>
        <p className="mt-1 text-sm text-emerald-100">Overview of users, operations, and carbon impact across Prakriti.AI.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="surface-card-strong rounded-3xl p-4">
          <div className="text-[0.7rem] font-medium text-slate-500">Total Users</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{summary.total_users}</div>
          <div className="mt-2 text-[0.65rem] text-slate-500">Citizens: {summary.total_citizens} · Workers: {summary.total_waste_workers} · Bulk: {summary.total_bulk_generators}</div>
        </div>

        <div className="surface-card-strong rounded-3xl p-4">
          <div className="text-[0.7rem] font-medium text-slate-500">Pending approvals</div>
          <div className="mt-1 text-2xl font-semibold text-amber-600">{summary.pending_approvals}</div>
          <div className="mt-2 text-[0.65rem] text-slate-500">Users awaiting activation.</div>
        </div>

        <div className="surface-card-strong rounded-3xl p-4">
          <div className="text-[0.7rem] font-medium text-slate-500">Waste reports</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{summary.total_waste_reports}</div>
          <div className="mt-2 text-[0.65rem] text-slate-500">Open: {summary.open_waste_reports} · Resolved: {summary.resolved_waste_reports}</div>
        </div>

        <div className="surface-card-strong rounded-3xl p-4">
          <div className="text-[0.7rem] font-medium text-slate-500">Segregation score</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-700">{summary.avg_segregation_score?.toFixed(1) ?? "—"}</div>
          <div className="mt-2 text-[0.65rem] text-slate-500">Logs: {summary.total_segregation_logs}</div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="surface-card-strong rounded-3xl p-4">
          <h2 className="text-sm font-semibold text-slate-900">Carbon & PCC overview</h2>
          <p className="mt-1 text-[0.72rem] text-slate-500">Total climate impact across all modules.</p>

          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <div>
              <div className="text-[0.7rem] text-slate-500">Total carbon</div>
              <div className="text-4xl font-semibold text-emerald-700">{summary.total_carbon_kg.toFixed(1)} kg CO2e</div>
            </div>
            <div>
              <div className="text-[0.7rem] text-slate-500">Total PCC tokens</div>
              <div className="text-4xl font-semibold text-emerald-700">{summary.total_pcc_tokens.toFixed(1)} PCC</div>
            </div>
          </div>

          {carbon && (
            <div className="mt-4 grid gap-3 text-[0.7rem] text-slate-600 md:grid-cols-2">
              <div className="surface-card-strong rounded-2xl p-3">
                <h3 className="mb-2 text-xs font-semibold text-slate-900">By role</h3>
                <div className="space-y-1.5">
                  {Object.entries(carbon.by_role).map(([role, row]) => (
                    <div key={role} className="flex items-center justify-between">
                      <span className="uppercase tracking-wide text-[0.65rem] text-slate-500">{role.replaceAll("_", " ")}</span>
                      <span className="text-[0.65rem] text-slate-700">{row.carbon_kg.toFixed(1)} kg · {row.pcc_tokens.toFixed(1)} PCC</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="surface-card-strong rounded-2xl p-3">
                <h3 className="mb-2 text-xs font-semibold text-slate-900">By activity type</h3>
                <div className="space-y-1.5">
                  {Object.entries(carbon.by_activity_type).map(([activity, row]) => (
                    <div key={activity} className="flex items-center justify-between">
                      <span className="text-[0.65rem] capitalize text-slate-500">{activity.replaceAll("_", " ").toLowerCase()}</span>
                      <span className="text-[0.65rem] text-slate-700">{row.carbon_kg.toFixed(1)} kg · {row.pcc_tokens.toFixed(1)} PCC</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="surface-card-strong rounded-3xl p-4">
          <h2 className="text-sm font-semibold text-slate-900">Carbon & PCC trend</h2>
          {renderCarbonChart()}
        </div>
      </section>

      <section className="surface-card-strong rounded-3xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Recent segregation logs</h2>
            <p className="mt-1 text-[0.7rem] text-slate-500">Review scores and award PCC to citizens.</p>
          </div>
          <Link to="/app/admin/pcc-tokens" className="rounded-full border border-emerald-200/45 bg-emerald-50/70 px-3 py-1.5 text-[0.7rem] font-semibold text-emerald-800">View all</Link>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-[0.75rem] text-slate-700">
            <thead className="bg-white/30 text-[0.7rem] text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Citizen</th>
                <th className="px-4 py-2.5">Household</th>
                <th className="px-4 py-2.5">Report</th>
                <th className="px-4 py-2.5 text-right">Score</th>
                <th className="px-4 py-2.5 text-center">PCC</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => (
                <tr key={log.id} className="border-t border-slate-100">
                  <td className="px-4 py-2.5">{log.citizen_name ?? "—"}</td>
                  <td className="px-4 py-2.5">{log.household_id ?? "—"}</td>
                  <td className="px-4 py-2.5">{log.waste_report_id ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-900">{Number.isFinite(log.score) ? log.score.toFixed(1) : "—"}</td>
                  <td className="px-4 py-2.5 text-center">
                    {log.pcc_awarded ? (
                      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-700">Awarded</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-600">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
              {recentLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-slate-500">No segregation logs found yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface-card-strong rounded-3xl p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-emerald-100 text-xs uppercase tracking-[0.12em] text-slate-500">
                <th className="px-2 py-2 text-left">Type</th>
                <th className="px-2 py-2 text-left">Title</th>
                <th className="px-2 py-2 text-left">Details</th>
                <th className="px-2 py-2 text-left">Time</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((row) => (
                <tr key={`${row.kind}-${row.id}-${row.created_at}`} className="border-b border-emerald-100/70">
                  <td className="px-2 py-2 capitalize text-slate-600">{row.kind.replace("_", " ")}</td>
                  <td className="px-2 py-2 font-medium text-slate-900">{row.title}</td>
                  <td className="px-2 py-2 text-slate-600">{row.subtitle || "-"}</td>
                  <td className="px-2 py-2 text-slate-500">{new Date(row.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {activity.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-2 py-5 text-center text-slate-500">No activity found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
