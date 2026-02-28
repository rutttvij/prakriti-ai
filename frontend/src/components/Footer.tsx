import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

export const Footer: React.FC = () => {
  return (
    <footer className="mt-12 border-t border-emerald-200/20 bg-gradient-to-r from-[#1a3a30] via-[#21483b] to-[#224f3f] pb-10 pt-12 text-emerald-50 shadow-[0_-14px_34px_rgba(3,18,14,0.36)]">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-xl shadow-md shadow-emerald-950/30">
              <img
                src={logo}
                alt="Prakriti.AI logo"
                className="h-full w-full scale-[1.28] object-cover object-center"
              />
            </div>
            <h2 className="text-xl font-bold tracking-[0.07em] text-white">PRAKRITI.AI</h2>
          </div>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-emerald-100/90">
            Enterprise-grade waste intelligence for cities, campuses, and commercial ecosystems. Built for accountability, climate impact, and operational speed.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald-200/45 bg-emerald-50/15 px-3 py-1 text-[0.68rem] font-semibold text-emerald-50">Real-Time Workflows</span>
            <span className="rounded-full border border-emerald-200/45 bg-emerald-50/15 px-3 py-1 text-[0.68rem] font-semibold text-emerald-50">Carbon Ledger</span>
            <span className="rounded-full border border-emerald-200/45 bg-emerald-50/15 px-3 py-1 text-[0.68rem] font-semibold text-emerald-50">PCC Rewards</span>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">Navigate</h3>
          <ul className="mt-3 space-y-2 text-sm text-emerald-50">
            <li><Link to="/" className="hover:text-white">Home</Link></li>
            <li><Link to="/about" className="hover:text-white">About</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
            <li><Link to="/register" className="hover:text-white">Register</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">Pilot Updates</h3>
          <p className="mt-3 text-sm text-emerald-50/95">Get notified when new ward/campus deployments go live.</p>
          <div className="mt-4 flex items-center gap-2">
            <input type="email" placeholder="Your email" className="ui-input" />
          </div>
          <button className="btn-primary mt-2 w-full">Join updates</button>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-7xl border-t border-emerald-200/30 pt-6 text-center text-xs text-emerald-100/90">
        © {new Date().getFullYear()} Prakriti.AI · Designed for global-scale civic operations.
      </div>
    </footer>
  );
};

export default Footer;
