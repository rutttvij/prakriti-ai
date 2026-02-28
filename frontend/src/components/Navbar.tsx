import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { UserProfileModal } from "./UserProfileModal";

function classNames(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export const Navbar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [showHoverCard, setShowHoverCard] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const navigate = useNavigate();
  const { user, logout } = useAuth() as {
    user?: { full_name?: string | null; role?: string | null; email?: string | null };
    logout: () => Promise<void> | void;
  };

  const isAuthenticated = !!user;
  const role = user?.role || "";

  const initials =
    user?.full_name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "PA";

  const roleLabel =
    role === "SUPER_ADMIN"
      ? "Admin"
      : role === "WASTE_WORKER"
      ? "Waste Worker"
      : role === "BULK_MANAGER"
      ? "Bulk Manager"
      : role === "BULK_STAFF"
      ? "Bulk Staff"
      : role === "BULK_GENERATOR"
      ? "Bulk Generator"
      : role
      ? "Citizen"
      : "";

  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
    localStorage.removeItem("access_token");
    navigate("/", { replace: true });
  };

  type NavLinkItem = { to: string; label: string };

  const navLinks = (() => {
    const links: NavLinkItem[] = [
      { to: "/about", label: "About" },
      { to: "/contact", label: "Contact" },
    ];

    if (!isAuthenticated) return links;

    if (role === "SUPER_ADMIN") links.push({ to: "/admin", label: "Admin Console" });
    else if (role === "WASTE_WORKER") links.push({ to: "/worker/dashboard", label: "Worker Console" });
    else if (["BULK_GENERATOR", "BULK_MANAGER", "BULK_STAFF"].includes(role)) links.push({ to: "/bulk/dashboard", label: "Bulk Console" });
    else links.push({ to: "/dashboard", label: "Dashboard" });

    return links;
  })();

  return (
    <>
      <header className="sticky top-0 z-50 px-3 pt-3 sm:px-5">
        <div className="mx-auto max-w-7xl rounded-[1.35rem] border border-white/30 bg-gradient-to-r from-slate-900/72 via-teal-950/60 to-emerald-950/55 px-4 py-3 shadow-[0_18px_34px_rgba(3,17,14,0.42)] backdrop-blur-2xl sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <button onClick={() => navigate("/")} className="flex items-center gap-3 text-left">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-lg font-bold text-white shadow-md shadow-emerald-900/25">
                P
              </div>
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-emerald-100/80">Civic Intelligence</p>
                <p className="text-xl font-bold tracking-[0.08em] text-white">PRAKRITI.AI</p>
              </div>
            </button>

            <div className="hidden items-center gap-6 md:flex">
              {navLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    classNames(
                      "rounded-full px-3 py-1.5 text-sm font-medium transition",
                      isActive
                        ? "bg-slate-900 text-white shadow-[0_6px_16px_rgba(15,23,42,0.22)]"
                        : "text-emerald-50/85 hover:bg-white/15 hover:text-white"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}

              <div className="h-6 w-px bg-white/20" />

              {!isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate("/register")} className="btn-secondary px-4 py-2 text-xs">Register</button>
                  <button onClick={() => navigate("/login")} className="btn-primary px-4 py-2 text-xs">Login</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div
                    className="relative"
                    onMouseEnter={() => setShowHoverCard(true)}
                    onMouseLeave={() => setShowHoverCard(false)}
                  >
                    <button
                      type="button"
                      onClick={() => setProfileOpen(true)}
                      className="flex items-center gap-2 rounded-full border border-white/30 bg-slate-900/35 px-2 py-1.5 transition hover:bg-slate-900/55"
                    >
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 text-[0.72rem] font-semibold text-white">
                        {initials}
                      </div>
                      {roleLabel && (
                        <span className="rounded-full border border-white/25 bg-white/85 px-2 py-0.5 text-[0.62rem] font-semibold text-slate-700">
                          {roleLabel}
                        </span>
                      )}
                    </button>

                    {showHoverCard && !profileOpen && (
                      <div className="surface-card absolute right-0 mt-2 w-60 p-3 text-left">
                        <p className="text-xs font-semibold text-slate-900">{user?.full_name || "Signed in user"}</p>
                        <p className="mt-1 truncate text-[0.72rem] text-slate-600">{user?.email}</p>
                        <p className="mt-2 text-[0.65rem] text-slate-500">Open profile to edit your details.</p>
                      </div>
                    )}
                  </div>

                  <button onClick={handleLogout} className="rounded-full border border-white/30 bg-white/85 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-white">
                    Logout
                  </button>
                </div>
              )}
            </div>

            <button onClick={() => setOpen((v) => !v)} className="rounded-lg p-2 text-emerald-50 hover:bg-white/15 md:hidden">
              <svg className="h-6 w-6" fill="none" stroke="currentColor">
                {open ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l8 8M6 14L14 6" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h14M3 10h14M3 15h14" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <div className="mx-auto mt-2 max-w-7xl md:hidden">
            <div className="surface-card p-3">
              {navLinks.map((item) => (
                <button
                  key={item.to}
                  onClick={() => {
                    setOpen(false);
                    navigate(item.to);
                  }}
                  className="mb-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-white/80"
                >
                  {item.label}
                </button>
              ))}

              {!isAuthenticated ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button onClick={() => navigate("/register")} className="btn-secondary w-full">Register</button>
                  <button onClick={() => navigate("/login")} className="btn-primary w-full">Login</button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setOpen(false);
                    handleLogout();
                  }}
                  className="mt-2 w-full rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <UserProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
};
