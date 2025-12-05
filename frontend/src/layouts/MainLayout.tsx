// src/layouts/MainLayout.tsx
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
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-4 sm:px-6 sm:py-6">
      {/* ----------------------------- */}
      {/* Desktop Sidebar */}
      {/* ----------------------------- */}
      <aside
        className="
          hidden 
          w-64                     /* Larger sidebar */
          shrink-0 
          rounded-2xl 
          border 
          border-emerald-50 
          bg-white/80 
          p-4                      /* More balanced padding */
          text-sm 
          text-slate-700 
          sm:block 
          ml-0
        "
      >
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            {role === "WASTE_WORKER"
              ? "Waste Worker"
              : role === "BULK_GENERATOR"
              ? "Bulk Generator"
              : "Citizen"}
          </p>
          <p className="mt-1 text-[0.75rem] text-slate-500">
            Navigate your daily actions.
          </p>
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                classNames(
                  "flex items-center rounded-lg px-4 py-2 text-[0.85rem] transition",
                  isActive
                    ? "bg-emerald-50 text-emerald-700 font-medium"
                    : "text-slate-600 hover:bg-slate-100"
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
      <div className="fixed inset-x-0 top-[56px] z-30 border-b border-emerald-50 bg-white/95 px-4 py-2 sm:hidden">
        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                classNames(
                  "whitespace-nowrap rounded-full px-3 py-1 transition",
                  isActive
                    ? "bg-emerald-500 text-white"
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
        <div className="pt-10 sm:pt-0">{children}</div>
      </main>
    </div>
  );
}
