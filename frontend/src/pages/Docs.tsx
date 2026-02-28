import { Navbar } from "../components/Navbar";

export default function DocsPage() {
  return (
    <main className="public-shell landing-aurora">
      <Navbar />
      <section className="mx-auto max-w-5xl px-4 pb-16 pt-8">
        <div className="surface-card-strong p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Docs</p>
          <h1 className="mt-2 text-4xl font-bold text-slate-900">Prakriti.AI Documentation</h1>
          <p className="mt-3 text-slate-600">This docs shell is ready for PCC, verification, and API reference sections.</p>
        </div>
      </section>
    </main>
  );
}
