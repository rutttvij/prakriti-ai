import type { Partner } from "../../lib/types";

export function ProofStrip({ partners }: { partners: Partner[] }) {
  if (!partners.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-10">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Trusted by city and institutional teams</p>
      <div className="surface-card flex flex-wrap items-center gap-3 p-4 sm:gap-4">
        {partners.map((p) => (
          <a
            key={p.id}
            href={p.href || "#"}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-emerald-100/70 bg-white/75 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            {p.name}
          </a>
        ))}
      </div>
    </section>
  );
}
