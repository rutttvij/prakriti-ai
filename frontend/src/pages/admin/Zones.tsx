import { useEffect, useState } from "react";

import { createAdminZone, deleteAdminZone, fetchAdminZones, updateAdminZone } from "../../lib/api";
import type { AdminZone } from "../../lib/types";
import { useToast } from "../../components/ui/Toast";

const EMPTY_FORM = { name: "", type: "ward", city: "", active: true };

export default function ZonesPage() {
  const { push } = useToast();
  const [rows, setRows] = useState<AdminZone[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = async () => {
    try {
      const res = await fetchAdminZones();
      setRows(res || []);
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to load zones.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    try {
      if (editingId) {
        await updateAdminZone(editingId, form);
        push("success", "Zone updated.");
      } else {
        await createAdminZone(form);
        push("success", "Zone created.");
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      await load();
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to save zone.");
    }
  };

  const remove = async (id: number) => {
    try {
      await deleteAdminZone(id);
      push("success", "Zone deleted.");
      await load();
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to delete zone.");
    }
  };

  return (
    <div className="space-y-4">
      <section className="surface-card-strong rounded-3xl p-4 sm:p-5">
        <h2 className="text-base font-semibold text-slate-900">Create / Edit Zone</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <input className="ui-input" placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <select className="ui-input" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
            <option value="ward">Ward</option>
            <option value="zone">Zone</option>
            <option value="campus">Campus</option>
          </select>
          <input className="ui-input" placeholder="City" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
          <label className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-white/60 px-3 text-sm text-slate-700">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} />
            Active
          </label>
        </div>
        <button className="btn-primary mt-3" onClick={save}>{editingId ? "Update zone" : "Create zone"}</button>
      </section>

      <section className="surface-card-strong rounded-3xl p-4 sm:p-5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-emerald-100 text-xs uppercase tracking-[0.12em] text-slate-500">
                <th className="px-2 py-2 text-left">Name</th>
                <th className="px-2 py-2 text-left">Type</th>
                <th className="px-2 py-2 text-left">City</th>
                <th className="px-2 py-2 text-left">Status</th>
                <th className="px-2 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-emerald-100/70">
                  <td className="px-2 py-2 text-slate-900">{row.name}</td>
                  <td className="px-2 py-2 text-slate-700">{row.type}</td>
                  <td className="px-2 py-2 text-slate-700">{row.city}</td>
                  <td className="px-2 py-2 text-slate-700">{row.active ? "active" : "inactive"}</td>
                  <td className="px-2 py-2">
                    <div className="flex gap-2">
                      <button className="btn-secondary px-3 py-1 text-xs" onClick={() => { setEditingId(row.id); setForm({ name: row.name, type: row.type, city: row.city, active: row.active }); }}>
                        Edit
                      </button>
                      <button className="btn-secondary px-3 py-1 text-xs" onClick={() => remove(row.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-2 py-5 text-center text-slate-500">No zones found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
