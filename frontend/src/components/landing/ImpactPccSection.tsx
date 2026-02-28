import type { LedgerRow } from "../../lib/types";
import { PccCalculator } from "./PccCalculator";

export function ImpactPccSection({ rows }: { rows: LedgerRow[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16">
      <div className="surface-card-strong grid gap-6 p-6 lg:grid-cols-[1fr_1.1fr] lg:p-8">
        <div>
          <h2 className="section-heading">Impact + PCC</h2>
          <p className="mt-2 text-sm text-slate-600">Verified waste turns into measurable climate credits through transparent formulas and evidence.</p>

          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
              <p className="font-semibold text-slate-900">Verified weight</p>
              <p className="text-sm text-slate-600">Only verified logs are eligible for carbon and PCC calculations.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
              <p className="font-semibold text-slate-900">Emission factors</p>
              <p className="text-sm text-slate-600">Category-specific factors convert kg of waste into avoided CO2e.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
              <p className="font-semibold text-slate-900">Audit trail</p>
              <p className="text-sm text-slate-600">Every verification references evidence, actor, and timestamp for trust.</p>
            </div>
          </div>

          <PccCalculator />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/92 shadow-inner">
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
              {rows.slice(0, 6).map((r, idx) => (
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
    </section>
  );
}
