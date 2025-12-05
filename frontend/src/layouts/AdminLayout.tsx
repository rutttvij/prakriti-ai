// src/layouts/AdminLayout.tsx
import { ReactNode } from "react";
import { NavLink } from "react-router-dom";

interface AdminLayoutProps {
  children: ReactNode;
}

const baseNav =
  "block rounded-lg px-4 py-2 text-[0.85rem] transition font-medium";

const activeClass = "bg-emerald-50 text-emerald-700";
const inactiveClass = "text-slate-600 hover:bg-slate-100";

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-4 sm:px-6 sm:py-6">
      
      {/* --------------------------- */}
      {/* Admin Sidebar */}
      {/* --------------------------- */}
      <aside
        className="
          hidden 
          w-64                     /* Wider sidebar */
          shrink-0 
          rounded-2xl 
          border 
          border-emerald-50 
          bg-white/80 
          p-4 
          text-sm 
          text-slate-700 
          sm:block
        "
      >
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            Super Admin
          </h2>
          <p className="mt-1 text-[0.75rem] text-slate-500">
            City Control & Climate Impact
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
        <div className="pt-2 sm:pt-0">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;
