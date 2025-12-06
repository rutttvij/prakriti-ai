import { ReactNode } from "react";
import { NavLink } from "react-router-dom";

interface WorkerLayoutProps {
  children: ReactNode;
}

function navLinkClass(isActive: boolean) {
  return [
    "flex w-full items-center rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-emerald-50 text-emerald-800 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]"
      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
  ].join(" ");
}

export default function WorkerLayout({ children }: WorkerLayoutProps) {
  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-4 pb-10 pt-4 sm:pb-12 sm:pt-6">
      <aside className="hidden w-64 flex-shrink-0 rounded-3xl border border-emerald-50 bg-white/90 p-5 text-sm text-slate-700 shadow-sm backdrop-blur md:block">
        <div className="mb-5">
          <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-emerald-700">
            Waste Worker
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Claim jobs, update status & close reports.
          </p>
        </div>
        <nav className="space-y-1.5">
          <NavLink
            to="/worker/dashboard"
            className={({ isActive }) => navLinkClass(isActive)}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/worker/reports/available"
            className={({ isActive }) => navLinkClass(isActive)}
          >
            Available reports
          </NavLink>
          <NavLink
            to="/worker/reports/my"
            className={({ isActive }) => navLinkClass(isActive)}
          >
            My assigned reports
          </NavLink>
        </nav>
      </aside>

      <main className="flex-1">
        {/* Small-screen top nav */}
        <div className="mb-4 flex gap-2 md:hidden">
          <NavLink
            to="/worker/dashboard"
            className={({ isActive }) =>
              [
                "flex-1 rounded-full border px-3 py-2 text-center text-sm font-medium",
                isActive
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-slate-700 border-slate-200",
              ].join(" ")
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/worker/reports/available"
            className={({ isActive }) =>
              [
                "flex-1 rounded-full border px-3 py-2 text-center text-sm font-medium",
                isActive
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-slate-700 border-slate-200",
              ].join(" ")
            }
          >
            Available
          </NavLink>
          <NavLink
            to="/worker/reports/my"
            className={({ isActive }) =>
              [
                "flex-1 rounded-full border px-3 py-2 text-center text-sm font-medium",
                isActive
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-slate-700 border-slate-200",
              ].join(" ")
            }
          >
            My reports
          </NavLink>
        </div>

        <div className="pt-2 sm:pt-2">{children}</div>
      </main>
    </div>
  );
}
