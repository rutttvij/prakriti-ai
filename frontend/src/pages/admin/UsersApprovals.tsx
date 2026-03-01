import { useEffect, useMemo, useState } from "react";

import api, { actAdminApproval, fetchAdminApprovals } from "../../lib/api";
import type { AdminApproval } from "../../lib/types";
import type { User } from "../../types/user";
import { useToast } from "../../components/ui/Toast";

export default function UsersApprovalsPage() {
  const { push } = useToast();

  const [tab, setTab] = useState<"users" | "approvals">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [approvals, setApprovals] = useState<AdminApproval[]>([]);
  const [loading, setLoading] = useState(true);

  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [uRes, aRes] = await Promise.all([api.get<User[]>("/admin/users"), fetchAdminApprovals()]);
      setUsers(uRes.data || []);
      setApprovals(aRes || []);
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to load users/approvals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const roleOk = !role || u.role === role;
      const statusOk = !status || (status === "active" ? u.is_active : !u.is_active);
      const queryOk =
        !q ||
        (u.full_name || "").toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        String(u.id).includes(q);
      return roleOk && statusOk && queryOk;
    });
  }, [users, role, status, search]);

  const onDecision = async (id: number, decision: "approve" | "reject") => {
    try {
      await actAdminApproval(id, decision);
      push("success", `Request ${decision}d.`);
      await load();
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to update approval.");
    }
  };

  return (
    <div className="space-y-5">
      <section className="surface-card-strong rounded-[1.8rem] px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === "users" ? "bg-slate-900 text-white" : "bg-white/75 text-slate-700"}`}
            onClick={() => setTab("users")}
          >
            Users
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === "approvals" ? "bg-slate-900 text-white" : "bg-white/75 text-slate-700"}`}
            onClick={() => setTab("approvals")}
          >
            Approvals
          </button>
        </div>
      </section>

      {tab === "users" && (
        <>
          <section className="surface-card-strong rounded-[1.8rem] px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-3xl font-semibold text-slate-900">Filter &amp; search</h2>
              <button
                className="text-emerald-700 hover:text-emerald-800"
                onClick={() => {
                  setRole("");
                  setStatus("");
                  setSearch("");
                }}
              >
                Clear filters
              </button>
            </div>

            <div className="grid gap-2 md:grid-cols-4">
              <select className="ui-input" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="">All roles</option>
                <option value="CITIZEN">Citizen</option>
                <option value="WASTE_WORKER">Waste Worker</option>
                <option value="BULK_GENERATOR">Bulk Generator</option>
                <option value="BULK_MANAGER">Bulk Manager</option>
                <option value="BULK_STAFF">Bulk Staff</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>

              <select className="ui-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <input className="ui-input" placeholder="Search (name / email / id)" value={search} onChange={(e) => setSearch(e.target.value)} />

              <button className="btn-primary" onClick={() => undefined}>Apply</button>
            </div>
          </section>

          <section className="surface-card-strong rounded-[1.8rem] px-5 py-4">
            <h3 className="mb-3 text-4xl font-semibold text-slate-900">{filteredUsers.length} users in view</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-emerald-100 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">Role</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-emerald-100/70">
                      <td className="px-3 py-2 text-slate-900">
                        {u.full_name || "-"}
                        <div className="text-xs text-slate-500">ID #{u.id}</div>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{u.email}</td>
                      <td className="px-3 py-2 text-slate-700">{u.role.replaceAll("_", " ")}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <button className="btn-secondary px-3 py-1 text-xs" disabled>
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!loading && filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-slate-500">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {tab === "approvals" && (
        <section className="surface-card-strong rounded-[1.8rem] px-5 py-4">
          <h3 className="mb-3 text-2xl font-semibold text-slate-900">Pending approvals</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-emerald-100 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Role</th>
                  <th className="px-3 py-2 text-left">Requested</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((a) => (
                  <tr key={a.id} className="border-b border-emerald-100/70">
                    <td className="px-3 py-2 text-slate-900">{a.name}</td>
                    <td className="px-3 py-2 text-slate-700">{a.email}</td>
                    <td className="px-3 py-2 text-slate-700">{a.role.replaceAll("_", " ")}</td>
                    <td className="px-3 py-2 text-slate-500">{a.created_at ? new Date(a.created_at).toLocaleString() : "-"}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button className="btn-primary px-3 py-1 text-xs" onClick={() => onDecision(a.id, "approve")}>Approve</button>
                        <button className="btn-secondary px-3 py-1 text-xs" onClick={() => onDecision(a.id, "reject")}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!loading && approvals.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">No pending approvals.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
