// src/pages/admin/AdminUsersPage.tsx
import { useEffect, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const getAuthToken = () => localStorage.getItem("access_token");

type UserRole = "CITIZEN" | "BULK_GENERATOR" | "WASTE_WORKER" | "SUPER_ADMIN";

interface AdminUser {
  id: number;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  government_id: string | null;
  pincode: string | null;
  meta: Record<string, string>;
  pcc_balance?: number;
}

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState<"" | UserRole>("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive" | "pending">("");
  const [pincodeFilter, setPincodeFilter] = useState("");
  const [search, setSearch] = useState("");

  const token = getAuthToken();

  const loadUsers = async () => {
    if (!token) {
      setError("Not authenticated.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (roleFilter) params.append("role", roleFilter);
    if (statusFilter) params.append("status", statusFilter);
    if (pincodeFilter) params.append("pincode", pincodeFilter.trim());
    if (search) params.append("search", search.trim());

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/users?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Failed to load users.");
      }

      const data = (await res.json()) as AdminUser[];
      setUsers(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Error loading users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchUser = async (userId: number, path: string, body?: any) => {
    if (!token) return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/users/${userId}/${path}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: body ? JSON.stringify(body) : undefined,
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || "Request failed");
      }

      await loadUsers();
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Update failed.");
    }
  };

  const handleActivate = (userId: number) =>
    patchUser(userId, "activate");

  const handleDeactivate = (userId: number) =>
    patchUser(userId, "deactivate");

  const handleRoleChange = (userId: number, newRole: UserRole) =>
    patchUser(userId, "role", { role: newRole });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-slate-800">Users &amp; Approvals</h1>
        <p className="text-xs text-slate-500">
          Activate accounts, change roles, and view registered users.
        </p>
      </header>

      {/* Filters */}
      <section className="rounded-xl border border-emerald-100 bg-white p-3">
        <div className="grid gap-2 sm:grid-cols-4 items-end">
          <div>
            <label className="block text-[0.7rem] font-medium text-slate-600 mb-1">
              Role
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={roleFilter}
              onChange={(e) =>
                setRoleFilter(e.target.value as "" | UserRole)
              }
            >
              <option value="">All</option>
              <option value="CITIZEN">Citizen</option>
              <option value="WASTE_WORKER">Waste Worker</option>
              <option value="BULK_GENERATOR">Bulk Generator</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-[0.7rem] font-medium text-slate-600 mb-1">
              Status
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as "" | "active" | "inactive" | "pending"
                )
              }
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-[0.7rem] font-medium text-slate-600 mb-1">
              Pincode
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={pincodeFilter}
              onChange={(e) => setPincodeFilter(e.target.value)}
              placeholder="e.g. 411001"
            />
          </div>
          <div>
            <label className="block text-[0.7rem] font-medium text-slate-600 mb-1">
              Search (name/email/govt ID)
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
              />
              <button
                type="button"
                onClick={loadUsers}
                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <section className="rounded-xl border border-emerald-100 bg-white p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-800">
            {users.length} users
          </h2>
        </div>

        {loading ? (
          <p className="text-xs text-slate-500">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="text-xs text-slate-500">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[0.7rem] text-slate-500">
                  <th className="px-2 py-2 text-left">Name</th>
                  <th className="px-2 py-2 text-left">Email</th>
                  <th className="px-2 py-2 text-left">Role</th>
                  <th className="px-2 py-2 text-left">Status</th>
                  <th className="px-2 py-2 text-left">Govt ID</th>
                  <th className="px-2 py-2 text-left">Pincode</th>
                  <th className="px-2 py-2 text-left">PCC</th>
                  <th className="px-2 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-slate-50 hover:bg-emerald-50/40"
                  >
                    <td className="px-2 py-2">
                      <div className="font-medium text-slate-800">
                        {u.full_name || "—"}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="text-[0.7rem] text-slate-600">
                        {u.email}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <select
                        className="rounded-md border border-slate-200 px-2 py-1 text-[0.7rem] focus:outline-none focus:ring-1 focus:ring-emerald-400"
                        value={u.role}
                        onChange={(e) =>
                          handleRoleChange(
                            u.id,
                            e.target.value as UserRole
                          )
                        }
                      >
                        <option value="CITIZEN">Citizen</option>
                        <option value="WASTE_WORKER">Waste Worker</option>
                        <option value="BULK_GENERATOR">Bulk Generator</option>
                        <option value="SUPER_ADMIN">Super Admin</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${
                          u.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}
                      >
                        {u.is_active ? "Active" : "Pending / Inactive"}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="text-[0.7rem] text-slate-600">
                        {u.government_id || "—"}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="text-[0.7rem] text-slate-600">
                        {u.pincode || "—"}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="text-[0.7rem] text-emerald-700">
                        {u.pcc_balance?.toFixed(1) ?? "0.0"}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        {u.is_active ? (
                          <button
                            type="button"
                            onClick={() => handleDeactivate(u.id)}
                            className="rounded-full border border-slate-200 px-2 py-0.5 text-[0.65rem] text-slate-600 hover:bg-slate-50"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleActivate(u.id)}
                            className="rounded-full border border-emerald-500 px-2 py-0.5 text-[0.65rem] text-emerald-700 hover:bg-emerald-50"
                          >
                            Approve / Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
