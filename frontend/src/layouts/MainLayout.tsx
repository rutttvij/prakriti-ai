import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Overview", roles: ["CITIZEN", "BULK_GENERATOR", "WASTE_WORKER", "SUPER_ADMIN"] },
  { to: "/training", label: "Training", roles: ["CITIZEN", "BULK_GENERATOR", "WASTE_WORKER"] },
  { to: "/waste/report", label: "Report Waste", roles: ["CITIZEN", "BULK_GENERATOR"] },
  { to: "/waste/my-reports", label: "My Reports", roles: ["CITIZEN", "BULK_GENERATOR", "WASTE_WORKER"] },
  { to: "/segregation", label: "Segregation Logs", roles: ["WASTE_WORKER"] },
  { to: "/admin/facilities", label: "Facilities", roles: ["SUPER_ADMIN"] },
  { to: "/admin/city-metrics", label: "City Metrics", roles: ["SUPER_ADMIN"] },
];

export default function MainLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const filteredNav = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 border-r border-slate-200 bg-white">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
          <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold shadow-sm">
            ♻️
          </div>
          <div>
            <div className="text-sm font-semibold text-emerald-800">
              Prakriti.AI
            </div>
            <div className="text-xs text-slate-500">
              Clean city • Smart waste
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "flex items-center rounded-lg px-3 py-2 text-sm",
                  "hover:bg-emerald-50 hover:text-emerald-700 transition",
                  isActive
                    ? "bg-emerald-50 text-emerald-700 font-medium border border-emerald-100"
                    : "text-slate-700",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-slate-200 text-xs text-slate-500">
          <div className="mb-1">
            {user.full_name || user.email}
          </div>
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 uppercase tracking-wide text-[10px] text-emerald-700">
              {user.role.replace("_", " ")}
            </span>
            <button
              onClick={logout}
              className="text-slate-500 hover:text-red-500"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold">
              ♻️
            </div>
            <span className="text-sm font-semibold text-emerald-800">
              Prakriti.AI
            </span>
          </div>
          <button
            onClick={logout}
            className="text-xs rounded-full border border-slate-200 px-3 py-1 text-slate-600 hover:bg-slate-50"
          >
            Logout
          </button>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
