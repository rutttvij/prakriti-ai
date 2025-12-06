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
  const [statusFilter, setStatusFilter] = useState<
    "" | "active" | "inactive" | "pending"
  >("");
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

  const handleActivate = (userId: number) => patchUser(userId, "activate");

  const handleDeactivate = (userId: number) => patchUser(userId, "deactivate");

  const handleRoleChange = (userId: number, newRole: UserRole) =>
    patchUser(userId, "role", { role: newRole });

  const totalActive = users.filter((u) => u.is_active).length;
  const totalPending = users.filter((u) => !u.is_active).length;

  return (
    <div className="relative">
      {/* Soft glow */}
      <div className="pointer-events-none absolute inset-x-0 -top-10 h-20 bg-[radial-gradient(circle_at_top,_#bbf7d0,_transparent_65%)] opacity-70" />

      <div className="relative space-y-5">
        {/* Header */}
        <header className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100/80 bg-white/70 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-emerald-800 shadow-sm shadow-emerald-100/80 backdrop-blur-sm">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Super Admin · Users
            </div>
            <h1 className="mt-3 text-2xl font-bold text-slate-950">
              Users &amp; approvals
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              Activate accounts, change roles, and view registered users across
              Prakriti.AI.
            </p>
          </div>

          <div className="mt-1 flex gap-2 text-[0.7rem] text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100/80 bg-white/80 px-3 py-1 shadow-sm shadow-emerald-50 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active: {totalActive}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-100/80 bg-white/80 px-3 py-1 shadow-sm shadow-amber-50 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Pending / inactive: {totalPending}
            </span>
          </div>
        </header>

        {/* Filters */}
        <section
          className="
            rounded-[1.6rem]
            border border-emerald-100/80
            bg-white/80
            px-4 py-4
            shadow-md shadow-emerald-100/70
            backdrop-blur-sm
          "
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Filter &amp; search
            </h2>
            <button
              type="button"
              onClick={() => {
                setRoleFilter("");
                setStatusFilter("");
                setPincodeFilter("");
                setSearch("");
                loadUsers();
              }}
              className="text-[0.7rem] font-medium text-emerald-700 hover:text-emerald-800"
            >
              Clear filters
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">
                Role
              </label>
              <select
                className="
                  w-full rounded-xl border border-emerald-100/80
                  bg-white/80 px-2 py-1.5 text-xs
                  shadow-sm shadow-emerald-50
                  focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400
                "
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as "" | UserRole)}
              >
                <option value="">All</option>
                <option value="CITIZEN">Citizen</option>
                <option value="WASTE_WORKER">Waste Worker</option>
                <option value="BULK_GENERATOR">Bulk Generator</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">
                Status
              </label>
              <select
                className="
                  w-full rounded-xl border border-emerald-100/80
                  bg-white/80 px-2 py-1.5 text-xs
                  shadow-sm shadow-emerald-50
                  focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400
                "
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
              <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">
                Pincode
              </label>
              <input
                type="text"
                className="
                  w-full rounded-xl border border-emerald-100/80
                  bg-white/80 px-2 py-1.5 text-xs
                  shadow-sm shadow-emerald-50
                  focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400
                "
                value={pincodeFilter}
                onChange={(e) => setPincodeFilter(e.target.value)}
                placeholder="e.g. 411001"
              />
            </div>

            {/* Search + Apply */}
            <div className="pr-1">
              <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">
                Search (name / email / govt ID)
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  className="
                    flex-1 min-w-0
                    rounded-xl border border-emerald-100/80
                    bg-white/80 px-2 py-1.5 text-xs
                    shadow-sm shadow-emerald-50
                    focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400
                  "
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                />
                <button
                  type="button"
                  onClick={loadUsers}
                  className="
                    inline-flex items-center justify-center
                    rounded-full bg-emerald-700
                    px-4 py-1.5 text-xs font-semibold text-white
                    shadow-sm shadow-emerald-400/60
                    hover:bg-emerald-800
                  "
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div
            className="
              rounded-2xl border border-red-100/80
              bg-red-50/90 px-4 py-2
              text-xs text-red-700
              shadow-sm shadow-red-100
            "
          >
            {error}
          </div>
        )}

        {/* Table */}
        <section
          className="
            rounded-[1.8rem]
            border border-emerald-100/80
            bg-white/80
            px-4 py-4
            shadow-md shadow-emerald-100/70
            backdrop-blur-sm
          "
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              {users.length} user{users.length === 1 ? "" : "s"} in view
            </h2>
            {loading && (
              <span className="text-[0.7rem] text-slate-500">
                Refreshing list…
              </span>
            )}
          </div>

          {loading ? (
            <p className="text-xs text-slate-500">Loading users…</p>
          ) : users.length === 0 ? (
            <p className="text-xs text-slate-500">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-emerald-50/80 text-[0.7rem] text-slate-500">
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">Role</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Govt ID</th>
                    <th className="px-3 py-2 text-left">Pincode</th>
                    <th className="px-3 py-2 text-left">PCC</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-emerald-50/60 bg-white/40 last:border-0 hover:bg-emerald-50/50"
                    >
                      <td className="px-3 py-2 align-top">
                        <div className="font-medium text-slate-900">
                          {u.full_name || "—"}
                        </div>
                        <div className="mt-0.5 text-[0.65rem] text-slate-400">
                          ID #{u.id}
                        </div>
                      </td>

                      <td className="px-3 py-2 align-top">
                        <div className="text-[0.7rem] text-slate-700">
                          {u.email}
                        </div>
                      </td>

                      <td className="px-3 py-2 align-top">
                        <select
                          className="
                            rounded-full border border-emerald-100/80
                            bg-white/80 px-2 py-1 text-[0.7rem]
                            shadow-sm shadow-emerald-50
                            focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400
                          "
                          value={u.role}
                          onChange={(e) =>
                            handleRoleChange(u.id, e.target.value as UserRole)
                          }
                        >
                          <option value="CITIZEN">Citizen</option>
                          <option value="WASTE_WORKER">Waste Worker</option>
                          <option value="BULK_GENERATOR">Bulk Generator</option>
                          <option value="SUPER_ADMIN">Super Admin</option>
                        </select>
                      </td>

                      <td className="px-3 py-2 align-top">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${
                            u.is_active
                              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                              : "border-amber-100 bg-amber-50 text-amber-700"
                          }`}
                        >
                          <span
                            className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${
                              u.is_active ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          {u.is_active ? "Active" : "Pending / Inactive"}
                        </span>
                      </td>

                      <td className="px-3 py-2 align-top">
                        <div className="text-[0.7rem] text-slate-700">
                          {u.government_id || "—"}
                        </div>
                      </td>

                      <td className="px-3 py-2 align-top">
                        <div className="text-[0.7rem] text-slate-700">
                          {u.pincode || "—"}
                        </div>
                      </td>

                      <td className="px-3 py-2 align-top">
                        <div className="text-[0.7rem] text-emerald-700">
                          {u.pcc_balance?.toFixed(1) ?? "0.0"}
                        </div>
                      </td>

                      <td className="px-3 py-2 align-top">
                        <div className="flex flex-wrap gap-1.5">
                          {u.is_active ? (
                            <button
                              type="button"
                              onClick={() => handleDeactivate(u.id)}
                              className="
                                rounded-full border border-slate-200
                                bg-white/80 px-3 py-0.5
                                text-[0.65rem] text-slate-600
                                shadow-sm shadow-slate-50
                                hover:bg-slate-50
                              "
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleActivate(u.id)}
                              className="
                                rounded-full border border-emerald-500
                                bg-emerald-50 px-3 py-0.5
                                text-[0.65rem] font-medium text-emerald-700
                                shadow-sm shadow-emerald-100
                                hover:bg-emerald-100
                              "
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
    </div>
  );
};
