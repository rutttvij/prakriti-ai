import { useEffect, useState } from "react";

import { fetchAdminAnalyticsSummary } from "../../lib/api";
import type { AdminAnalyticsSummary } from "../../lib/types";

export default function DashboardPage() {
  const [data, setData] = useState<AdminAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchAdminAnalyticsSummary();
        setData(res);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const kpi = data?.kpis;

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Users", kpi?.total_users],
          ["Pending Approvals", kpi?.pending_approvals],
          ["Workforce", kpi?.workforce_count],
          ["Unread Contacts", kpi?.unread_contact_messages],
        ].map(([label, value]) => (
          <div key={label as string} className="surface-card-strong rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label as string}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{loading ? "..." : value ?? 0}</p>
          </div>
        ))}
      </section>

      <section className="surface-card-strong rounded-3xl p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-emerald-100 text-xs uppercase tracking-[0.12em] text-slate-500">
                <th className="px-2 py-2 text-left">Type</th>
                <th className="px-2 py-2 text-left">Title</th>
                <th className="px-2 py-2 text-left">Details</th>
                <th className="px-2 py-2 text-left">Time</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recent_activity || []).map((row) => (
                <tr key={`${row.kind}-${row.id}-${row.created_at}`} className="border-b border-emerald-100/70">
                  <td className="px-2 py-2 capitalize text-slate-600">{row.kind.replace("_", " ")}</td>
                  <td className="px-2 py-2 font-medium text-slate-900">{row.title}</td>
                  <td className="px-2 py-2 text-slate-600">{row.subtitle || "-"}</td>
                  <td className="px-2 py-2 text-slate-500">{new Date(row.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {!loading && (data?.recent_activity || []).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-2 py-5 text-center text-slate-500">
                    No activity found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
