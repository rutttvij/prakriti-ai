import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { fetchCitizenSummary, type CitizenSummary } from "../../lib/api";

const DEFAULT_SUMMARY: CitizenSummary = {
  training: {
    completed_modules: 0,
    total_modules: 0,
    badges_earned: 0,
    next_module_title: null,
  },
  segregation: {
    today_status: "UNKNOWN",
    today_score: null,
    streak_days: 0,
  },
  reports: {
    total: 0,
    pending: 0,
    resolved: 0,
  },
  carbon: {
    co2_saved_kg: 0,
    pcc_tokens: 0,
  },
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function statusPill(status: CitizenSummary["segregation"]["today_status"]) {
  switch (status) {
    case "DONE":
      return {
        label: "Done today",
        cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    case "PENDING":
      return {
        label: "Pending today",
        cls: "bg-amber-50 text-amber-700 border-amber-200",
      };
    case "MISSED":
      return {
        label: "Missed today",
        cls: "bg-rose-50 text-rose-700 border-rose-200",
      };
    default:
      return {
        label: "Unknown",
        cls: "bg-slate-50 text-slate-700 border-slate-200",
      };
  }
}

export default function CitizenDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<CitizenSummary>(DEFAULT_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const displayName = useMemo(
    () => user?.full_name || user?.email || "Citizen",
    [user]
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetchCitizenSummary();
        const data = res.data;

        if (!mounted) return;

        setSummary({
          ...DEFAULT_SUMMARY,
          ...data,
          training: { ...DEFAULT_SUMMARY.training, ...(data?.training || {}) },
          segregation: {
            ...DEFAULT_SUMMARY.segregation,
            ...(data?.segregation || {}),
          },
          reports: { ...DEFAULT_SUMMARY.reports, ...(data?.reports || {}) },
          carbon: { ...DEFAULT_SUMMARY.carbon, ...(data?.carbon || {}) },
        });
      } catch (e: any) {
        if (!mounted) return;
        const msg =
          e?.response?.data?.detail ||
          e?.message ||
          "Failed to load dashboard data. Please try again.";
        setError(String(msg));
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const trainingPct = useMemo(() => {
    const total = summary.training.total_modules || 0;
    const done = summary.training.completed_modules || 0;
    if (total <= 0) return 0;
    return clamp(Math.round((done / total) * 100), 0, 100);
  }, [summary.training.completed_modules, summary.training.total_modules]);

  const segScore = summary.segregation.today_score;
  const pill = statusPill(summary.segregation.today_status);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-emerald-800">
            Welcome back, {displayName}
          </h1>
          <p className="text-sm text-slate-500">
            Your personal view of training, segregation, reports, and carbon
            impact.
          </p>

          {error && (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate("/citizen/training")}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
          >
            Go to Training
          </button>
          <button
            onClick={() => navigate("/citizen/report-waste")}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Report Waste
          </button>
          <button
            onClick={() => navigate("/citizen/my-reports")}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            My Reports
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Reports</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {summary.reports.total}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Pending:{" "}
            <span className="font-medium text-slate-700">
              {summary.reports.pending}
            </span>{" "}
            • Resolved:{" "}
            <span className="font-medium text-slate-700">
              {summary.reports.resolved}
            </span>
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">
            Training Progress
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {trainingPct}%
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {summary.training.completed_modules}/
            {summary.training.total_modules} modules •{" "}
            <span className="font-medium text-slate-700">
              {summary.training.badges_earned}
            </span>{" "}
            badges
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">CO₂ Saved</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {summary.carbon.co2_saved_kg.toFixed(2)} kg
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Based on your verified actions and reports.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">PCC Tokens</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {summary.carbon.pcc_tokens.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Earn more by consistent segregation.
          </p>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Training */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-sm font-semibold text-emerald-700">
              Training &amp; Badges
            </h2>
            <button
              onClick={() => navigate("/citizen/training")}
              className="text-xs font-medium text-emerald-700 hover:underline"
            >
              Open
            </button>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Complete mandatory green training and earn recognition.
          </p>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Progress</span>
              <span className="font-medium text-slate-700">{trainingPct}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${trainingPct}%` }}
              />
            </div>

            <div className="mt-3 text-xs text-slate-500">
              Next:{" "}
              <span className="font-medium text-slate-700">
                {summary.training.next_module_title || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Segregation */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-sm font-semibold text-emerald-700">
              Daily Segregation
            </h2>
            <button
              onClick={() => navigate("/citizen/household")}
              className="text-xs font-medium text-emerald-700 hover:underline"
            >
              Open
            </button>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Track segregation quality and support cleaner wards.
          </p>

          <div className="mt-4 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-1 text-xs ${pill.cls}`}
            >
              {pill.label}
            </span>
            <span className="text-xs text-slate-500">
              Streak:{" "}
              <span className="font-medium text-slate-700">
                {summary.segregation.streak_days} days
              </span>
            </span>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Today score</span>
              <span className="font-medium text-slate-700">
                {segScore === null ? "—" : `${clamp(segScore, 0, 100)}/100`}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{
                  width: `${segScore === null ? 0 : clamp(segScore, 0, 100)}%`,
                }}
              />
            </div>

            <button
              onClick={() => navigate("/citizen/household")}
              className="mt-4 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Update Household Segregation
            </button>
          </div>
        </div>

        {/* Carbon */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-sm font-semibold text-emerald-700">
              Carbon &amp; PCC Credits
            </h2>
            <button
              onClick={() => navigate("/citizen/insights")}
              className="text-xs font-medium text-emerald-700 hover:underline"
            >
              Open
            </button>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Each correct action translates to CO₂ savings and PCC tokens.
          </p>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">CO₂ saved</span>
              <span className="font-semibold text-slate-900">
                {summary.carbon.co2_saved_kg.toFixed(2)} kg
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">PCC tokens</span>
              <span className="font-semibold text-slate-900">
                {summary.carbon.pcc_tokens.toFixed(2)}
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate("/citizen/insights")}
            className="mt-4 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            View My Insights
          </button>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
          Loading your dashboard…
        </div>
      )}
    </div>
  );
}
