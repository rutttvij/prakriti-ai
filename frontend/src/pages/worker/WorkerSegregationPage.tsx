import { type FormEvent, useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import type { SegregationLog } from "../../types/segregation";

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
  log_date: string;
  household_id: number;
  dry_kg: number;
  wet_kg: number;
  reject_kg: number;
  notes?: string;
}

export default function WorkerSegregationPage() {
  const { user } = useAuth();

  // Restrict page to waste workers
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
    const t = new Date();
    return t.toISOString().slice(0, 10);
  });

  const [householdId, setHouseholdId] = useState("");
  const [dryKg, setDryKg] = useState("");
  const [wetKg, setWetKg] = useState("");
  const [rejectKg, setRejectKg] = useState("");
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

    const payload: CreateSegregationPayload = {
      log_date: date,
      household_id: Number(householdId),
      dry_kg: Number(dryKg || 0),
      wet_kg: Number(wetKg || 0),
      reject_kg: Number(rejectKg || 0),
      notes: notes.trim() || undefined,
    };

    try {
      setSubmitting(true);
      const res = await api.post<SegregationLog>("/segregation/logs", payload);

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
    if (logs.length === 0) return { totalLogs: 0, avgScore: 0, uniqueHouseholds: 0 };

    const totalLogs = logs.length;
    const avgScore =
      logs.reduce((sum, log) => sum + (log.segregation_score ?? 0), 0) /
      totalLogs;

    const unique = new Set(logs.map((l) => l.household_id)).size;

    return {
      totalLogs,
      avgScore: Math.round(avgScore),
      uniqueHouseholds: unique,
    };
  }, [logs]);

  const trendData = useMemo(() => {
    const sorted = [...logs].sort(
      (a, b) =>
        new Date(a.log_date).getTime() - new Date(b.log_date).getTime()
    );
    return sorted.slice(-14).map((log) => ({
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
            Record daily segregation by weight (kg). Every compliant log boosts
            your PCC reward and carbon efficiency score.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Total logs</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-800">
            {stats.totalLogs}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Avg score</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-800">
            {stats.avgScore}%
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Unique sites</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-800">
            {stats.uniqueHouseholds}
          </p>
        </div>
      </div>

      {/* Form + Chart */}
      <div className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4"
        >
          <h2 className="text-sm font-semibold text-emerald-800">
            Record today's segregation
          </h2>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm text-slate-700">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm text-slate-700">Household ID</label>
              <input
                type="text"
                value={householdId}
                onChange={(e) => setHouseholdId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder="101"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm text-slate-700">Dry (kg)</label>
              <input
                type="number"
                value={dryKg}
                onChange={(e) => setDryKg(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm text-slate-700">Wet (kg)</label>
              <input
                type="number"
                value={wetKg}
                onChange={(e) => setWetKg(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm text-slate-700">Reject (kg)</label>
              <input
                type="number"
                value={rejectKg}
                onChange={(e) => setRejectKg(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Additional notes..."
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save log"}
          </button>
        </form>

        {/* Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-emerald-800 mb-2">
            14-day compliance trend
          </h2>

          {trendData.length === 0 ? (
            <p className="text-xs text-slate-500">
              Start logging to see your compliance trend.
            </p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis domain={[0, 100]} fontSize={10} />
                  <Tooltip formatter={(v: number) => [`${v}%`, "Score"]} />
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

      {/* Recent Logs */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-emerald-800 mb-3">
          Recent logs
        </h2>

        {loading ? (
          <p className="text-sm">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-slate-500">No logs recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-slate-500">
                  <th className="py-2 pr-4 text-left">Date</th>
                  <th className="py-2 px-4 text-left">Household</th>
                  <th className="py-2 px-4 text-right">Dry</th>
                  <th className="py-2 px-4 text-right">Wet</th>
                  <th className="py-2 px-4 text-right">Reject</th>
                  <th className="py-2 pl-4 text-right">Score</th>
                </tr>
              </thead>

              <tbody>
                {logs.slice(0, 20).map((log) => (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{log.log_date}</td>
                    <td className="py-2 px-4">{log.household_id}</td>
                    <td className="py-2 px-4 text-right">{log.dry_kg.toFixed(1)}</td>
                    <td className="py-2 px-4 text-right">{log.wet_kg.toFixed(1)}</td>
                    <td className="py-2 px-4 text-right">{log.reject_kg.toFixed(1)}</td>
                    <td className="py-2 pl-4 text-right">
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
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
