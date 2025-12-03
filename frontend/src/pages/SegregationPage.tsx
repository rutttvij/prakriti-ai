import { FormEvent, useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import type { SegregationLog } from "../types/segregation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

interface CreateSegregationPayload {
  log_date: string; // "YYYY-MM-DD"
  household_id: number;
  dry_kg: number;
  wet_kg: number;
  reject_kg: number;
  notes?: string;
}

export default function SegregationPage() {
  const { user } = useAuth();

  // Restrict page to waste workers in a friendly way
  if (user && user.role !== "WASTE_WORKER") {
    return (
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-semibold text-emerald-800 mb-2">
          Segregation dashboard
        </h1>
        <p className="text-sm text-slate-600">
          This view is meant for waste workers to log daily segregation quality
          across households and bulk generators.
        </p>
      </div>
    );
  }

  const [logs, setLogs] = useState<SegregationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [householdId, setHouseholdId] = useState("");
  const [dryKg, setDryKg] = useState<string>("");
  const [wetKg, setWetKg] = useState<string>("");
  const [rejectKg, setRejectKg] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadLogs() {
      try {
        const res = await api.get<SegregationLog[]>("/segregation/logs/me");
        setLogs(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load segregation logs.");
      } finally {
        setLoading(false);
      }
    }

    loadLogs();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!householdId.trim()) {
      setError("Please enter a household ID.");
      return;
    }

    const parsedHouseholdId = parseInt(householdId.trim(), 10);
    const parsedDry = parseFloat(dryKg || "0");
    const parsedWet = parseFloat(wetKg || "0");
    const parsedReject = parseFloat(rejectKg || "0");

    if (
      Number.isNaN(parsedHouseholdId) ||
      Number.isNaN(parsedDry) ||
      Number.isNaN(parsedWet) ||
      Number.isNaN(parsedReject)
    ) {
      setError("Please enter valid numbers for all fields.");
      return;
    }

    const payload: CreateSegregationPayload = {
      log_date: date,
      household_id: parsedHouseholdId,
      dry_kg: parsedDry,
      wet_kg: parsedWet,
      reject_kg: parsedReject,
      notes: notes.trim() || undefined,
    };

    try {
      setSubmitting(true);
      const res = await api.post<SegregationLog>("/segregation/logs", payload);

      // Prepend new log to the list for instant feedback
      setLogs((prev) => [res.data, ...prev]);

      setDryKg("");
      setWetKg("");
      setRejectKg("");
      setNotes("");
    } catch (err) {
      console.error(err);
      setError("Could not save segregation log. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const stats = useMemo(() => {
    if (logs.length === 0) {
      return {
        totalLogs: 0,
        avgScore: 0,
        uniqueHouseholds: 0,
      };
    }

    const totalLogs = logs.length;
    const avgScore =
      logs.reduce((sum, log) => sum + (log.segregation_score ?? 0), 0) /
      totalLogs;

    const householdSet = new Set(logs.map((log) => log.household_id));
    const uniqueHouseholds = householdSet.size;

    return {
      totalLogs,
      avgScore: Math.round(avgScore),
      uniqueHouseholds,
    };
  }, [logs]);

  const trendData = useMemo(() => {
    const sorted = [...logs].sort(
      (a, b) =>
        new Date(a.log_date).getTime() - new Date(b.log_date).getTime(),
    );
    const last = sorted.slice(-14);
    return last.map((log) => ({
      date: log.log_date,
      score: log.segregation_score,
    }));
  }, [logs]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-emerald-800">
            Segregation dashboard
          </h1>
          <p className="text-sm text-slate-600">
            Record daily segregation by weight (kg) for households and bulk
            generators. Each compliant day boosts your carbon impact and PCC
            rewards.
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Total logs
          </p>
          <p className="mt-2 text-2xl font-semibold text-emerald-800">
            {stats.totalLogs}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Across all households you&apos;ve covered.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Avg compliance score
          </p>
          <p className="mt-2 text-2xl font-semibold text-emerald-800">
            {stats.avgScore}%
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Based on your recorded segregation logs.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Unique sites
          </p>
          <p className="mt-2 text-2xl font-semibold text-emerald-800">
            {stats.uniqueHouseholds}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Households / bulk generators you&apos;ve served.
          </p>
        </div>
      </div>

      {/* Form + chart */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr),minmax(0,1fr)]">
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4"
        >
          <h2 className="text-sm font-semibold text-emerald-800">
            Record today&apos;s segregation
          </h2>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm text-slate-700">Date</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-700">Household ID</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="E.g. 101"
                value={householdId}
                onChange={(e) => setHouseholdId(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm text-slate-700">Dry (kg)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={dryKg}
                onChange={(e) => setDryKg(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-700">Wet (kg)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={wetKg}
                onChange={(e) => setWetKg(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-700">Reject (kg)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={rejectKg}
                onChange={(e) => setRejectKg(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-700">Notes (optional)</label>
            <textarea
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g. Perfect segregation today, minor contamination observed, etc."
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
          >
            {submitting ? "Saving log..." : "Save segregation log"}
          </button>

          <p className="text-xs text-slate-500">
            Saving a log will automatically update carbon activities, badges,
            and PCC tokens via the backend segregation engine.
          </p>
        </form>

        {/* Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col">
          <h2 className="text-sm font-semibold text-emerald-800 mb-2">
            Compliance trend (recent)
          </h2>
          {trendData.length === 0 ? (
            <p className="text-xs text-slate-500">
              Once you start recording logs, you&apos;ll see a 14-day trend of
              segregation quality here.
            </p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis domain={[0, 100]} fontSize={10} />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, "Score"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Recent logs table */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-emerald-800 mb-3">
          Recent logs
        </h2>
        {loading ? (
          <p className="text-sm text-slate-600">Loading logs...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-slate-500">
            No segregation logs recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2 pr-4 text-left">Date</th>
                  <th className="py-2 px-4 text-left">Household</th>
                  <th className="py-2 px-4 text-right">Dry (kg)</th>
                  <th className="py-2 px-4 text-right">Wet (kg)</th>
                  <th className="py-2 px-4 text-right">Reject (kg)</th>
                  <th className="py-2 pl-4 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 20).map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="py-2 pr-4 text-slate-700">
                      {log.log_date}
                    </td>
                    <td className="py-2 px-4 text-slate-700">
                      {log.household_id}
                    </td>
                    <td className="py-2 px-4 text-right text-slate-700">
                      {log.dry_kg.toFixed(1)}
                    </td>
                    <td className="py-2 px-4 text-right text-slate-700">
                      {log.wet_kg.toFixed(1)}
                    </td>
                    <td className="py-2 px-4 text-right text-slate-700">
                      {log.reject_kg.toFixed(1)}
                    </td>
                    <td className="py-2 pl-4 text-right">
                      <span className="inline-flex items-center justify-end rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        {log.segregation_score}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
