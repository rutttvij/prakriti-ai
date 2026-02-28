import type { FAQItem } from "../../lib/types";
import { Accordion } from "../ui/Accordion";

export function FaqSection({ faqs }: { faqs: FAQItem[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16">
      <div className="surface-card-strong p-6 sm:p-8">
        <h2 className="section-heading">Frequently asked questions</h2>
        <div className="mt-6">
          <Accordion items={faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer }))} />
        </div>
      </div>
    </section>
  );
}
