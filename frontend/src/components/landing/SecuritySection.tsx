export function SecuritySection() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_0.9fr]">
        <article className="surface-card p-5">
          <h3 className="text-xl font-bold text-slate-900">Audit Trail</h3>
          <p className="mt-2 text-sm text-slate-600">Every action carries actor identity, timestamp, and immutable linkage to records.</p>
        </article>
        <article className="surface-card p-5">
          <h3 className="text-xl font-bold text-slate-900">Evidence Linked</h3>
          <p className="mt-2 text-sm text-slate-600">Verification photos and contextual data remain attached to every closure event.</p>
        </article>
        <article className="surface-card p-5">
          <h3 className="text-xl font-bold text-slate-900">SLA Visibility</h3>
          <p className="mt-2 text-sm text-slate-600">Track aging and resolution quality with transparent operational timelines.</p>
        </article>
        <aside className="surface-card-strong p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Audit timeline</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <div className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2">Log captured</div>
            <div className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2">Pickup assigned</div>
            <div className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2">Weight verified</div>
            <div className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2">PCC credited</div>
          </div>
        </aside>
      </div>
    </section>
  );
}
