import { useState } from "react";

import { submitLead } from "../../lib/api";
import type { LeadPayload } from "../../lib/types";
import { useToast } from "../ui/Toast";

export function FinalCtaForm() {
  const { push } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<LeadPayload>({
    name: "",
    org_name: "",
    org_type: "city",
    email: "",
    phone: "",
    message: "",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await submitLead(form);
      push("success", "Demo request submitted.");
      setForm({ name: "", org_name: "", org_type: "city", email: "", phone: "", message: "" });
    } catch {
      push("error", "Failed to submit demo request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="final-cta" className="mx-auto max-w-7xl px-4 pb-16">
      <div className="surface-card-strong grid gap-6 p-6 lg:grid-cols-[1fr_0.95fr] lg:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Deployment Ready</p>
          <h2 className="mt-2 text-4xl font-bold text-slate-900">Bring Prakriti.AI to your ward, campus, or city in weeks.</h2>
          <p className="mt-3 text-sm text-slate-600">Share your scope and team goals; we will design an implementation plan around your workflow and compliance needs.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input className="ui-input" placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
          <input className="ui-input" placeholder="Organization" value={form.org_name} onChange={(e) => setForm((p) => ({ ...p, org_name: e.target.value }))} required />
          <select className="ui-input" value={form.org_type} onChange={(e) => setForm((p) => ({ ...p, org_type: e.target.value as LeadPayload["org_type"] }))}>
            <option value="city">City</option>
            <option value="campus">Campus</option>
            <option value="society">Society</option>
            <option value="corporate">Corporate</option>
          </select>
          <input className="ui-input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
          <input className="ui-input" placeholder="Phone (optional)" value={form.phone || ""} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          <textarea className="ui-input min-h-24" placeholder="Message" value={form.message || ""} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} />
          <button disabled={loading} className="btn-primary w-full" type="submit">{loading ? "Submitting..." : "Request Demo"}</button>
        </form>
      </div>
    </section>
  );
}
