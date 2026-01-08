import { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import type { Household } from "../../types/household";
import type { SegregationLog } from "../../types/segregation";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

interface WeeklyBucket {
  weekStart: string; // YYYY-MM-DD
  label: string; // e.g. "08 Dec"
  avgScore: number;
  dryKg: number;
  wetKg: number;
  rejectKg: number;
  estimatedPcc: number;
}

function formatDateLabel(d: Date) {
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function getWeekStart(dateStr: string): { key: string; label: string } {
  const d = new Date(dateStr + "T00:00:00");
  // convert Sunday (0) → 6, Monday (1) → 0, ...
  const jsDay = d.getDay();
  const daysSinceMonday = (jsDay + 6) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - daysSinceMonday);

  const key = start.toISOString().slice(0, 10);
  const label = formatDateLabel(start);
  return { key, label };
}

export default function CitizenInsightsPage() {
  const { user } = useAuth();

  // Restrict to citizens only
  if (user && user.role !== "CITIZEN") {
    return (
      <div className="min-h-[60vh] bg-gradient-to-b from-emerald-50/70 to-white flex items-center -m-4 p-4 md:p-6">
        <div className="max-w-xl mx-auto rounded-2xl border border-emerald-100 bg-white/80 shadow-sm p-6">
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 mb-3">
            My Waste Insights
          </span>
          <h1 className="text-2xl font-semibold text-emerald-900 mb-2">
            Citizens only
          </h1>
          <p className="text-sm text-slate-600">
            This page is meant for{" "}
            <span className="font-semibold text-emerald-800">citizens</span> to
            view segregation trends and climate impact for their households.
            Please switch to a citizen account if you think this is a mistake.
          </p>
        </div>
      </div>
    );
  }

  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<number | null>(
    null
  );
  const [logs, setLogs] = useState<SegregationLog[]>([]);
  const [loadingHouseholds, setLoadingHouseholds] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load households first
  useEffect(() => {
    async function loadHouseholds() {
      try {
        setLoadingHouseholds(true);
        const res = await api.get<Household[]>("/segregation/households/me");
        const data = res.data;

        // Primary first
        data.sort((a, b) => {
          if (a.is_primary === b.is_primary) {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          }
          return a.is_primary ? -1 : 1;
        });

        setHouseholds(data);

        if (data.length > 0) {
          const primary = data.find((h) => h.is_primary) ?? data[0];
          setSelectedHouseholdId(primary.id);
        }
      } catch (err) {
        console.error(err);
        setError("Could not load your households.");
      } finally {
        setLoadingHouseholds(false);
      }
    }

    loadHouseholds();
  }, []);

  // Load logs whenever selected household changes
  useEffect(() => {
    async function loadLogs() {
      if (!selectedHouseholdId) return;
      try {
        setLoadingLogs(true);
        setError(null);
        const res = await api.get<SegregationLog[]>(
          `/segregation/logs/household/${selectedHouseholdId}`
        );
        setLogs(res.data);
      } catch (err) {
        console.error(err);
        setError("Could not load segregation logs for this household.");
      } finally {
        setLoadingLogs(false);
      }
    }

    loadLogs();
  }, [selectedHouseholdId]);

  const selectedHousehold = useMemo(
    () => households.find((h) => h.id === selectedHouseholdId) ?? null,
    [households, selectedHouseholdId]
  );

  // Derive weekly buckets + summary from logs
  const { weekly, summary } = useMemo(() => {
    if (!logs.length) {
      return {
        weekly: [] as WeeklyBucket[],
        summary: {
          totalLogs: 0,
          avgScore: 0,
          totalDryKg: 0,
          totalWetKg: 0,
          totalRejectKg: 0,
          estimatedPcc: 0,
        },
      };
    }

    const buckets: Record<string, WeeklyBucket> = {};

    for (const log of logs) {
      const { key, label } = getWeekStart(log.log_date);
      if (!buckets[key]) {
        buckets[key] = {
          weekStart: key,
          label,
          avgScore: 0,
          dryKg: 0,
          wetKg: 0,
          rejectKg: 0,
          estimatedPcc: 0,
        };
      }
      const bucket = buckets[key];
      bucket.dryKg += log.dry_kg ?? 0;
      bucket.wetKg += log.wet_kg ?? 0;
      bucket.rejectKg += log.reject_kg ?? 0;

      // naive averaging – we’ll normalise later
      bucket.avgScore += log.segregation_score ?? 0;

      // simple estimated PCC placeholder – to be replaced by real backend wallet
      // e.g. ~1 PCC per 20 points of score
      bucket.estimatedPcc += Math.round((log.segregation_score ?? 0) / 20);
    }

    // Finalise averages and sort
    const weeklyArr = Object.values(buckets)
      .map((b) => {
        // count logs per week to get proper avg score
        const count = logs.filter(
          (l) => getWeekStart(l.log_date).key === b.weekStart
        ).length;
        return {
          ...b,
          avgScore: count ? Math.round(b.avgScore / count) : 0,
        };
      })
      .sort(
        (a, b) =>
          new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime()
      )
      .slice(-8); // last 8 weeks

    const totalDryKg = weeklyArr.reduce((s, w) => s + w.dryKg, 0);
    const totalWetKg = weeklyArr.reduce((s, w) => s + w.wetKg, 0);
    const totalRejectKg = weeklyArr.reduce((s, w) => s + w.rejectKg, 0);
    const totalPcc = weeklyArr.reduce((s, w) => s + w.estimatedPcc, 0);
    const totalLogs = logs.length;
    const avgScore =
      totalLogs === 0
        ? 0
        : Math.round(
            logs.reduce((s, l) => s + (l.segregation_score ?? 0), 0) / totalLogs
          );

    return {
      weekly: weeklyArr,
      summary: {
        totalLogs,
        avgScore,
        totalDryKg,
        totalWetKg,
        totalRejectKg,
        estimatedPcc: totalPcc,
      },
    };
  }, [logs]);

  const hasData = weekly.length > 0;

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-emerald-50/70 to-white -m-4 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 mb-2">
              Citizen · My Waste Insights
            </span>
            <h1 className="text-2xl md:text-3xl font-semibold text-emerald-900">
              Segregation & impact insights
            </h1>
            <p className="mt-1 text-sm text-slate-600 max-w-2xl">
              Track how well your household is segregating waste each week,
              understand dry/wet/reject patterns, and preview how this translates
              into climate-positive PCC rewards.
            </p>
          </div>

          {/* Household selector */}
          <div className="flex flex-col items-start gap-1 text-sm md:items-end">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-700">
              Household
            </p>
            {loadingHouseholds ? (
              <p className="text-xs text-slate-500">Loading households…</p>
            ) : households.length === 0 ? (
              <p className="text-xs text-slate-500">
                No household linked yet. Go to{" "}
                <span className="font-medium text-emerald-700">
                  Home &amp; Household
                </span>{" "}
                to add your address.
              </p>
            ) : (
              <select
                value={selectedHouseholdId ?? ""}
                onChange={(e) =>
                  setSelectedHouseholdId(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="min-w-[220px] rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {households.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                    {h.is_primary ? " (Primary)" : ""}
                  </option>
                ))}
              </select>
            )}
            {selectedHousehold && (
              <p className="text-[11px] text-slate-500">
                {selectedHousehold.address || "No address"} ·{" "}
                {selectedHousehold.ward || "Ward N/A"}
              </p>
            )}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        {/* If no household or no data */}
        {!loadingLogs && households.length > 0 && !hasData && (
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/70 p-6 text-sm text-slate-600">
            <h2 className="text-sm font-semibold text-emerald-900 mb-1">
              Waiting for your first segregation log
            </h2>
            <p className="text-sm text-slate-600">
              Once your waste worker starts logging segregation for this
              household, you&apos;ll see weekly scores, dry/wet/reject trends,
              and PCC here.
            </p>
          </div>
        )}

        {/* Summary cards */}
        {hasData && (
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-emerald-100 bg-white/90 p-4 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                Avg score
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-800">
                {summary.avgScore}%
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Across {summary.totalLogs} logs
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white/90 p-4 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                Dry (kg)
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-800">
                {summary.totalDryKg.toFixed(1)}
              </p>
              <p className="mt-1 text-xs text-slate-500">Last 8 weeks</p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white/90 p-4 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                Wet (kg)
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-800">
                {summary.totalWetKg.toFixed(1)}
              </p>
              <p className="mt-1 text-xs text-slate-500">Last 8 weeks</p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white/90 p-4 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                Estimated PCC
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-800">
                {summary.estimatedPcc}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Preview only – final PCC may differ once rewards are configured
                by your city.
              </p>
            </div>
          </div>
        )}

        {/* Charts */}
        {hasData && (
          <div className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
            {/* Weekly score trend */}
            <div className="rounded-2xl border border-emerald-100 bg-white/90 p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-emerald-900 mb-1">
                Weekly segregation score
              </h2>
              <p className="text-xs text-slate-500 mb-3">
                Higher scores mean better segregation at source – closer to{" "}
                <span className="font-semibold text-emerald-700">
                  100% correct sorting
                </span>
                .
              </p>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weekly}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis domain={[0, 100]} fontSize={11} />
                    <Tooltip
                      formatter={(v: number) => [`${v}%`, "Score"]}
                      labelFormatter={(label) => `Week of ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgScore"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Composition chart */}
            <div className="rounded-2xl border border-emerald-100 bg-white/90 p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-emerald-900 mb-1">
                Weekly dry / wet / reject
              </h2>
              <p className="text-xs text-slate-500 mb-3">
                Understand how much waste your household generates by category.
              </p>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekly} stackOffset="none">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip
                      labelFormatter={(label) => `Week of ${label}`}
                      formatter={(v: number, name) => {
                        const labelMap: Record<string, string> = {
                          dryKg: "Dry (kg)",
                          wetKg: "Wet (kg)",
                          rejectKg: "Reject (kg)",
                        };
                        return [`${v.toFixed(1)} kg`, labelMap[name] ?? name];
                      }}
                    />
                    <Legend
                      formatter={(value) => {
                        const labelMap: Record<string, string> = {
                          dryKg: "Dry (kg)",
                          wetKg: "Wet (kg)",
                          rejectKg: "Reject (kg)",
                        };
                        return labelMap[value] ?? value;
                      }}
                    />
                    <Bar dataKey="dryKg" stackId="kg" fill="#22c55e" />
                    <Bar dataKey="wetKg" stackId="kg" fill="#a7f3d0" />
                    <Bar dataKey="rejectKg" stackId="kg" fill="#f97373" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Recent logs table (small, optional) */}
        {logs.length > 0 && (
          <div className="rounded-2xl border border-emerald-100 bg-white/90 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-emerald-900 mb-2">
              Recent segregation logs
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs md:text-sm">
                <thead>
                  <tr className="border-b text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-4 text-left">Date</th>
                    <th className="py-2 px-4 text-right">Dry (kg)</th>
                    <th className="py-2 px-4 text-right">Wet (kg)</th>
                    <th className="py-2 px-4 text-right">Reject (kg)</th>
                    <th className="py-2 pl-4 text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 15).map((log) => (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {log.log_date}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {log.dry_kg.toFixed(1)}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {log.wet_kg.toFixed(1)}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {log.reject_kg.toFixed(1)}
                      </td>
                      <td className="py-2 pl-4 text-right">
                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                          {log.segregation_score}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
