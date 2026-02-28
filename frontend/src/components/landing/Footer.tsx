import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/logo.png";

import { subscribeNewsletter } from "../../lib/api";
import { useToast } from "../ui/Toast";

export function Footer() {
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await subscribeNewsletter({ email });
      setEmail("");
      push("success", "Subscribed successfully.");
    } catch {
      push("error", "Subscription failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="border-t border-emerald-200/20 bg-gradient-to-r from-[#0f2331] via-[#133942] to-[#1d4e47] pb-12 pt-12 text-emerald-50">
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
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-emerald-100/85">
            Enterprise-grade waste intelligence for cities, campuses, and commercial ecosystems.
          </p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">Navigate</h3>
          <ul className="mt-3 space-y-2 text-sm text-emerald-50">
            <li><Link to="/about" className="hover:text-white">About</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
            <li><Link to="/docs" className="hover:text-white">Docs</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">Pilot Updates</h3>
          <form onSubmit={onSubmit} className="mt-3 space-y-2">
            <input className="ui-input" type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <button className="btn-primary w-full" type="submit" disabled={loading}>{loading ? "Joining..." : "Join updates"}</button>
          </form>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-7xl border-t border-emerald-200/30 pt-4 text-center text-xs text-emerald-100/75">
        © {new Date().getFullYear()} Prakriti.AI · Designed for global-scale civic operations.
      </div>
    </footer>
  );
}
