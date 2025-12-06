import { Link } from "react-router-dom";

const CtaStrip: React.FC = () => {
  return (
    <section
      className="
        w-full
        bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900
        text-emerald-50
      "
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5 sm:py-6">
        <div
          className="
            flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between
            rounded-3xl
            border border-emerald-300/40
            bg-white/5
            px-5 sm:px-7 py-4
            shadow-lg shadow-emerald-900/40
            backdrop-blur-xl
          "
        >
          {/* Text */}
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.16em] uppercase text-emerald-100/90">
              Start a pilot with Prakriti.AI
            </p>
            <h2 className="mt-1 text-sm sm:text-base font-medium text-emerald-50 leading-relaxed">
              Turn waste data into climate action. Launch a ward, campus or
              society pilot and watch your segregation &amp; PCC numbers rise
              month after month.
            </h2>
          </div>

          {/* CTA button(s) */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              to="/register"
              className="
                inline-flex items-center justify-center
                rounded-full
                bg-emerald-400
                px-5 sm:px-6 py-2
                text-xs sm:text-sm font-semibold text-emerald-950
                shadow-sm shadow-emerald-300/80
                hover:bg-emerald-300
                transition
              "
            >
              Get started – Register
            </Link>

            <Link
              to="/contact"
              className="
                inline-flex items-center justify-center
                rounded-full
                border border-emerald-200/70
                bg-transparent
                px-4 sm:px-5 py-2
                text-xs sm:text-sm font-semibold text-emerald-50
                hover:bg-emerald-50/10
                transition
              "
            >
              Talk to the team
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CtaStrip;
