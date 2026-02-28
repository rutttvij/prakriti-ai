import type { LedgerRow } from "../../lib/types";
import { CardStrong } from "../ui/Card";

export function ImpactPCC({ rows }: { rows: LedgerRow[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16">
      <CardStrong className="p-6 sm:p-8">
        <h2 className="section-heading">Impact + PCC</h2>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white/85 p-4">
              <h3 className="font-semibold text-slate-900">Verified weight only</h3>
              <p className="mt-1 text-sm text-slate-600">Credits unlock only after on-ground verification is completed.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/85 p-4">
              <h3 className="font-semibold text-slate-900">Emission factor by category</h3>
              <p className="mt-1 text-sm text-slate-600">Carbon saved is computed per category and quality score.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/85 p-4">
              <h3 className="font-semibold text-slate-900">Audit trail by design</h3>
              <p className="mt-1 text-sm text-slate-600">Evidence-linked ledger entries keep reporting transparent.</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50 text-left text-xs uppercase tracking-[0.12em] text-slate-600">
                <tr>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Weight</th>
                  <th className="px-3 py-2">CO2e</th>
                  <th className="px-3 py-2">PCC</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((r, idx) => (
                  <tr key={`${r.timestamp}-${idx}`} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-800">{r.category}</td>
                    <td className="px-3 py-2 text-slate-600">{Number(r.verified_weight).toFixed(2)} kg</td>
                    <td className="px-3 py-2 text-slate-600">{Number(r.carbon_saved_kgco2e).toFixed(2)}</td>
                    <td className="px-3 py-2 font-semibold text-emerald-700">{Number(r.pcc_awarded).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardStrong>
    </section>
  );
}
