import { Link } from "react-router-dom";

export function Navbar({ onRequestDemo }: { onRequestDemo: () => void }) {
  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-5">
      <div className="mx-auto max-w-7xl rounded-[1.2rem] border border-white/30 bg-white/20 px-4 py-3 shadow-[0_18px_34px_rgba(2,12,16,0.25)] backdrop-blur-2xl sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3 text-left">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-700 text-lg font-bold text-white shadow-md shadow-emerald-950/30">
              P
            </div>
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-emerald-100/85">City intelligence</p>
              <p className="text-xl font-bold tracking-[0.08em] text-white">PRAKRITI.AI</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/about" className="text-sm font-medium text-emerald-50/85 hover:text-white">About</Link>
            <Link to="/contact" className="text-sm font-medium text-emerald-50/85 hover:text-white">Contact</Link>
            <Link to="/docs" className="text-sm font-medium text-emerald-50/85 hover:text-white">Docs</Link>
            <button onClick={onRequestDemo} className="btn-primary px-4 py-2 text-xs">Request Demo</button>
            <Link to="/auth/register" className="btn-secondary px-4 py-2 text-xs">Register</Link>
            <Link to="/auth/login" className="btn-secondary px-4 py-2 text-xs">Login</Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
