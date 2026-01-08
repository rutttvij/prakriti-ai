import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import type { SegregationLog } from "../../types/segregation";
import type { WasteReport } from "../../types/wasteReport";

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
  waste_report_id?: number;
}

export default function WorkerSegregationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const fromReportHouseholdId = searchParams.get("householdId");
  const fromReportCode = searchParams.get("reportCode");
  const fromReportId = searchParams.get("reportId");

  // Restrict page to waste workers
  if (user && user.role !== "WASTE_WORKER") {
    return (
      <div className="min-h-[60vh] bg-gradient-to-b from-emerald-50/70 to-white flex items-center">
        <div className="max-w-xl mx-auto rounded-2xl border border-emerald-100 bg-white/80 shadow-sm p-6">
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 mb-3">
            Segregation workspace
          </span>
          <h1 className="text-2xl font-semibold text-emerald-900 mb-2">
            Segregation dashboard
          </h1>
          <p className="text-sm text-slate-600">
            This view is meant for registered{" "}
            <span className="font-semibold text-emerald-800">
              Waste Workers
            </span>{" "}
            to log daily segregation quality across households and bulk
            generators. Please switch to a waste worker account or contact your
            city admin if you think this is a mistake.
          </p>
        </div>
      </div>
    );
  }

  const [logs, setLogs] = useState<SegregationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reports for dropdown
  const [myReports, setMyReports] = useState<WasteReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string>(
    () => fromReportId || ""
  );

  const [date, setDate] = useState(() => {
    const t = new Date();
    return t.toISOString().slice(0, 10);
  });

  const [householdId, setHouseholdId] = useState<string>(
    () => fromReportHouseholdId || ""
  );
  const [dryKg, setDryKg] = useState("");
  const [wetKg, setWetKg] = useState("");
  const [rejectKg, setRejectKg] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load worker logs
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

  // Load assigned reports for dropdown
  useEffect(() => {
    async function loadReports() {
      try {
        const res = await api.get<WasteReport[]>("/waste/reports/assigned/me");
        const activeReports = res.data.filter(
          (r) => r.status !== "RESOLVED"
        );
        setMyReports(activeReports);

        // If we came from a job card with ?reportId=, ensure it's selected
        if (fromReportId) {
          const idNum = Number(fromReportId);
          if (!Number.isNaN(idNum)) {
            const exists = activeReports.some((r) => r.id === idNum);
            if (exists) {
              setSelectedReportId(fromReportId);
            }
          }
        }
      } catch (err) {
        console.error(err);
        setReportsError("Failed to load your assigned reports for linking.");
      } finally {
        setReportsLoading(false);
      }
    }

    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedReport = useMemo(
    () =>
      selectedReportId
        ? myReports.find((r) => r.id === Number(selectedReportId)) ?? null
        : null,
    [myReports, selectedReportId]
  );

  // If the URL already has a householdId (coming from a job card),
  // make sure the input is in sync.
  useEffect(() => {
    if (fromReportHouseholdId) {
      setHouseholdId(fromReportHouseholdId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromReportHouseholdId]);

  // When the selected report changes (either from dropdown or deep-link),
  // auto-fill the Site / Household ID from that report.
  useEffect(() => {
    if (selectedReport && selectedReport.household_id) {
      setHouseholdId(String(selectedReport.household_id));
    }
  }, [selectedReport]);

  // Dropdown change handler: update selected report and immediately
  // auto-fill the household/site ID.
  function handleReportChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    setSelectedReportId(value);

    if (!value) {
      // If the worker clears the selection, don't override the existing Site ID
      return;
    }

    const report = myReports.find((r) => r.id === Number(value));
    if (report?.household_id) {
      setHouseholdId(String(report.household_id));
    }
  }

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
      waste_report_id: selectedReport ? selectedReport.id : undefined,
    };

    try {
      setSubmitting(true);
      const res = await api.post<SegregationLog>("/segregation/logs", payload);

      setLogs((prev) => [res.data, ...prev]);
      setDryKg("");
      setWetKg("");
      setRejectKg("");
      setNotes("");

      // If we came here from a specific report/job card, go back after save
      if (fromReportId) {
        navigate(-1);
      }
    } catch (err) {
      console.error(err);
      setError("Could not save segregation log. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const stats = useMemo(() => {
    if (logs.length === 0)
      return { totalLogs: 0, avgScore: 0, uniqueHouseholds: 0 };

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
    <div className="min-h-[70vh] bg-gradient-to-b from-emerald-50/70 to-white -m-4 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 mb-2">
              Waste Worker · Daily Segregation
            </span>
            <h1 className="text-2xl md:text-3xl font-semibold text-emerald-900">
              Segregation dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-600 max-w-2xl">
              Record daily segregation by weight (kg). Every compliant log
              boosts your PCC rewards and helps your city track real-time
              carbon savings.
            </p>
          </div>
        </div>

        {/* Context banner if coming from a report */}
        {fromReportCode && (
          <div className="max-w-6xl mx-auto -mt-2">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-2.5 text-xs text-emerald-900 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-semibold">
                  Logging segregation for report:
                </span>{" "}
                <span className="font-mono text-emerald-700">
                  {fromReportCode}
                </span>
                {fromReportHouseholdId && (
                  <>
                    {" "}
                    · Site ID{" "}
                    <span className="font-mono">{fromReportHouseholdId}</span>
                  </>
                )}
              </div>
              {fromReportId && (
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="underline decoration-emerald-400 decoration-2 underline-offset-2 text-[11px]"
                >
                  Back to report
                </button>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-100/80 bg-white/80 shadow-md shadow-emerald-100/70 backdrop-blur-sm p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Total logs
            </p>
            <p className="mt-2 text-3xl font-semibold text-emerald-900">
              {stats.totalLogs}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Across all households you&apos;ve covered.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-emerald-50 to-white shadow-md shadow-emerald-100/70 backdrop-blur-sm p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Avg segregation score
            </p>
            <p className="mt-2 text-3xl font-semibold text-emerald-900">
              {stats.avgScore}%
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Average quality based on your recent logs.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100/80 bg-white/80 shadow-md shadow-emerald-100/70 backdrop-blur-sm p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Unique sites covered
            </p>
            <p className="mt-2 text-3xl font-semibold text-emerald-900">
              {stats.uniqueHouseholds}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Households / bulk generators you&apos;ve visited.
            </p>
          </div>
        </div>

        {/* Form + Chart */}
        <div className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-emerald-100 bg-white/90 shadow-sm p-5 space-y-4"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-emerald-900">
                Record today&apos;s segregation
              </h2>
              <p className="text-[11px] text-slate-500">
                All weights are in kilograms (kg)
              </p>
            </div>

            {/* Report dropdown */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Link to a report (optional)
              </label>
              <select
                value={selectedReportId}
                onChange={handleReportChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
              >
                <option value="">
                  No specific report &mdash; just log by Site ID
                </option>
                {myReports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.public_id ?? `Report #${r.id}`} ·{" "}
                    {r.status.replace("_", " ")}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                Selecting a report will auto-fill the Site ID (if linked) and
                connect this log to that complaint.
              </p>
              {reportsLoading && (
                <p className="text-[11px] text-slate-500">
                  Loading your assigned reports…
                </p>
              )}
              {reportsError && (
                <p className="text-[11px] text-red-500">{reportsError}</p>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Household / Site ID
                </label>
                <input
                  type="text"
                  value={householdId}
                  onChange={(e) => setHouseholdId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                  placeholder="e.g. 101"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Dry (kg)
                </label>
                <input
                  type="number"
                  value={dryKg}
                  onChange={(e) => setDryKg(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Wet (kg)
                </label>
                <input
                  type="number"
                  value={wetKg}
                  onChange={(e) => setWetKg(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reject (kg)
                </label>
                <input
                  type="number"
                  value={rejectKg}
                  onChange={(e) => setRejectKg(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                placeholder="Missed pickup, contamination notes, building name…"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-[11px] text-slate-500">
                Logs are locked after 24 hours to keep the data trusted.
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-emerald-50 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {submitting ? "Saving…" : "Save log"}
              </button>
            </div>
          </form>

          {/* Chart */}
          <div className="rounded-2xl border border-emerald-100 bg-white/90 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-emerald-900 mb-2">
              14-day compliance trend
            </h2>

            {trendData.length === 0 ? (
              <div className="rounded-xl border border-dashed border-emerald-100 bg-emerald-50/60 px-4 py-6 text-center">
                <p className="text-xs font-medium text-emerald-800">
                  No logs yet.
                </p>
                <p className="mt-1 text-xs text-emerald-700/80">
                  Start recording today&apos;s segregation to see how your
                  route&apos;s quality improves over time.
                </p>
              </div>
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
        <div className="rounded-2xl border border-emerald-100 bg-white/90 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h2 className="text-sm font-semibold text-emerald-900">
              Recent logs
            </h2>
            <p className="text-[11px] text-slate-500">
              Showing your last {Math.min(logs.length, 20)} entries
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-slate-600">Loading your logs…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-slate-500">
              No logs recorded yet. Use the form above to add your first
              segregation entry for today.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-full text-sm">
                <thead className="bg-emerald-50/80">
                  <tr className="border-b border-emerald-100 text-xs text-slate-600">
                    <th className="py-2.5 pr-4 pl-4 text-left font-medium">
                      Date
                    </th>
                    <th className="py-2.5 px-4 text-left font-medium">
                      Household / Site
                    </th>
                    <th className="py-2.5 px-4 text-right font-medium">
                      Dry (kg)
                    </th>
                    <th className="py-2.5 px-4 text-right font-medium">
                      Wet (kg)
                    </th>
                    <th className="py-2.5 px-4 text-right font-medium">
                      Reject (kg)
                    </th>
                    <th className="py-2.5 pr-4 pl-4 text-right font-medium">
                      Score
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {logs.slice(0, 20).map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-emerald-50/40 transition-colors"
                    >
                      <td className="py-2.5 pr-4 pl-4 text-slate-700">
                        {log.log_date}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700">
                        {log.household_id}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-700">
                        {log.dry_kg.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-700">
                        {log.wet_kg.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-700">
                        {log.reject_kg.toFixed(1)}
                      </td>
                      <td className="py-2.5 pr-4 pl-4 text-right">
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
    </div>
  );
}
