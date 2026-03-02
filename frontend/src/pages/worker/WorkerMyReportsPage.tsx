import { useEffect, useState } from "react";
import api from "../../lib/api";
import type { WasteReport } from "../../types/wasteReport";

type BulkAssignedJob = {
  pickup_request_id: number;
  waste_log_id: number;
  organization_name?: string | null;
  category: string;
  weight_kg: number;
  status: string;
  scheduled_at?: string | null;
  note?: string | null;
  created_at: string;
};

function formatIST(input: string | Date | null | undefined) {
  if (!input) return "";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export function WorkerMyReportsPage() {
  const [reports, setReports] = useState<WasteReport[]>([]);
  const [bulkJobs, setBulkJobs] = useState<BulkAssignedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingJobId, setActingJobId] = useState<number | null>(null);

  const [verifyJobId, setVerifyJobId] = useState<number | null>(null);
  const [verifyWeight, setVerifyWeight] = useState("");
  const [rejectWeight, setRejectWeight] = useState("0");
  const [verifyNotes, setVerifyNotes] = useState("");
  const [verifyPhoto, setVerifyPhoto] = useState<File | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [reportsRes, jobsRes] = await Promise.all([
        api.get<WasteReport[]>("/waste/reports/assigned/me"),
        api.get("/worker/jobs/assigned"),
      ]);
      setReports(reportsRes.data);
      setBulkJobs(jobsRes.data?.data?.items ?? []);
    } catch (err) {
      console.error(err);
      setError("Failed to load your assigned jobs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  function statusBadgeClass(status: WasteReport["status"]) {
    if (status === "RESOLVED") return "bg-emerald-100 text-emerald-700";
    if (status === "IN_PROGRESS") return "bg-sky-100 text-sky-700";
    return "bg-amber-100 text-amber-700";
  }

  async function updateBulkJobStatus(jobId: number, status: "IN_PROGRESS" | "COMPLETED") {
    try {
      setActingJobId(jobId);
      await api.post(`/worker/jobs/${jobId}/status`, { status });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to update bulk job status.");
    } finally {
      setActingJobId(null);
    }
  }

  async function submitVerification() {
    if (!verifyJobId) return;
    const job = bulkJobs.find((j) => j.pickup_request_id === verifyJobId);
    if (!job) return;

    const vw = Number(verifyWeight);
    const rw = Number(rejectWeight || 0);
    if (!Number.isFinite(vw) || vw <= 0) {
      setError("Verified weight must be greater than 0.");
      return;
    }
    if (!Number.isFinite(rw) || rw < 0) {
      setError("Reject weight must be 0 or greater.");
      return;
    }

    try {
      setActingJobId(verifyJobId);
      const form = new FormData();
      form.append("waste_log_id", String(job.waste_log_id));
      form.append("pickup_request_id", String(job.pickup_request_id));
      form.append("verified_weight_kg", String(vw));
      form.append("reject_weight_kg", String(rw));
      if (verifyNotes.trim()) form.append("notes", verifyNotes.trim());
      if (verifyPhoto) form.append("proof_photo", verifyPhoto);
      await api.post("/worker/verifications", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setVerifyJobId(null);
      setVerifyWeight("");
      setRejectWeight("0");
      setVerifyNotes("");
      setVerifyPhoto(null);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to submit verification.");
    } finally {
      setActingJobId(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-white/20 bg-slate-950/26 p-5 shadow-[0_24px_50px_rgba(5,22,27,0.38)] backdrop-blur-xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/16 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-emerald-100 shadow-sm shadow-emerald-950/30 backdrop-blur-md">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Waste Worker · My Assigned
        </div>
        <h1 className="mt-3 text-4xl font-semibold !text-[#dffaf0]" style={{ color: "#dffaf0" }}>My Assigned Jobs</h1>
        <p className="mt-1 text-sm text-emerald-100">Track assigned citizen reports and bulk pickup workflows.</p>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="surface-card-strong rounded-[1.8rem] px-5 py-4">
        <h2 className="mb-3 text-2xl font-semibold text-slate-900">Bulk Pickup Jobs</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-emerald-100 text-xs uppercase tracking-[0.12em] text-slate-500">
                <th className="px-3 py-2 text-left">Pickup</th>
                <th className="px-3 py-2 text-left">Organization</th>
                <th className="px-3 py-2 text-left">Waste Log</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Loading bulk jobs...</td></tr>
              ) : bulkJobs.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No assigned bulk pickups yet.</td></tr>
              ) : (
                bulkJobs.map((job) => (
                  <tr key={job.pickup_request_id} className="border-b border-emerald-100/70">
                    <td className="px-3 py-2 text-slate-900">#{job.pickup_request_id}</td>
                    <td className="px-3 py-2 text-slate-700">{job.organization_name || "Bulk Org"}</td>
                    <td className="px-3 py-2 text-slate-700">#{job.waste_log_id} · {job.category.replaceAll("_", " ")} · {Number(job.weight_kg || 0).toFixed(1)} kg</td>
                    <td className="px-3 py-2 text-slate-700">{job.status}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button className="btn-secondary px-3 py-1 text-xs" disabled={actingJobId === job.pickup_request_id} onClick={() => updateBulkJobStatus(job.pickup_request_id, "IN_PROGRESS")}>Mark In Progress</button>
                        <button className="btn-secondary px-3 py-1 text-xs" disabled={actingJobId === job.pickup_request_id} onClick={() => updateBulkJobStatus(job.pickup_request_id, "COMPLETED")}>Mark Completed</button>
                        <button className="btn-primary px-3 py-1 text-xs" onClick={() => setVerifyJobId(job.pickup_request_id)}>Verify</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {verifyJobId && (
        <section className="surface-card rounded-[1.8rem] p-5">
          <h3 className="text-lg font-bold text-slate-900">Submit Verification for Pickup #{verifyJobId}</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Verified Weight (kg)</label>
              <input className="ui-input" value={verifyWeight} onChange={(e) => setVerifyWeight(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Reject Weight (kg)</label>
              <input className="ui-input" value={rejectWeight} onChange={(e) => setRejectWeight(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Proof Photo (optional)</label>
              <input className="ui-input" type="file" accept="image/*" onChange={(e) => setVerifyPhoto(e.target.files?.[0] ?? null)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</label>
              <input className="ui-input" value={verifyNotes} onChange={(e) => setVerifyNotes(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="btn-primary" disabled={actingJobId === verifyJobId} onClick={submitVerification}>Submit Verification</button>
            <button className="btn-secondary" onClick={() => setVerifyJobId(null)}>Cancel</button>
          </div>
        </section>
      )}

      <section className="surface-card-strong rounded-[1.8rem] px-5 py-4">
        <h2 className="mb-3 text-2xl font-semibold text-slate-900">Citizen Reports</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-emerald-100 text-xs uppercase tracking-[0.12em] text-slate-500">
                <th className="px-3 py-2 text-left">Report</th>
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-left">Created</th>
                <th className="px-3 py-2 text-left">Resolved</th>
                <th className="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">Loading assigned reports...</td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">No assigned reports yet.</td>
                </tr>
              ) : (
                reports.map((r) => {
                  return (
                    <tr key={r.id} className="border-b border-emerald-100/70">
                      <td className="px-3 py-2 text-slate-900">
                        {r.public_id || `Report #${r.id}`}
                        <div className="text-xs text-slate-500">{r.status.replaceAll("_", " ")}</div>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{r.description || "-"}</td>
                      <td className="px-3 py-2 text-slate-700">{formatIST(r.created_at) || "-"}</td>
                      <td className="px-3 py-2 text-slate-700">{formatIST(r.resolved_at) || "-"}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(r.status)}`}>
                          {r.status.replaceAll("_", " ")}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
