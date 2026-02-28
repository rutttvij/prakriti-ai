import { useState } from "react";

export function Accordion({ items }: { items: { id: number | string; question: string; answer: string }[] }) {
  const [openId, setOpenId] = useState<number | string | null>(items[0]?.id ?? null);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <div key={item.id} className="surface-card p-4">
            <button
              className="flex w-full items-center justify-between text-left"
              onClick={() => setOpenId(open ? null : item.id)}
            >
              <span className="text-base font-semibold text-slate-900">{item.question}</span>
              <span className="text-xl leading-none text-slate-500">{open ? "−" : "+"}</span>
            </button>
            {open && <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.answer}</p>}
          </div>
        );
      })}
    </div>
  );
}
