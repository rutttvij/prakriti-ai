import { useEffect, useState } from "react";

import { exportAdminPccTransactionsCsv, fetchAdminPccTransactions } from "../../lib/api";
import type { AdminPccTransaction, AdminPccTransactionsResponse } from "../../lib/types";
import { useToast } from "../../components/ui/Toast";

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function PccTokensPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<AdminPccTransactionsResponse | null>(null);
  const [rows, setRows] = useState<AdminPccTransaction[]>([]);
  const [filters, setFilters] = useState({ date_from: "", date_to: "", user_id: "", type: "" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminPccTransactions({
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        user_id: filters.user_id ? Number(filters.user_id) : undefined,
        type: filters.type || undefined,
        page: 1,
        page_size: 100,
      });
      setSummary(res);
      setRows(res.items || []);
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to load PCC transactions.");
    } finally {
      setLoading(false);
    }
  };

  const onExport = async () => {
    try {
      const csv = await exportAdminPccTransactionsCsv({
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        user_id: filters.user_id ? Number(filters.user_id) : undefined,
        type: filters.type || undefined,
      });
      downloadCsv("pcc-transactions.csv", csv);
      push("success", "CSV exported.");
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to export CSV.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="surface-card-strong rounded-2xl p-4"><p className="text-xs text-slate-500">Total Credited</p><p className="text-2xl font-bold text-slate-900">{summary?.total_credited?.toFixed(2) ?? "0.00"}</p></div>
        <div className="surface-card-strong rounded-2xl p-4"><p className="text-xs text-slate-500">Total Debited</p><p className="text-2xl font-bold text-slate-900">{summary?.total_debited?.toFixed(2) ?? "0.00"}</p></div>
        <div className="surface-card-strong rounded-2xl p-4"><p className="text-xs text-slate-500">Net PCC</p><p className="text-2xl font-bold text-slate-900">{summary?.net_pcc?.toFixed(2) ?? "0.00"}</p></div>
        <div className="surface-card-strong rounded-2xl p-4"><p className="text-xs text-slate-500">Transactions</p><p className="text-2xl font-bold text-slate-900">{summary?.transactions_count ?? 0}</p></div>
      </section>

      <section className="surface-card-strong rounded-3xl p-4 sm:p-5">
        <div className="grid gap-2 md:grid-cols-6">
          <input type="datetime-local" className="ui-input" value={filters.date_from} onChange={(e) => setFilters((p) => ({ ...p, date_from: e.target.value }))} />
          <input type="datetime-local" className="ui-input" value={filters.date_to} onChange={(e) => setFilters((p) => ({ ...p, date_to: e.target.value }))} />
          <input className="ui-input" placeholder="User ID" value={filters.user_id} onChange={(e) => setFilters((p) => ({ ...p, user_id: e.target.value }))} />
          <select className="ui-input" value={filters.type} onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))}>
            <option value="">All types</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
          </select>
          <button className="btn-primary" onClick={load} disabled={loading}>{loading ? "Loading..." : "Apply"}</button>
          <button className="btn-secondary" onClick={onExport}>Export CSV</button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-emerald-100 text-xs uppercase tracking-[0.12em] text-slate-500">
                <th className="px-2 py-2 text-left">ID</th>
                <th className="px-2 py-2 text-left">User</th>
                <th className="px-2 py-2 text-left">Type</th>
                <th className="px-2 py-2 text-left">Amount</th>
                <th className="px-2 py-2 text-left">Reason</th>
                <th className="px-2 py-2 text-left">Reference</th>
                <th className="px-2 py-2 text-left">Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-emerald-100/70">
                  <td className="px-2 py-2">{r.id}</td>
                  <td className="px-2 py-2">{r.user_id || "-"}</td>
                  <td className="px-2 py-2 uppercase">{r.type}</td>
                  <td className="px-2 py-2">{r.amount_pcc.toFixed(2)}</td>
                  <td className="px-2 py-2">{r.reason || "-"}</td>
                  <td className="px-2 py-2">{r.ref_type && r.ref_id ? `${r.ref_type} #${r.ref_id}` : "-"}</td>
                  <td className="px-2 py-2">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-2 py-5 text-center text-slate-500">No transactions found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
