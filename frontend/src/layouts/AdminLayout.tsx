import { ReactNode } from "react";
import { NavLink } from "react-router-dom";

interface AdminLayoutProps {
  children: ReactNode;
}

const baseNav =
  "block rounded-xl px-4 py-2.5 text-sm transition-colors font-medium";
const activeClass =
  "bg-emerald-50 text-emerald-800 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]";
const inactiveClass = "text-slate-600 hover:bg-slate-100 hover:text-slate-900";

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-4 pb-10 pt-4 sm:pb-12 sm:pt-6">
      {/* --------------------------- */}
      {/* Admin Sidebar */}
      {/* --------------------------- */}
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
        {/* Header */}
        <div className="mb-5">
          <h2 className="text-[0.75rem] font-semibold uppercase tracking-wide text-emerald-600">
            Super Admin
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            City control, approvals & climate impact.
          </p>
        </div>

        {/* Nav Menu */}
        <nav className="space-y-1.5">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `${baseNav} ${isActive ? activeClass : inactiveClass}`
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              `${baseNav} ${isActive ? activeClass : inactiveClass}`
            }
          >
            Users & Approvals
          </NavLink>

          <NavLink
            to="/admin/pcc"
            className={({ isActive }) =>
              `${baseNav} ${isActive ? activeClass : inactiveClass}`
            }
          >
            PCC Tokens
          </NavLink>
        </nav>
      </aside>

      {/* --------------------------- */}
      {/* Main Content */}
      {/* --------------------------- */}
      <main className="flex-1">
        <div className="pt-2 sm:pt-2">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;
