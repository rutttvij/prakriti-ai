import { useEffect, useMemo, useState } from "react";

import { Dialog } from "../../ui/Dialog";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import type { CaseStudy, FAQItem, Partner, Testimonial } from "../../../lib/types";
import type { ContentTabType } from "../../../lib/types";

type ContentRow = Partner | Testimonial | CaseStudy | FAQItem;

type Props = {
  open: boolean;
  mode: "create" | "edit";
  type: ContentTabType;
  initialValues: ContentRow | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
};

function parseMetric(value?: string | null): { label: string; value: string } {
  if (!value) return { label: "", value: "" };
  const split = value.split(":");
  if (split.length < 2) return { label: "", value: value };
  return { label: split[0].trim(), value: split.slice(1).join(":").trim() };
}

function formatMetric(label: string, value: string): string | undefined {
  const l = label.trim();
  const v = value.trim();
  if (!l && !v) return undefined;
  if (!l) return v;
  if (!v) return l;
  return `${l}: ${v}`;
}

export default function ContentItemDialog({
  open,
  mode,
  type,
  initialValues,
  loading = false,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<Record<string, string | number | boolean>>({});

  useEffect(() => {
    const base = initialValues || null;

    if (type === "partners") {
      const row = base as Partner | null;
      setForm({
        name: row?.name || "",
        logo_url: row?.logo_url || "",
        href: row?.href || "",
        active: row?.active ?? true,
        order: row?.order ?? 0,
      });
      return;
    }

    if (type === "testimonials") {
      const row = base as Testimonial | null;
      setForm({
        name: row?.name || "",
        title: row?.title || "",
        org: row?.org || "",
        quote: row?.quote || "",
        active: row?.active ?? true,
        order: row?.order ?? 0,
      });
      return;
    }

    if (type === "case-studies") {
      const row = base as CaseStudy | null;
      const m1 = parseMetric(row?.metric_1);
      const m2 = parseMetric(row?.metric_2);
      setForm({
        title: row?.title || "",
        org: row?.org || "",
        summary: row?.summary || "",
        href: row?.href || "",
        metric_1_label: m1.label,
        metric_1_value: m1.value,
        metric_2_label: m2.label,
        metric_2_value: m2.value,
        active: row?.active ?? true,
        order: row?.order ?? 0,
      });
      return;
    }

    const row = base as FAQItem | null;
    setForm({
      question: row?.question || "",
      answer: row?.answer || "",
      active: row?.active ?? true,
      order: row?.order ?? 0,
    });
  }, [initialValues, open, type]);

  const title = useMemo(() => {
    const noun =
      type === "partners"
        ? "Partner"
        : type === "testimonials"
        ? "Testimonial"
        : type === "case-studies"
        ? "Case Study"
        : "FAQ";
    return `${mode === "create" ? "Add" : "Edit"} ${noun}`;
  }, [mode, type]);

  const setValue = (key: string, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    if (type === "partners") return String(form.name || "").trim().length > 0;
    if (type === "testimonials") return String(form.name || "").trim().length > 0 && String(form.quote || "").trim().length > 0;
    if (type === "case-studies") return String(form.title || "").trim().length > 0 && String(form.summary || "").trim().length > 0;
    return String(form.question || "").trim().length > 0 && String(form.answer || "").trim().length > 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    if (type === "case-studies") {
      await onSubmit({
        title: String(form.title || "").trim(),
        org: String(form.org || "").trim() || "Organization",
        summary: String(form.summary || "").trim(),
        href: String(form.href || "").trim() || null,
        metric_1: formatMetric(String(form.metric_1_label || ""), String(form.metric_1_value || "")) || null,
        metric_2: formatMetric(String(form.metric_2_label || ""), String(form.metric_2_value || "")) || null,
        active: Boolean(form.active),
        order: Number(form.order || 0),
      });
      return;
    }

    await onSubmit({
      ...form,
      active: Boolean(form.active),
      order: Number(form.order || 0),
      name: form.name !== undefined ? String(form.name).trim() : undefined,
      question: form.question !== undefined ? String(form.question).trim() : undefined,
      answer: form.answer !== undefined ? String(form.answer).trim() : undefined,
      quote: form.quote !== undefined ? String(form.quote).trim() : undefined,
      title: form.title !== undefined ? String(form.title).trim() : undefined,
      org: form.org !== undefined ? String(form.org).trim() : undefined,
      href: form.href !== undefined ? String(form.href).trim() || null : undefined,
      logo_url: form.logo_url !== undefined ? String(form.logo_url).trim() || null : undefined,
      avatar_url: form.avatar_url !== undefined ? String(form.avatar_url).trim() || null : undefined,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="grid gap-3">
        {type === "partners" && (
          <>
            <Input placeholder="Name" value={String(form.name || "")} onChange={(e) => setValue("name", e.target.value)} />
            <Input placeholder="Logo URL" value={String(form.logo_url || "")} onChange={(e) => setValue("logo_url", e.target.value)} />
            <Input placeholder="Link" value={String(form.href || "")} onChange={(e) => setValue("href", e.target.value)} />
          </>
        )}

        {type === "testimonials" && (
          <>
            <Input placeholder="Name" value={String(form.name || "")} onChange={(e) => setValue("name", e.target.value)} />
            <Input placeholder="Role / Title" value={String(form.title || "")} onChange={(e) => setValue("title", e.target.value)} />
            <Input placeholder="Organization" value={String(form.org || "")} onChange={(e) => setValue("org", e.target.value)} />
            <textarea className="ui-input min-h-[120px]" placeholder="Quote" value={String(form.quote || "")} onChange={(e) => setValue("quote", e.target.value)} />
          </>
        )}

        {type === "case-studies" && (
          <>
            <Input placeholder="Title" value={String(form.title || "")} onChange={(e) => setValue("title", e.target.value)} />
            <Input placeholder="Organization" value={String(form.org || "")} onChange={(e) => setValue("org", e.target.value)} />
            <textarea className="ui-input min-h-[120px]" placeholder="Summary" value={String(form.summary || "")} onChange={(e) => setValue("summary", e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Metric 1 Label" value={String(form.metric_1_label || "")} onChange={(e) => setValue("metric_1_label", e.target.value)} />
              <Input placeholder="Metric 1 Value" value={String(form.metric_1_value || "")} onChange={(e) => setValue("metric_1_value", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Metric 2 Label" value={String(form.metric_2_label || "")} onChange={(e) => setValue("metric_2_label", e.target.value)} />
              <Input placeholder="Metric 2 Value" value={String(form.metric_2_value || "")} onChange={(e) => setValue("metric_2_value", e.target.value)} />
            </div>
            <Input placeholder="Link" value={String(form.href || "")} onChange={(e) => setValue("href", e.target.value)} />
          </>
        )}

        {type === "faqs" && (
          <>
            <Input placeholder="Question" value={String(form.question || "")} onChange={(e) => setValue("question", e.target.value)} />
            <textarea className="ui-input min-h-[140px]" placeholder="Answer" value={String(form.answer || "")} onChange={(e) => setValue("answer", e.target.value)} />
          </>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Order"
            value={String(form.order ?? 0)}
            onChange={(e) => setValue("order", Number(e.target.value || 0))}
          />
          <label className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-white/60 px-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(form.active)}
              onChange={(e) => setValue("active", e.target.checked)}
              className="h-4 w-4"
            />
            Active
          </label>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !validate()}>{loading ? "Saving..." : mode === "create" ? "Create" : "Save changes"}</Button>
        </div>
      </div>
    </Dialog>
  );
}
