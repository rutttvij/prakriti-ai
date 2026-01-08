// src/pages/admin/AdminDashboardPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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
  date: string;
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

interface SegregationLogPreview {
  id: string;
  waste_report_id?: string | null;
  household_id?: string | null;
  citizen_name?: string | null;
  score: number;
  pcc_awarded?: boolean | null;
  created_at?: string | null;
}

export const AdminDashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [carbon, setCarbon] = useState<CarbonSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [recentLogs, setRecentLogs] = useState<SegregationLogPreview[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setError("Not authenticated.");
      setLoading(false);
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    const fetchData = async () => {
      try {
        const [summaryRes, carbonRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/admin/summary`, { headers }),
          fetch(`${API_BASE_URL}/api/v1/admin/analytics/carbon`, { headers }),
        ]);

        if (!summaryRes.ok) throw new Error("Failed to load admin summary");
        if (!carbonRes.ok) throw new Error("Failed to load carbon analytics");

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

    const fetchRecentLogs = async () => {
      setLogsLoading(true);
      setLogsError(null);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/admin/segregation/logs?limit=5`,
          { headers },
        );
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(
            text?.trim()
              ? `Failed to load segregation logs: ${text}`
              : "Failed to load segregation logs",
          );
        }
        const data = (await res.json()) as SegregationLogPreview[];
        setRecentLogs(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error(err);
        setLogsError(err.message ?? "Error loading segregation logs.");
        setRecentLogs([]);
      } finally {
        setLogsLoading(false);
      }
    };

    fetchData();
    fetchRecentLogs();
  }, []);

  const renderCarbonChart = () => {
    if (!carbon || carbon.daily.length === 0) {
      return (
        <p className="mt-4 text-xs text-slate-500">
          No carbon data yet. Start logging segregation and reports to see trends
          here.
        </p>
      );
    }

    const maxValue = Math.max(
      ...carbon.daily.map((d) => Math.max(d.carbon_kg, d.pcc_tokens)),
      1,
    );

    return (
      <div className="mt-3 space-y-2">
        <div className="flex justify-between text-[0.7rem] text-slate-500">
          <span>Last {carbon.daily.length} days</span>
          <span>kg CO₂e / PCC</span>
        </div>
        <div
          className="
            flex h-32 items-end gap-2 overflow-x-auto rounded-2xl
            bg-gradient-to-r from-emerald-50/80 via-emerald-50/60 to-emerald-100/70
            p-2
            shadow-inner
          "
        >
          {carbon.daily.map((point) => (
            <div key={point.date} className="flex flex-col items-center">
              <div className="flex h-24 items-end gap-0.5">
                <div
                  className="w-2 rounded-t-full bg-gradient-to-t from-emerald-600 to-emerald-400"
                  style={{ height: `${(point.carbon_kg / maxValue) * 100}%` }}
                  title={`${point.carbon_kg.toFixed(1)} kg CO₂e`}
                />
                <div
                  className="w-2 rounded-t-full bg-gradient-to-t from-emerald-300 to-emerald-200"
                  style={{ height: `${(point.pcc_tokens / maxValue) * 100}%` }}
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
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-600" />
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

  const renderCarbonBreakdown = () => {
    if (!carbon) return null;

    const rolesOrder = [
      "CITIZEN",
      "WASTE_WORKER",
      "BULK_GENERATOR",
      "SUPER_ADMIN",
    ];

    return (
      <div className="mt-4 grid gap-3 text-[0.7rem] text-slate-600 md:grid-cols-2">
        <div
          className="
            rounded-2xl border border-emerald-50/80
            bg-white/80 p-3
            shadow-sm shadow-emerald-50
            backdrop-blur-sm
          "
        >
          <h3 className="mb-2 text-xs font-semibold text-slate-900">By role</h3>
          <div className="space-y-1.5">
            {rolesOrder.map((roleKey) => {
              const row = carbon.by_role[roleKey];
              if (!row) return null;
              return (
                <div key={roleKey} className="flex items-center justify-between">
                  <span className="uppercase tracking-wide text-[0.65rem] text-slate-500">
                    {roleKey.replace("_", " ")}
                  </span>
                  <span className="text-[0.65rem] text-slate-700">
                    {row.carbon_kg.toFixed(1)} kg · {row.pcc_tokens.toFixed(1)} PCC
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div
          className="
            rounded-2xl border border-emerald-50/80
            bg-white/80 p-3
            shadow-sm shadow-emerald-50
            backdrop-blur-sm
          "
        >
          <h3 className="mb-2 text-xs font-semibold text-slate-900">
            By activity type
          </h3>
          <div className="space-y-1.5">
            {Object.entries(carbon.by_activity_type).map(([activity, row]) => (
              <div key={activity} className="flex items-center justify-between">
                <span className="text-[0.65rem] capitalize text-slate-500">
                  {activity.replace("_", " ").toLowerCase()}
                </span>
                <span className="text-[0.65rem] text-slate-700">
                  {row.carbon_kg.toFixed(1)} kg · {row.pcc_tokens.toFixed(1)} PCC
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderRecentSegregationLogs = () => {
    if (logsLoading) {
      return <div className="mt-3 text-xs text-slate-600">Loading logs…</div>;
    }

    return (
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Recent segregation logs
            </h2>
            <p className="mt-1 text-[0.7rem] text-slate-500">
              Review scores and award PCC to citizens.
            </p>
          </div>

          <Link
            to="/admin/pcc"
            className="
              rounded-full border border-emerald-100/80 bg-white/70
              px-3 py-1.5 text-[0.7rem] font-semibold text-emerald-800
              shadow-sm shadow-emerald-100/70 backdrop-blur-sm
              hover:bg-white
            "
          >
            View all
          </Link>
        </div>

        {logsError ? (
          <div
            className="
              mt-3 rounded-2xl border border-amber-100/80 bg-amber-50/80
              px-4 py-3 text-[0.7rem] text-amber-800
              shadow-sm shadow-amber-100/70
            "
          >
            {logsError}
          </div>
        ) : recentLogs.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500">
            No segregation logs found yet.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-100 bg-white/60">
            <table className="w-full text-left text-[0.75rem] text-slate-700">
              <thead className="bg-slate-50/70 text-[0.7rem] text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Citizen</th>
                  <th className="px-4 py-2.5">Household</th>
                  <th className="px-4 py-2.5">Report</th>
                  <th className="px-4 py-2.5 text-right">Score</th>
                  <th className="px-4 py-2.5 text-center">PCC</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => {
                  const awarded = Boolean(log.pcc_awarded);
                  return (
                    <tr key={log.id} className="border-t border-slate-100">
                      <td className="px-4 py-2.5">{log.citizen_name ?? "—"}</td>
                      <td className="px-4 py-2.5">{log.household_id ?? "—"}</td>
                      <td className="px-4 py-2.5">{log.waste_report_id ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                        {Number.isFinite(log.score) ? log.score.toFixed(1) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {awarded ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-700">
                            Awarded
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-600">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {awarded ? (
                          <span className="text-[0.7rem] text-slate-500">—</span>
                        ) : (
                          <Link
                            to={`/admin/pcc?logId=${encodeURIComponent(log.id)}`}
                            className="
                              inline-flex items-center justify-center
                              rounded-full bg-emerald-600 px-3 py-1.5
                              text-[0.7rem] font-semibold text-white
                              shadow-sm shadow-emerald-200
                              hover:bg-emerald-700
                            "
                          >
                            Award PCC
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div
        className="
          relative rounded-3xl border border-emerald-100/80
          bg-white/80 px-6 py-5 text-sm text-slate-700
          shadow-md shadow-emerald-100/70 backdrop-blur-sm
        "
      >
        Loading city dashboard…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="
          relative rounded-3xl border border-red-100/80
          bg-red-50/90 px-6 py-4 text-xs text-red-700
          shadow-md shadow-red-100
        "
      >
        {error}
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 -top-10 h-24 bg-[radial-gradient(circle_at_top,_#bbf7d0,_transparent_65%)] opacity-70" />

      <div className="relative space-y-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100/80 bg-white/70 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-emerald-800 shadow-sm shadow-emerald-100/80 backdrop-blur-sm">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Super Admin · City control
            </div>
            <h1 className="mt-3 text-2xl font-bold text-slate-950">
              City Dashboard
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              Overview of users, operations, and carbon impact across Prakriti.AI.
            </p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <div
            className="
              rounded-3xl border border-emerald-100/80
              bg-white/80 p-4
              shadow-md shadow-emerald-100/70
              backdrop-blur-sm
            "
          >
            <div className="text-[0.7rem] font-medium text-slate-500">
              Total Users
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {summary.total_users}
            </div>
            <div className="mt-2 text-[0.65rem] text-slate-500">
              Citizens: {summary.total_citizens} · Workers:{" "}
              {summary.total_waste_workers} · Bulk: {summary.total_bulk_generators}
            </div>
          </div>

          <div
            className="
              rounded-3xl border border-amber-100/80
              bg-white/80 p-4
              shadow-md shadow-amber-100/70
              backdrop-blur-sm
            "
          >
            <div className="text-[0.7rem] font-medium text-slate-500">
              Pending approvals
            </div>
            <div className="mt-1 text-2xl font-semibold text-amber-600">
              {summary.pending_approvals}
            </div>
            <div className="mt-2 text-[0.65rem] text-slate-500">
              Users awaiting activation.
            </div>
          </div>

          <div
            className="
              rounded-3xl border border-sky-100/80
              bg-white/80 p-4
              shadow-md shadow-sky-100/70
              backdrop-blur-sm
            "
          >
            <div className="text-[0.7rem] font-medium text-slate-500">
              Waste reports
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {summary.total_waste_reports}
            </div>
            <div className="mt-2 text-[0.65rem] text-slate-500">
              Open: {summary.open_waste_reports} · Resolved:{" "}
              {summary.resolved_waste_reports}
            </div>
          </div>

          <div
            className="
              rounded-3xl border border-emerald-100/80
              bg-white/80 p-4
              shadow-md shadow-emerald-100/70
              backdrop-blur-sm
            "
          >
            <div className="text-[0.7rem] font-medium text-slate-500">
              Segregation score
            </div>
            <div className="mt-1 text-2xl font-semibold text-emerald-700">
              {summary.avg_segregation_score
                ? summary.avg_segregation_score.toFixed(1)
                : "—"}
            </div>
            <div className="mt-2 text-[0.65rem] text-slate-500">
              Logs: {summary.total_segregation_logs}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div
            className="
              rounded-3xl border border-emerald-100/80
              bg-white/80 p-4
              shadow-md shadow-emerald-100/70
              backdrop-blur-sm
            "
          >
            <h2 className="text-sm font-semibold text-slate-900">
              Carbon &amp; PCC overview
            </h2>
            <p className="mt-1 text-[0.7rem] text-slate-500">
              Total climate impact across all modules.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <div className="text-[0.7rem] text-slate-500">Total carbon</div>
                <div className="text-lg font-semibold text-emerald-700">
                  {summary.total_carbon_kg.toFixed(1)} kg CO₂e
                </div>
              </div>

              <div>
                <div className="text-[0.7rem] text-slate-500">
                  Total PCC tokens
                </div>
                <div className="text-lg font-semibold text-emerald-700">
                  {summary.total_pcc_tokens.toFixed(1)} PCC
                </div>
              </div>
            </div>

            {renderCarbonBreakdown()}
          </div>

          <div
            className="
              rounded-3xl border border-emerald-100/80
              bg-white/80 p-4
              shadow-md shadow-emerald-100/70
              backdrop-blur-sm
            "
          >
            <h2 className="text-sm font-semibold text-slate-900">
              Carbon &amp; PCC trend
            </h2>
            {renderCarbonChart()}
          </div>
        </section>

        <section
          className="
            rounded-3xl border border-emerald-100/80
            bg-white/80 p-4
            shadow-md shadow-emerald-100/70
            backdrop-blur-sm
          "
        >
          {renderRecentSegregationLogs()}
        </section>
      </div>
    </div>
  );
};
