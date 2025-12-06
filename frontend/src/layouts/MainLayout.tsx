import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

type Props = {
  children: ReactNode;
};

function classNames(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function MainLayout({ children }: Props) {
  const { user } = useAuth() as {
    user?: { full_name?: string | null; role?: string | null };
  };

  const role = user?.role || "CITIZEN";

  const navItems = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/training", label: "Training" },
    { to: "/waste/report", label: "Report Waste" },
    { to: "/waste/my-reports", label: "My Reports" },
  ];

  // Waste Worker: segregation logs
  if (role === "WASTE_WORKER") {
    navItems.push({ to: "/segregation", label: "Segregation Logs" });
  }

  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-4 pb-10 pt-4 sm:pb-12 sm:pt-6">
      {/* ----------------------------- */}
      {/* Desktop Sidebar */}
      {/* ----------------------------- */}
      <aside
        className="
          hidden
          w-64
          shrink-0
          rounded-3xl
          border
          border-emerald-50
          bg-white/90
          p-5
          text-sm
          text-slate-700
          shadow-sm
          backdrop-blur
          sm:block
        "
      >
        <div className="mb-5">
          <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-emerald-600">
            {role === "WASTE_WORKER"
              ? "Waste Worker"
              : role === "BULK_GENERATOR"
              ? "Bulk Generator"
              : "Citizen"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Navigate your daily actions and climate impact.
          </p>
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                classNames(
                  "flex items-center rounded-xl px-4 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-emerald-50 text-emerald-800 font-semibold shadow-[0_0_0_1px_rgba(16,185,129,0.08)]"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* ----------------------------- */}
      {/* Mobile top tabs (for small screens) */}
      {/* ----------------------------- */}
      <div className="fixed inset-x-0 top-16 z-30 border-b border-emerald-50 bg-white/95 px-4 py-2 sm:hidden">
        <div className="flex items-center gap-2 overflow-x-auto text-sm">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                classNames(
                  "whitespace-nowrap rounded-full px-3.5 py-1.5 transition-colors",
                  isActive
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>

      {/* ----------------------------- */}
      {/* Main Content Area */}
      {/* ----------------------------- */}
      <main className="flex-1">
        {/* Adds spacing so content doesn't hide behind mobile nav */}
        <div className="pt-14 sm:pt-2">
          {children}
        </div>
      </main>
    </div>
  );
}
