import { useEffect, useState } from "react";

import {
  assignAdminWorkforceZone,
  createAdminWorkforce,
  fetchAdminWorkforce,
  fetchAdminZones,
  updateAdminWorkforce,
} from "../../lib/api";
import type { AdminWorkforceUser, AdminZone } from "../../lib/types";
import { useToast } from "../../components/ui/Toast";

export default function WorkforcePage() {
  const { push } = useToast();
  const [rows, setRows] = useState<AdminWorkforceUser[]>([]);
  const [zones, setZones] = useState<AdminZone[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", zone_id: "" });

  const load = async () => {
    try {
      const [w, z] = await Promise.all([fetchAdminWorkforce({ q: q || undefined }), fetchAdminZones({ active: true })]);
      setRows(w || []);
      setZones(z || []);
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to load workforce.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const create = async () => {
    try {
      await createAdminWorkforce({
        name: form.name,
        email: form.email,
        password: form.password,
        zone_id: form.zone_id ? Number(form.zone_id) : null,
      });
      push("success", "Worker created.");
      setForm({ name: "", email: "", password: "", zone_id: "" });
      await load();
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to create worker.");
    }
  };

  const toggleActive = async (row: AdminWorkforceUser) => {
    try {
      await updateAdminWorkforce(row.user_id, { is_active: !row.is_active });
      push("success", "Worker status updated.");
      await load();
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to update worker.");
    }
  };

  const assignZone = async (userId: number, zoneId: string) => {
    try {
      await assignAdminWorkforceZone(userId, zoneId ? Number(zoneId) : null);
      push("success", "Zone assigned.");
      await load();
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to assign zone.");
    }
  };

  return (
    <div className="space-y-4">
      <section className="surface-card-strong rounded-3xl p-4 sm:p-5">
        <h2 className="text-base font-semibold text-slate-900">Create Workforce User</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <input className="ui-input" placeholder="Full name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <input className="ui-input" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          <input className="ui-input" type="password" placeholder="Temporary password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
          <select className="ui-input" value={form.zone_id} onChange={(e) => setForm((p) => ({ ...p, zone_id: e.target.value }))}>
            <option value="">Unassigned</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex gap-2">
          <button className="btn-primary" onClick={create}>Create Worker</button>
          <input className="ui-input max-w-xs" placeholder="Search workforce" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </section>

      <section className="surface-card-strong rounded-3xl p-4 sm:p-5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-emerald-100 text-xs uppercase tracking-[0.12em] text-slate-500">
                <th className="px-2 py-2 text-left">Name</th>
                <th className="px-2 py-2 text-left">Email</th>
                <th className="px-2 py-2 text-left">Zone</th>
                <th className="px-2 py-2 text-left">Status</th>
                <th className="px-2 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.user_id} className="border-b border-emerald-100/70">
                  <td className="px-2 py-2 text-slate-900">{row.full_name || "-"}</td>
                  <td className="px-2 py-2 text-slate-700">{row.email}</td>
                  <td className="px-2 py-2">
                    <select
                      className="ui-input h-9 py-1"
                      value={row.zone_id || ""}
                      onChange={(e) => assignZone(row.user_id, e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>{z.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2 text-slate-700">{row.is_active ? "active" : "inactive"}</td>
                  <td className="px-2 py-2">
                    <button className="btn-secondary px-3 py-1 text-xs" onClick={() => toggleActive(row)}>
                      {row.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-2 py-5 text-center text-slate-500">No workforce users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
