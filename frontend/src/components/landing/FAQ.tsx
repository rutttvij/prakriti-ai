import type { FAQItem } from "../../lib/types";
import { Accordion } from "../ui/Accordion";

export function FAQ({ faqs }: { faqs: FAQItem[] }) {
  if (!faqs.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-14">
      <h2 className="section-heading">Frequently asked questions</h2>
      <div className="mt-5">
        <Accordion items={faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer }))} />
      </div>
    </section>
  );
}
