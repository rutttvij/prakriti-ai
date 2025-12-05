export const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-emerald-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-slate-500 sm:flex-row">
        <p>
          © {year}{" "}
          <span className="font-semibold text-emerald-600">Prakriti.AI</span> •
          Clean City • Smart Waste
        </p>
        <div className="flex gap-4">
          <button className="hover:text-emerald-600">Privacy</button>
          <button className="hover:text-emerald-600">Terms</button>
        </div>
      </div>
    </footer>
  );
};
