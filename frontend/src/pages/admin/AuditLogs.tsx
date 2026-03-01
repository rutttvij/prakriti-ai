import { useEffect, useState } from "react";

import { fetchAdminAuditLogs } from "../../lib/api";
import type { AdminAuditLog } from "../../lib/types";
import { useToast } from "../../components/ui/Toast";

export default function AuditLogsPage() {
  const { push } = useToast();
  const [rows, setRows] = useState<AdminAuditLog[]>([]);
  const [filters, setFilters] = useState({ actor: "", action: "", entity: "", date_from: "", date_to: "" });

  const load = async () => {
    try {
      const res = await fetchAdminAuditLogs({
        actor: filters.actor || undefined,
        action: filters.action || undefined,
        entity: filters.entity || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        page: 1,
        page_size: 100,
      });
      setRows(res.items || []);
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to load audit logs.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <section className="surface-card-strong rounded-3xl p-4 sm:p-5">
        <div className="grid gap-2 md:grid-cols-5">
          <input className="ui-input" placeholder="Actor email" value={filters.actor} onChange={(e) => setFilters((p) => ({ ...p, actor: e.target.value }))} />
          <input className="ui-input" placeholder="Action" value={filters.action} onChange={(e) => setFilters((p) => ({ ...p, action: e.target.value }))} />
          <input className="ui-input" placeholder="Entity" value={filters.entity} onChange={(e) => setFilters((p) => ({ ...p, entity: e.target.value }))} />
          <input type="datetime-local" className="ui-input" value={filters.date_from} onChange={(e) => setFilters((p) => ({ ...p, date_from: e.target.value }))} />
          <input type="datetime-local" className="ui-input" value={filters.date_to} onChange={(e) => setFilters((p) => ({ ...p, date_to: e.target.value }))} />
        </div>
        <button className="btn-primary mt-3" onClick={load}>Apply Filters</button>
      </section>

      <section className="surface-card-strong rounded-3xl p-4 sm:p-5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-emerald-100 text-xs uppercase tracking-[0.12em] text-slate-500">
                <th className="px-2 py-2 text-left">Time</th>
                <th className="px-2 py-2 text-left">Actor</th>
                <th className="px-2 py-2 text-left">Action</th>
                <th className="px-2 py-2 text-left">Entity</th>
                <th className="px-2 py-2 text-left">Entity ID</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-emerald-100/70">
                  <td className="px-2 py-2">{new Date(row.created_at).toLocaleString()}</td>
                  <td className="px-2 py-2">{row.actor_email || "system"}</td>
                  <td className="px-2 py-2">{row.action}</td>
                  <td className="px-2 py-2">{row.entity}</td>
                  <td className="px-2 py-2">{row.entity_id || "-"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-2 py-5 text-center text-slate-500">No audit logs found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
