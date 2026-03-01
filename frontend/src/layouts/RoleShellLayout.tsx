import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Navbar } from "../components/Navbar";

type NavItem = { to: string; label: string; end?: boolean };

type RoleShellLayoutProps = {
  roleName: string;
  subtitle: string;
  navItems: NavItem[];
  children: ReactNode;
};

function classNames(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function RoleShellLayout({ roleName, subtitle, navItems, children }: RoleShellLayoutProps) {
  return (
    <main className="relative min-h-screen overflow-hidden landing-aurora">
      <Navbar />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(8,22,30,0.36)_0%,rgba(17,56,61,0.16)_45%,rgba(30,100,85,0.10)_100%)]" />

      <div className="relative mx-auto flex w-full max-w-7xl gap-6 px-4 pb-14 pt-7 sm:pt-8">
        <aside
          className="
            surface-card-strong hidden p-5 sm:block sm:w-72 sm:shrink-0
            sm:sticky sm:top-24 sm:self-start
            sm:max-h-[calc(100vh-9rem)] sm:overflow-y-auto
          "
        >
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-emerald-700">{roleName}</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">{subtitle}</p>

          <nav className="mt-5 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  classNames(
                    "flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition",
                    isActive
                      ? "bg-slate-900 text-white shadow-[0_8px_22px_rgba(15,23,42,0.28)]"
                      : "text-slate-700 hover:bg-white/75 hover:text-slate-900"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="fixed inset-x-0 top-[5.15rem] z-30 border-b border-white/30 bg-slate-950/45 px-4 py-2 backdrop-blur-xl sm:hidden">
          <div className="flex items-center gap-2 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  classNames(
                    "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    isActive ? "bg-slate-900 text-white" : "bg-white/70 text-slate-800"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>

        <section className="role-shell-content min-w-0 flex-1 pb-2 pt-14 sm:pt-0">{children}</section>
      </div>
    </main>
  );
}
