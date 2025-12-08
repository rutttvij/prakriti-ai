// src/layouts/BulkLayout.tsx

import { ReactNode } from "react";
import { NavLink } from "react-router-dom";

type Props = {
  children: ReactNode;
};

function classNames(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function BulkLayout({ children }: Props) {
  const navItems = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/training", label: "Training" },
    { to: "/waste/report", label: "Report Waste" },
    { to: "/waste/my-reports", label: "My Reports" },
    // future bulk-specific routes (analytics, buildings, etc.)
  ];

  return (
    <main
      className="
        relative min-h-screen overflow-hidden
        bg-gradient-to-b from-emerald-50 via-emerald-50 to-slate-50
      "
    >
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-x-0 -top-40 h-80 bg-[radial-gradient(circle_at_top,_#bbf7d0,_transparent_65%)] opacity-80" />
      <div className="pointer-events-none absolute -right-40 top-24 h-72 w-72 rounded-full bg-emerald-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -left-40 top-72 h-72 w-72 rounded-full bg-emerald-100/60 blur-3xl" />

      <div
        className="
          relative mx-auto flex max-w-6xl items-start
          gap-6 px-4 pb-10 pt-24 sm:pb-12 sm:pt-28
        "
      >
        {/* Desktop sidebar */}
        <aside
          className="
            hidden
            w-64 shrink-0
            rounded-[2rem]
            border border-emerald-100/80
            bg-white/80
            p-5
            text-sm text-slate-700
            shadow-xl shadow-emerald-200/70
            backdrop-blur-md
            sm:block
          "
        >
          <div className="mb-5">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Bulk Generator
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Monitor segregation, reports and PCC impact for your campus or
              society.
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
                      ? "bg-emerald-50/90 text-emerald-800 font-semibold shadow-[0_0_0_1px_rgba(16,185,129,0.12)]"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Mobile top tabs */}
        <div className="fixed inset-x-0 top-16 z-30 border-b border-emerald-50 bg-white/95 px-4 py-2 backdrop-blur-md sm:hidden">
          <div className="flex items-center gap-2 overflow-x-auto text-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  classNames(
                    "whitespace-nowrap rounded-full px-3.5 py-1.5 transition-colors",
                    isActive
                      ? "bg-emerald-500 text-white shadow-sm shadow-emerald-400/70"
                      : "bg-slate-100 text-slate-700"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Main content */}
        <section className="flex-1">
          <div className="pt-14 sm:pt-2">{children}</div>
        </section>
      </div>
    </main>
  );
}
