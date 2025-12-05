export const AboutPage: React.FC = () => {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-800 mb-3">About Prakriti.AI</h1>
      <p className="text-sm text-slate-600 mb-4">
        Prakriti.AI is a clean-city intelligence platform that connects citizens,
        waste workers, bulk generators, and city administrators on a single
        dashboard.
      </p>

      <h2 className="text-lg font-semibold text-slate-800 mt-6 mb-2">
        What we solve
      </h2>
      <ul className="list-disc list-inside text-sm text-slate-600 space-y-1.5">
        <li>Scattered waste complaints with no feedback loop.</li>
        <li>No visibility into segregation quality at household level.</li>
        <li>Limited recognition for honest waste workers and compliant societies.</li>
      </ul>

      <h2 className="text-lg font-semibold text-slate-800 mt-6 mb-2">
        How it works
      </h2>
      <p className="text-sm text-slate-600 mb-2">
        Using simple mobile-friendly interfaces, Prakriti.AI converts daily
        waste operations into structured data. This data feeds a carbon engine
        and badge system, enabling cities to track climate impact and reward
        behaviour change.
      </p>
    </main>
  );
};
