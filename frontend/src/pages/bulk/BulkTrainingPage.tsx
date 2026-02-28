const MODULES = [
  { title: "Segregation Fundamentals", duration: "18 min", status: "Completed" },
  { title: "Quality & Contamination Control", duration: "24 min", status: "In Progress" },
  { title: "Verification & Evidence Standards", duration: "16 min", status: "Locked" },
  { title: "Carbon & PCC Accounting", duration: "20 min", status: "Locked" },
];

export default function BulkTrainingPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Bulk Training</h1>
        <p className="mt-1 text-sm text-slate-600">Role-specific training modules for bulk teams and managers.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Modules Completed</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">1 / 4</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Current Progress</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">37%</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Badge Readiness</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">2 pending</p>
        </div>
      </div>

      <div className="surface-card-strong p-5">
        <h2 className="text-xl font-bold text-slate-900">Learning Modules</h2>
        <div className="mt-4 space-y-3">
          {MODULES.map((m) => (
            <div key={m.title} className="rounded-2xl border border-slate-200 bg-white/85 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">{m.title}</p>
                  <p className="text-xs text-slate-500">Duration: {m.duration}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    m.status === "Completed"
                      ? "bg-emerald-100 text-emerald-800"
                      : m.status === "In Progress"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {m.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
