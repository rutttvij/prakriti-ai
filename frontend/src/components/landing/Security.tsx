import { Card } from "../ui/Card";

export function Security() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-14">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <h3 className="text-lg font-bold text-slate-900">Audit Trail</h3>
          <p className="mt-2 text-sm text-slate-600">Every update is traceable with timestamps, actor identity, and record provenance.</p>
        </Card>
        <Card className="p-5">
          <h3 className="text-lg font-bold text-slate-900">Evidence Linked</h3>
          <p className="mt-2 text-sm text-slate-600">Photo and verification evidence can be mapped directly to closure and carbon credits.</p>
        </Card>
        <Card className="p-5">
          <h3 className="text-lg font-bold text-slate-900">SLA Visibility</h3>
          <p className="mt-2 text-sm text-slate-600">Operational performance is visible in near real-time with backlog and resolution metrics.</p>
        </Card>
      </div>
    </section>
  );
}
