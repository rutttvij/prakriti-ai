// src/components/Footer.tsx

import { Link } from "react-router-dom";

export const Footer: React.FC = () => {
  return (
    <footer
      className="
        mt-0
        w-full 
        bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900
        text-white/90
        pt-14 pb-10
      "
    >
      {/* CONTENT WRAPPER */}
      <div className="mx-auto max-w-7xl px-6">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

          {/* -------- Left Section -------- */}
          <div>
            <h2 className="text-xl font-semibold text-white">Prakriti.AI</h2>
            <p className="mt-3 text-sm text-emerald-100 leading-relaxed max-w-sm">
              AI-powered waste intelligence helping cities stay cleaner, greener,
              and more efficient every day.
            </p>
          </div>

          {/* -------- Center Links -------- */}
          <div>
            <h3 className="text-sm font-semibold text-white/90">Quick Links</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  to="/about"
                  className="text-emerald-100 hover:text-white transition"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-emerald-100 hover:text-white transition"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  className="text-emerald-100 hover:text-white transition"
                >
                  Register
                </Link>
              </li>
            </ul>
          </div>

          {/* -------- Right Newsletter -------- */}
          <div>
            <h3 className="text-sm font-semibold text-white/90">Stay Updated</h3>
            <p className="mt-3 text-sm text-emerald-100">
              Get updates about new features &amp; deployments.
            </p>

            <div className="mt-4 flex items-center rounded-xl overflow-hidden bg-white/10 backdrop-blur-md border border-white/20">
              <input
                type="email"
                placeholder="Your email"
                className="
                  flex-1 bg-transparent text-white placeholder-white/60
                  px-4 py-2 text-sm focus:outline-none
                "
              />
              <button
                className="
                  px-5 py-2 bg-white/20 hover:bg-white/30 
                  text-white text-sm font-medium transition
                "
              >
                Join
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-10 border-t border-white/10 pt-6 text-center">
          <p className="text-xs text-emerald-100">
            © {new Date().getFullYear()} Prakriti.AI — Clean City. Smart Waste.
          </p>
        </div>
      </div>

    </footer>
  );
};

export default Footer;
