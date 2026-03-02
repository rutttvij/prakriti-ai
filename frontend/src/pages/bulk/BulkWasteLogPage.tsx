import { type FormEvent, useEffect, useState } from "react";
import api from "../../lib/api";

type WasteLog = {
  id: number;
  category: string;
  weight_kg: number;
  status: string;
  notes?: string | null;
  logged_at: string;
};

const CATEGORIES = ["PLASTIC", "PAPER", "GLASS", "METAL", "WET", "E_WASTE", "HAZARDOUS", "TEXTILE", "MIXED"];

export default function BulkWasteLogPage() {
  const [category, setCategory] = useState("PLASTIC");
  const [weightKg, setWeightKg] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [logs, setLogs] = useState<WasteLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const loadLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await api.get("/bulk/waste-logs", { params: { limit: 25 } });
      const items = res.data?.data?.items ?? res.data?.data?.waste_logs ?? [];
      setLogs(items);
    } catch {
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const parsedWeight = parseFloat(weightKg);
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setError("Enter a valid weight in kg.");
      return;
    }

    const form = new FormData();
    form.append("category", category);
    form.append("weight_kg", String(parsedWeight));
    if (notes.trim()) form.append("notes", notes.trim());
    if (photo) form.append("photo", photo);

    try {
      setSaving(true);
      await api.post("/bulk/waste-logs", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess("Waste log created successfully.");
      setWeightKg("");
      setNotes("");
      setPhoto(null);
      await loadLogs();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.detail || "Failed to create waste log.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-white/20 bg-slate-950/26 p-5 shadow-[0_24px_50px_rgba(5,22,27,0.38)] backdrop-blur-xl">
        <h1 className="text-4xl font-semibold !text-[#dffaf0]" style={{ color: "#dffaf0" }}>Log Waste</h1>
        <p className="mt-1 text-sm text-emerald-100">Create bulk waste logs and move each log through pickup and verification.</p>
      </section>

      <div className="surface-card-strong p-4 text-xs text-slate-600">
        Status flow: <span className="font-semibold text-slate-800">LOGGED</span> → <span className="font-semibold text-slate-800">PICKUP_REQUESTED</span> → <span className="font-semibold text-slate-800">PICKED_UP</span> → <span className="font-semibold text-slate-800">VERIFIED</span> → <span className="font-semibold text-slate-800">CREDITED</span>
      </div>

      <form onSubmit={submit} className="surface-card p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Category</label>
            <select className="ui-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.replaceAll("_", " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Weight (kg)</label>
            <input className="ui-input" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="e.g. 42.5" />
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Photo (optional)</label>
            <input className="ui-input" type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Notes (optional)</label>
            <input className="ui-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Pickup notes or context" />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        {success && <p className="mt-3 text-sm text-emerald-700">{success}</p>}

        <button className="btn-primary mt-4" disabled={saving}>
          {saving ? "Saving..." : "Create Waste Log"}
        </button>
      </form>

      <div className="surface-card p-5">
        <h2 className="text-xl font-bold text-slate-900">Recent Logs</h2>
        {loadingLogs ? (
          <p className="mt-3 text-sm text-slate-500">Loading logs...</p>
        ) : logs.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No logs yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Weight</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Logged At</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 text-slate-700">
                    <td className="py-2 pr-3 font-semibold">#{log.id}</td>
                    <td className="py-2 pr-3">{log.category.replaceAll("_", " ")}</td>
                    <td className="py-2 pr-3">{Number(log.weight_kg || 0).toFixed(2)} kg</td>
                    <td className="py-2 pr-3">{log.status}</td>
                    <td className="py-2 pr-3">{new Date(log.logged_at).toLocaleString()}</td>
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
