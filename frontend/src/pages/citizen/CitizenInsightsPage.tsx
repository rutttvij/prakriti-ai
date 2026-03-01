import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import CitizenPageHero from "../../components/citizen/CitizenPageHero";
import { fetchCitizenHouseholds, fetchCitizenSegregationSummary } from "../../lib/api";
import type { CitizenHousehold, CitizenSegregationSummary } from "../../lib/types";

const EMPTY_SUMMARY: CitizenSegregationSummary = {
  avg_score: 0,
  totals: { dry_total: 0, wet_total: 0, reject_total: 0 },
  estimated_pcc_preview: 0,
  weekly_score_points: [],
  weekly_breakdown: [],
  recent_logs: [],
};

export default function CitizenInsightsPage() {
  const [households, setHouseholds] = useState<CitizenHousehold[]>([]);
  const [householdId, setHouseholdId] = useState<number | null>(null);
  const [summary, setSummary] = useState<CitizenSegregationSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function boot() {
      setLoading(true);
      setError(null);
      try {
        const hh = await fetchCitizenHouseholds();
        setHouseholds(hh);
        const primary = hh.find((x) => x.is_primary) ?? hh[0] ?? null;
        setHouseholdId(primary?.id ?? null);
      } catch (e: any) {
        setError(e?.response?.data?.detail || "Failed to load households.");
      } finally {
        setLoading(false);
      }
    }
    void boot();
  }, []);

  useEffect(() => {
    async function loadSummary() {
      if (!householdId) {
        setSummary(EMPTY_SUMMARY);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCitizenSegregationSummary({ household_id: householdId, weeks: 8 });
        setSummary(data);
      } catch (e: any) {
        setError(e?.response?.data?.detail || "Failed to load insights.");
      } finally {
        setLoading(false);
      }
    }
    void loadSummary();
  }, [householdId]);

  const hasData = useMemo(() => summary.recent_logs.length > 0, [summary.recent_logs.length]);

  const last7DaysData = useMemo(() => {
    const byDate = new Map(summary.recent_logs.map((r) => [String(r.date), r]));
    const out: Array<{
      day_label: string;
      avg_score: number | undefined;
      dry_kg: number;
      wet_kg: number;
      reject_kg: number;
    }> = [];

    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const row = byDate.get(iso);
      out.push({
        day_label: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        avg_score: row ? Number(row.score) : undefined,
        dry_kg: row ? Number(row.dry) : 0,
        wet_kg: row ? Number(row.wet) : 0,
        reject_kg: row ? Number(row.reject) : 0,
      });
    }
    return out;
  }, [summary.recent_logs]);

  return (
    <div className="space-y-5">
      <CitizenPageHero
        badge="CITIZEN · INSIGHTS"
        title="My Waste Insights"
        subtitle="Track household segregation quality, weekly waste mix, and carbon-based PCC preview."
      />

      <div className="flex justify-end">
        <select
          value={householdId ?? ""}
          onChange={(e) => setHouseholdId(e.target.value ? Number(e.target.value) : null)}
          className="rounded-full border border-white/40 bg-white/70 px-4 py-2 text-sm"
        >
          <option value="">Select household</option>
          {households.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}{h.is_primary ? " (Primary)" : ""}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="surface-card-strong rounded-3xl p-4">
          <p className="text-xs text-slate-500">Average Score</p>
          <p className="text-3xl font-semibold text-slate-900">{summary.avg_score.toFixed(1)}</p>
        </div>
        <div className="surface-card-strong rounded-3xl p-4">
          <p className="text-xs text-slate-500">Dry Total</p>
          <p className="text-3xl font-semibold text-slate-900">{summary.totals.dry_total.toFixed(1)} kg</p>
        </div>
        <div className="surface-card-strong rounded-3xl p-4">
          <p className="text-xs text-slate-500">Wet Total</p>
          <p className="text-3xl font-semibold text-slate-900">{summary.totals.wet_total.toFixed(1)} kg</p>
        </div>
        <div className="surface-card-strong rounded-3xl p-4">
          <p className="text-xs text-slate-500">Estimated PCC (Preview)</p>
          <p className="text-3xl font-semibold text-slate-900">{summary.estimated_pcc_preview.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card-strong rounded-3xl p-4">
          <h3 className="text-lg font-semibold text-slate-900">Score (Last 7 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last7DaysData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day_label" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line
                  type="linear"
                  dataKey="avg_score"
                  stroke="#059669"
                  strokeWidth={2}
                  connectNulls
                  isAnimationActive={false}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card-strong rounded-3xl p-4">
          <h3 className="text-lg font-semibold text-slate-900">Breakdown (Last 7 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7DaysData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day_label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="dry_kg" stackId="a" fill="#34d399" />
                <Bar dataKey="wet_kg" stackId="a" fill="#10b981" />
                <Bar dataKey="reject_kg" stackId="a" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="surface-card-strong rounded-3xl p-5">
        <h3 className="text-xl font-semibold text-slate-900">Recent logs</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                <th className="py-2">Date</th>
                <th>Dry</th>
                <th>Wet</th>
                <th>Reject</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {summary.recent_logs.map((r) => (
                <tr key={`${r.date}-${r.score}`} className="border-t border-white/50">
                  <td className="py-2">{r.date}</td>
                  <td>{r.dry.toFixed(2)} kg</td>
                  <td>{r.wet.toFixed(2)} kg</td>
                  <td>{r.reject.toFixed(2)} kg</td>
                  <td>{r.score.toFixed(1)}</td>
                </tr>
              ))}
              {!loading && !hasData && (
                <tr>
                  <td className="py-5 text-slate-500" colSpan={5}>
                    No logs yet. Submit your first segregation update.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
