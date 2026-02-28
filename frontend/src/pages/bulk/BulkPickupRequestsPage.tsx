import { type FormEvent, useEffect, useState } from "react";
import api from "../../lib/api";

type Pickup = {
  id: number;
  waste_log_id: number;
  status: string;
  scheduled_at?: string | null;
  status_note?: string | null;
  created_at: string;
};

export default function BulkPickupRequestsPage() {
  const [wasteLogId, setWasteLogId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [requests, setRequests] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/bulk/pickup-requests", { params: { limit: 25 } });
      setRequests(res.data?.data?.pickup_requests ?? []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const parsedLogId = parseInt(wasteLogId, 10);
    if (!Number.isFinite(parsedLogId) || parsedLogId <= 0) {
      setError("Enter a valid waste log ID.");
      return;
    }

    try {
      setSaving(true);
      await api.post("/bulk/pickup-request", {
        waste_log_id: parsedLogId,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        note: note.trim() || null,
      });
      setSuccess("Pickup request created.");
      setWasteLogId("");
      setScheduledAt("");
      setNote("");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.detail || "Failed to create pickup request.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Pickup Requests</h1>
        <p className="mt-1 text-sm text-slate-600">Request pickups against waste logs and track operational progress.</p>
      </div>

      <form onSubmit={submit} className="surface-card p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Waste Log ID</label>
            <input className="ui-input" value={wasteLogId} onChange={(e) => setWasteLogId(e.target.value)} placeholder="e.g. 101" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Scheduled At (optional)</label>
            <input className="ui-input" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Note</label>
            <input className="ui-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any pickup instruction" />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        {success && <p className="mt-3 text-sm text-emerald-700">{success}</p>}

        <button className="btn-primary mt-4" disabled={saving}>{saving ? "Creating..." : "Create Pickup Request"}</button>
      </form>

      <div className="surface-card p-5">
        <h2 className="text-xl font-bold text-slate-900">Recent Pickup Requests</h2>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Loading requests...</p>
        ) : requests.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No pickup requests found.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">Waste Log</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Scheduled</th>
                  <th className="py-2 pr-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} className="border-b border-slate-100 text-slate-700">
                    <td className="py-2 pr-3 font-semibold">#{req.id}</td>
                    <td className="py-2 pr-3">#{req.waste_log_id}</td>
                    <td className="py-2 pr-3">{req.status}</td>
                    <td className="py-2 pr-3">{req.scheduled_at ? new Date(req.scheduled_at).toLocaleString() : "—"}</td>
                    <td className="py-2 pr-3">{new Date(req.created_at).toLocaleString()}</td>
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
