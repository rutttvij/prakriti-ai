import { useEffect, useState } from "react";
import api from "../../lib/api";
import {
  fetchAdminDemoRequest,
  fetchAdminDemoRequests,
  updateAdminDemoRequest,
} from "../../lib/api";
import type { DemoRequest, DemoRequestOrgType, DemoRequestStatus } from "../../lib/types";

const STATUS_OPTIONS: DemoRequestStatus[] = ["new", "contacted", "qualified", "closed"];
const ORG_TYPES: DemoRequestOrgType[] = ["city", "campus", "society", "corporate"];

export const AdminDemoRequestsPage: React.FC = () => {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const [orgType, setOrgType] = useState<string>("");

  const [rows, setRows] = useState<DemoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<DemoRequest | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminDemoRequests({
        q: q || undefined,
        status: status || undefined,
        org_type: orgType || undefined,
        page: 1,
        page_size: 100,
      });
      setRows(res.items || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load demo requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetails = async (id: number) => {
    setSelectedId(id);
    try {
      const item = await fetchAdminDemoRequest(id);
      setSelected(item);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load request details.");
    }
  };

  const saveDetails = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await updateAdminDemoRequest(selected.id, {
        status: selected.status,
        admin_notes: selected.admin_notes || "",
      });
      setSelected(updated);
      setRows((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to save request.");
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = async () => {
    try {
      const res = await api.get<string>("/admin/demo-requests/export.csv", {
        params: {
          q: q || undefined,
          status: status || undefined,
          org_type: orgType || undefined,
        },
        responseType: "text",
      });
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "demo-requests.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to export CSV.");
    }
  };

  return (
    <div className="relative space-y-5">
      <header className="rounded-3xl border border-white/20 bg-slate-950/26 p-5 shadow-[0_24px_50px_rgba(5,22,27,0.38)] backdrop-blur-xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/16 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-emerald-100 shadow-sm shadow-emerald-950/30 backdrop-blur-md">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Super Admin · Demo Requests
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight !text-[#dffaf0]" style={{ color: "#dffaf0" }}>
          Demo requests inbox
        </h1>
        <p className="mt-1 text-sm text-emerald-100">Review, qualify and close incoming demo requests.</p>
      </header>

      <section className="surface-card-strong rounded-[1.6rem] px-4 py-4">
        <div className="grid gap-3 md:grid-cols-4">
          <input className="ui-input" placeholder="Search name / org / email" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="ui-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className="ui-input" value={orgType} onChange={(e) => setOrgType(e.target.value)}>
            <option value="">All org types</option>
            {ORG_TYPES.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button className="btn-secondary w-full" onClick={load}>Apply</button>
            <button className="btn-primary w-full" onClick={exportCsv}>Export</button>
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</div>}

      <section className="surface-card-strong rounded-[1.8rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs sm:text-sm">
            <thead className="bg-white/30 border-b border-emerald-100">
              <tr className="text-[0.7rem] text-slate-600">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Organization</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">Loading requests...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No demo requests found.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-emerald-100/60 bg-white/40 hover:bg-emerald-50/50 cursor-pointer" onClick={() => openDetails(r.id)}>
                    <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                    <td className="px-4 py-3 text-slate-700">{r.organization}</td>
                    <td className="px-4 py-3 text-slate-700 capitalize">{r.org_type}</td>
                    <td className="px-4 py-3 text-emerald-700">{r.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-800 capitalize">{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedId && selected && (
        <div className="fixed inset-0 z-[70] bg-slate-950/35 p-4" onClick={() => setSelectedId(null)}>
          <div className="ml-auto h-full w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
            <div className="surface-card-strong h-full rounded-3xl p-5 overflow-y-auto">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-slate-900">Demo request #{selected.id}</h3>
                <button className="btn-secondary px-3 py-1 text-xs" onClick={() => setSelectedId(null)}>Close</button>
              </div>

              <div className="mt-4 grid gap-3 text-sm">
                <div><span className="text-slate-500">Name:</span> <span className="font-medium text-slate-900">{selected.name}</span></div>
                <div><span className="text-slate-500">Organization:</span> <span className="font-medium text-slate-900">{selected.organization}</span></div>
                <div><span className="text-slate-500">Email:</span> <span className="font-medium text-emerald-700">{selected.email}</span></div>
                <div><span className="text-slate-500">Phone:</span> <span className="font-medium text-slate-900">{selected.phone || "—"}</span></div>
                <div><span className="text-slate-500">Message:</span> <p className="mt-1 rounded-xl bg-white/60 p-3 text-slate-700">{selected.message || "—"}</p></div>
                <div><span className="text-slate-500">Created:</span> <span className="font-medium text-slate-900">{new Date(selected.created_at).toLocaleString()}</span></div>
              </div>

              <div className="mt-4 space-y-2">
                <label className="block text-xs font-medium text-slate-600">Status</label>
                <select className="ui-input" value={selected.status} onChange={(e) => setSelected((p) => (p ? { ...p, status: e.target.value as DemoRequestStatus } : p))}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <label className="mt-3 block text-xs font-medium text-slate-600">Admin notes</label>
                <textarea
                  className="ui-input min-h-[120px]"
                  value={selected.admin_notes || ""}
                  onChange={(e) => setSelected((p) => (p ? { ...p, admin_notes: e.target.value } : p))}
                />

                <button className="btn-primary mt-2 w-full" onClick={saveDetails} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDemoRequestsPage;
