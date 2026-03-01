import type { ReactNode } from "react";

export default function CitizenPageHero({
  title,
  subtitle,
  badge = "CITIZEN · PERSONAL CONSOLE",
  actions,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  actions?: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/20 bg-slate-950/26 p-5 shadow-[0_24px_50px_rgba(5,22,27,0.38)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/16 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-emerald-100">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {badge}
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight !text-[#dffaf0]">{title}</h1>
          <p className="mt-1 text-sm text-emerald-100">{subtitle}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}
