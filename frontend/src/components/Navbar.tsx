// src/components/Navbar.tsx
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function classNames(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export const Navbar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth() as {
    user?: { full_name?: string | null; role?: string | null };
    logout: () => Promise<void> | void;
  };

  const isAuthenticated = !!user;

  const initials =
    user?.full_name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "PA";

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem("access_token");
      navigate("/", { replace: true });
    }
  };

  const closeMenuAndNavigate = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const linkBase =
    "text-sm font-medium text-slate-600 hover:text-emerald-600 transition";

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-emerald-100">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Left: Brand */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 focus:outline-none"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm">
              ♻️
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-slate-900">
                Prakriti.AI
              </span>
              <span className="text-[0.65rem] text-emerald-600">
                Clean City • Smart Waste
              </span>
            </div>
          </button>
        </div>

        {/* Desktop: center links */}
        <div className="hidden items-center gap-6 md:flex">
          <NavLink
            to="/about"
            className={({ isActive }) =>
              classNames(linkBase, isActive && "text-emerald-600")
            }
          >
            About
          </NavLink>
          <NavLink
            to="/contact"
            className={({ isActive }) =>
              classNames(linkBase, isActive && "text-emerald-600")
            }
          >
            Contact
          </NavLink>
          {isAuthenticated && (
            <>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  classNames(linkBase, isActive && "text-emerald-600")
                }
              >
                Dashboard
              </NavLink>
              {user?.role === "SUPER_ADMIN" && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    classNames(linkBase, isActive && "text-emerald-600")
                  }
                >
                  Admin
                </NavLink>
              )}
            </>
          )}
        </div>

        {/* Desktop: right-side auth / user controls */}
        <div className="hidden items-center gap-3 md:flex">
          {!isAuthenticated ? (
            <>
              <button
                onClick={() => navigate("/register")}
                className="rounded-full border border-emerald-500 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50"
              >
                Register
              </button>
              <button
                onClick={() => navigate("/login")}
                className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-600"
              >
                Login
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/60 px-2 py-1">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-[0.75rem] font-semibold text-white">
                  {initials}
                </div>
                <div className="flex flex-col">
                  <span className="text-[0.7rem] font-medium text-slate-800">
                    {user?.full_name || "Logged in"}
                  </span>
                  <span className="text-[0.6rem] uppercase text-emerald-600">
                    {user?.role || ""}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Logout
              </button>
            </>
          )}
        </div>

        {/* Mobile: hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50"
            >
              Logout
            </button>
          )}
          <button
            onClick={() => setOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-md p-2 text-slate-700 hover:bg-slate-100 focus:outline-none"
            aria-label="Toggle navigation"
          >
            <span className="sr-only">Open main menu</span>
            <svg
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
            >
              {open ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M6 6l8 8M6 14L14 6"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M3 5h14M3 10h14M3 15h14"
                />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-emerald-50 bg-white">
          <div className="space-y-1 px-4 py-3">
            <button
              onClick={() => closeMenuAndNavigate("/about")}
              className="block w-full text-left text-sm text-slate-700 py-1.5"
            >
              About
            </button>
            <button
              onClick={() => closeMenuAndNavigate("/contact")}
              className="block w-full text-left text-sm text-slate-700 py-1.5"
            >
              Contact
            </button>

            {isAuthenticated && (
              <>
                <button
                  onClick={() => closeMenuAndNavigate("/dashboard")}
                  className="block w-full text-left text-sm text-slate-700 py-1.5"
                >
                  Dashboard
                </button>
                {user?.role === "SUPER_ADMIN" && (
                  <button
                    onClick={() => closeMenuAndNavigate("/admin")}
                    className="block w-full text-left text-sm text-slate-700 py-1.5"
                  >
                    Admin Panel
                  </button>
                )}
              </>
            )}

            {!isAuthenticated && (
              <>
                <button
                  onClick={() => closeMenuAndNavigate("/register")}
                  className="block w-full text-left text-sm text-emerald-600 py-1.5"
                >
                  Register
                </button>
                <button
                  onClick={() => closeMenuAndNavigate("/login")}
                  className="block w-full text-left text-sm text-white bg-emerald-500 rounded-lg mt-1 py-1.5"
                >
                  Login
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
