// src/components/Navbar.tsx
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

  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
    localStorage.removeItem("access_token");
    navigate("/", { replace: true });
  };

  const closeMenuAndNavigate = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const linkBase =
    "text-sm font-medium text-slate-600 hover:text-emerald-700 transition";

  const roleLabel =
    role === "SUPER_ADMIN"
      ? "Admin"
      : role === "WASTE_WORKER"
      ? "Waste Worker"
      : role === "BULK_GENERATOR"
      ? "Bulk Generator"
      : role
      ? "Citizen"
      : "";

  type NavLinkItem = { to: string; label: string };

  const buildNavLinks = (): NavLinkItem[] => {
    const links: NavLinkItem[] = [
      { to: "/about", label: "About" },
      { to: "/contact", label: "Contact" },
    ];

    if (!isAuthenticated) return links;

    if (role === "SUPER_ADMIN") {
      links.push({ to: "/admin", label: "Admin Console" });
    } else if (role === "WASTE_WORKER") {
      links.push({ to: "/worker/dashboard", label: "Worker Console" });
    } else if (role === "BULK_GENERATOR") {
      links.push({ to: "/dashboard", label: "Building Dashboard" });
    } else {
      links.push({ to: "/dashboard", label: "Dashboard" });
    }

    return links;
  };

  const navLinks = buildNavLinks();

  return (
    <>
      <header
        className="
          relative z-40 flex justify-center
          bg-gradient-to-b from-emerald-200 via-emerald-100 to-emerald-50
        "
      >
        <nav
          className="
            mt-4
            flex w-full max-w-6xl items-center justify-between
            rounded-full border border-white/60
            bg-gradient-to-r from-white/75 via-white/40 to-white/75
            px-6 py-3.5
            shadow-lg shadow-emerald-100/40
            backdrop-blur-xl
          "
        >
          {/* Brand */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 focus:outline-none"
          >
            <div className="flex items-center gap-2">
              <div className="flex flex-col leading-tight">
                <span className="text-lg font-semibold tracking-[0.18em] text-slate-900 uppercase">
                  Prakriti
                  <span className="ml-1 bg-gradient-to-r from-emerald-500 to-emerald-700 bg-clip-text text-transparent tracking-[0.35em]">
                    .AI
                  </span>
                </span>
              </div>
            </div>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-6">
              {navLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    classNames(linkBase, isActive && "text-emerald-700")
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-slate-200/60" />

            {/* Auth Controls */}
            <div className="flex items-center gap-3">
              {!isAuthenticated ? (
                <>
                  <button
                    onClick={() => navigate("/register")}
                    className="rounded-full border border-emerald-600 px-4 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50/70"
                  >
                    Register
                  </button>
                  <button
                    onClick={() => navigate("/login")}
                    className="rounded-full bg-emerald-600 px-5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                  >
                    Login
                  </button>
                </>
              ) : (
                <>
                  {/* Avatar + role pill with hover + click */}
                  <div
                    className="relative"
                    onMouseEnter={() => setShowHoverCard(true)}
                    onMouseLeave={() => setShowHoverCard(false)}
                  >
                    <button
                      type="button"
                      onClick={() => setProfileOpen(true)}
                      className="
                        flex items-center gap-2 rounded-full
                        border border-emerald-100/70 bg-emerald-50/70
                        px-2.5 py-1.5
                        hover:bg-emerald-100/60
                        transition
                      "
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-[0.8rem] font-semibold text-white">
                        {initials}
                      </div>
                      {roleLabel && (
                        <span className="hidden text-[0.65rem] font-medium text-emerald-900 sm:inline-flex px-2 py-0.5 rounded-full bg-white/80 border border-emerald-100">
                          {roleLabel}
                        </span>
                      )}
                    </button>

                    {/* Hover card – only brief info */}
                    {showHoverCard && !profileOpen && (
                      <div
                        className="
                          absolute right-0 mt-2 w-56
                          rounded-2xl border border-emerald-100/80
                          bg-white/90 px-3.5 py-3
                          shadow-lg shadow-emerald-100/80
                          backdrop-blur-md
                          text-left
                        "
                      >
                        <p className="text-xs font-semibold text-slate-900">
                          {user?.full_name || "Signed in user"}
                        </p>
                        <p className="mt-0.5 text-[0.7rem] text-slate-600 truncate">
                          {user?.email}
                        </p>
                        {roleLabel && (
                          <span className="mt-2 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-medium text-emerald-800">
                            {roleLabel}
                          </span>
                        )}
                        <p className="mt-2 text-[0.7rem] text-slate-500">
                          Click to view &amp; edit profile.
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleLogout}
                    className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50/80"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu trigger */}
          <div className="md:hidden flex items-center gap-4">
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="flex items-center gap-2"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-[0.8rem] font-semibold text-white">
                  {initials}
                </div>
              </button>
            )}
            <button
              onClick={() => setOpen(!open)}
              className="rounded-md p-2.5 text-slate-700 hover:bg-white/50"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor">
                {open ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 6l8 8M6 14L14 6"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5h14M3 10h14M3 15h14"
                  />
                )}
              </svg>
            </button>
          </div>
        </nav>

        {/* Mobile dropdown */}
        {open && (
          <div className="absolute left-0 right-0 top-[4.6rem] md:hidden">
            <div className="mx-4 rounded-3xl border border-white/70 bg-white/90 shadow-xl backdrop-blur-lg">
              <div className="px-4 py-3 space-y-2">
                {navLinks.map((item) => (
                  <button
                    key={item.to}
                    onClick={() => closeMenuAndNavigate(item.to)}
                    className="block w-full text-left py-1.5 text-sm text-slate-800"
                  >
                    {item.label}
                  </button>
                ))}

                {!isAuthenticated ? (
                  <>
                    <button
                      onClick={() => closeMenuAndNavigate("/register")}
                      className="block w-full py-1.5 text-left text-sm text-emerald-700"
                    >
                      Register
                    </button>
                    <button
                      onClick={() => closeMenuAndNavigate("/login")}
                      className="block w-full rounded-lg bg-emerald-600 py-1.5 text-sm text-white"
                    >
                      Login
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setProfileOpen(true)}
                      className="block w-full rounded-lg border bg-white py-1.5 text-left text-sm text-slate-800"
                    >
                      View profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="block w-full rounded-lg border bg-white py-1.5 text-left text-sm text-slate-800"
                    >
                      Logout
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Profile modal */}
      {isAuthenticated && (
        <UserProfileModal
          open={profileOpen}
          onClose={() => {
            setProfileOpen(false);
            setShowHoverCard(false);
          }}
        />
      )}
    </>
  );
};
