import { useMemo, useState } from "react";

const factors: Record<string, number> = {
  plastic: 2.5,
  paper: 1.8,
  glass: 0.6,
  metal: 4.0,
  organic: 1.2,
  ewaste: 3.5,
};

export function PccCalculator() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("plastic");
  const [weight, setWeight] = useState("25");
  const [quality, setQuality] = useState("1.0");

  const result = useMemo(() => {
    const w = Number(weight) || 0;
    const q = Number(quality) || 1;
    const carbon = w * (factors[category] || 1);
    return {
      carbon,
      pcc: carbon * q,
    };
  }, [weight, category, quality]);

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white/85 p-4">
      <button onClick={() => setOpen((v) => !v)} className="text-sm font-semibold text-emerald-700">
        {open ? "Hide PCC calculator" : "Open PCC calculator"}
      </button>
      {open ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <select className="ui-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {Object.keys(factors).map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <input className="ui-input" type="number" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Weight kg" />
          <input className="ui-input" type="number" step="0.01" min="0" max="1.2" value={quality} onChange={(e) => setQuality(e.target.value)} placeholder="Quality" />

          <div className="sm:col-span-3 grid gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm sm:grid-cols-2">
            <p className="text-slate-700">Carbon saved: <span className="font-bold text-slate-900">{result.carbon.toFixed(2)} kgCO2e</span></p>
            <p className="text-slate-700">Estimated PCC: <span className="font-bold text-emerald-700">{result.pcc.toFixed(2)}</span></p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
