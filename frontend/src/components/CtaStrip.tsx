import { Link } from "react-router-dom";

const CtaStrip: React.FC = () => {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-12">
      <div className="overflow-hidden rounded-[2rem] border border-emerald-100/25 bg-gradient-to-r from-[#1a3a30]/85 via-[#21483b]/80 to-[#224f3f]/82 px-6 py-8 text-emerald-50 shadow-[0_24px_46px_rgba(3,18,14,0.42)] backdrop-blur-2xl sm:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/80">Deployment Ready</p>
            <h2 className="mt-2 text-2xl font-bold">Bring Prakriti.AI to your ward, campus, or city in weeks.</h2>
            <p className="mt-2 text-sm text-emerald-50/75">
              We help your teams map workflows, onboard users, and launch measurable cleanliness + carbon outcomes with zero guesswork.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/contact" className="btn-primary px-6 py-2.5 text-sm">
              Schedule Strategy Call
            </Link>
            <Link to="/register" className="btn-secondary px-6 py-2.5 text-sm">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CtaStrip;
