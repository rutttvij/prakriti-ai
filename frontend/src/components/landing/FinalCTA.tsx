import { useState } from "react";

import { submitPublicContact } from "../../lib/api";
import type { ContactPayload } from "../../lib/types";
import { Button } from "../ui/Button";
import { CardStrong } from "../ui/Card";
import { Input } from "../ui/Input";
import { useToast } from "../ui/Toast";

export function FinalCTA() {
  const { push } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ContactPayload>({ name: "", email: "", subject: "", message: "" });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await submitPublicContact(form);
      setForm({ name: "", email: "", subject: "", message: "" });
      push("success", "Message sent. Team will contact you soon.");
    } catch {
      push("error", "Unable to submit message. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 pb-14">
      <CardStrong className="p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Deployment Ready</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">Bring Prakriti.AI to your ward, campus, or city in weeks.</h2>
            <p className="mt-3 text-sm text-slate-600">Share your scope and we will map pilot workflow, SLA setup, and impact instrumentation.</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-3">
            <Input placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            <Input placeholder="Work email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
            <Input placeholder="Subject" value={form.subject || ""} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} />
            <textarea
              className="ui-input min-h-24"
              placeholder="Tell us about your city/campus goals"
              value={form.message}
              onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Submitting..." : "Request Demo"}</Button>
          </form>
        </div>
      </CardStrong>
    </section>
  );
}
