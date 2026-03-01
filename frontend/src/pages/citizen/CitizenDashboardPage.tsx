import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CitizenPageHero from "../../components/citizen/CitizenPageHero";
import {
  fetchCitizenPccSummary,
  fetchCitizenSummary,
  fetchCitizenTrainingSummary,
  fetchCitizenWasteReports,
} from "../../lib/api";
import type { CitizenPccSummary, CitizenTrainingSummary } from "../../lib/types";

const EMPTY_PCC: CitizenPccSummary = {
  total_credited: 0,
  total_debited: 0,
  net_pcc: 0,
  co2_saved_kg: 0,
};

const EMPTY_TRAINING: CitizenTrainingSummary = {
  total_modules_published: 0,
  completed_count: 0,
  progress_percent: 0,
  badges_count: 0,
  next_module: null,
  badges: [],
};

export default function CitizenDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reportsCount, setReportsCount] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);
  const [resolvedReports, setResolvedReports] = useState(0);
  const [training, setTraining] = useState<CitizenTrainingSummary>(EMPTY_TRAINING);
  const [pcc, setPcc] = useState<CitizenPccSummary>(EMPTY_PCC);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [summary, reports, trainingSummary, pccSummary] = await Promise.all([
          fetchCitizenSummary(),
          fetchCitizenWasteReports(),
          fetchCitizenTrainingSummary(),
          fetchCitizenPccSummary(),
        ]);

        const pending = reports.filter((r) => r.status !== "resolved").length;
        setReportsCount(reports.length);
        setPendingReports(pending);
        setResolvedReports(reports.length - pending);
        setTraining(trainingSummary);
        setPcc(pccSummary);

        if (summary?.data?.reports) {
          setReportsCount(summary.data.reports.total ?? reports.length);
          setPendingReports(summary.data.reports.pending ?? pending);
          setResolvedReports(summary.data.reports.resolved ?? reports.length - pending);
        }
      } catch (e: any) {
        setError(e?.response?.data?.detail || "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const trainingPercent = useMemo(() => (training.total_modules_published ? (training.completed_count / training.total_modules_published) * 100 : 0), [training]);

  return (
    <div className="space-y-5">
      <CitizenPageHero
        badge="CITIZEN · CITY CONTROL"
        title="Citizen Dashboard"
        subtitle="Overview of reports, training progress, and PCC impact."
        actions={
          <>
            <button className="btn-secondary" onClick={() => navigate("/training")}>Go to Training</button>
            <button className="btn-secondary" onClick={() => navigate("/waste/report")}>Report Waste</button>
            <button className="btn-secondary" onClick={() => navigate("/waste/my-reports")}>My Reports</button>
          </>
        }
      />

      {error && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="surface-card-strong rounded-3xl p-4">
          <p className="text-xs text-slate-500">Reports</p>
          <p className="text-3xl font-semibold text-slate-900">{reportsCount}</p>
          <p className="text-xs text-slate-500">Pending: {pendingReports} · Resolved: {resolvedReports}</p>
        </div>
        <div className="surface-card-strong rounded-3xl p-4">
          <p className="text-xs text-slate-500">Training Progress</p>
          <p className="text-3xl font-semibold text-slate-900">{trainingPercent.toFixed(0)}%</p>
          <p className="text-xs text-slate-500">{training.completed_count}/{training.total_modules_published} modules</p>
        </div>
        <div className="surface-card-strong rounded-3xl p-4">
          <p className="text-xs text-slate-500">CO₂ Saved</p>
          <p className="text-3xl font-semibold text-slate-900">{pcc.co2_saved_kg.toFixed(2)} kg</p>
        </div>
        <div className="surface-card-strong rounded-3xl p-4">
          <p className="text-xs text-slate-500">PCC Tokens</p>
          <p className="text-3xl font-semibold text-slate-900">{pcc.net_pcc.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="surface-card-strong rounded-3xl p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Training</h3>
            <button className="text-xs text-emerald-700" onClick={() => navigate("/training")}>Open</button>
          </div>
          <p className="mt-2 text-sm text-slate-600">Next module: {training.next_module?.title || "All complete"}</p>
        </div>
        <div className="surface-card-strong rounded-3xl p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Report Waste Flow</h3>
            <button className="text-xs text-emerald-700" onClick={() => navigate("/waste/report")}>Open</button>
          </div>
          <p className="mt-2 text-sm text-slate-600">Upload image file, analyze with AI, then submit report.</p>
          <button className="btn-secondary mt-3 w-full" onClick={() => navigate("/waste/report")}>Create New Waste Report</button>
        </div>
        <div className="surface-card-strong rounded-3xl p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Insights</h3>
            <button className="text-xs text-emerald-700" onClick={() => navigate("/insights")}>Open</button>
          </div>
          <p className="mt-2 text-sm text-slate-600">Track segregation score and weekly waste mix.</p>
          <button className="btn-primary mt-3 w-full" onClick={() => navigate("/insights")}>View My Insights</button>
        </div>
      </div>

      {loading && <div className="surface-card-strong rounded-xl p-3 text-sm text-slate-600">Loading dashboard...</div>}
    </div>
  );
}
